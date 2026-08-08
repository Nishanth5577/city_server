const BIMCostEstimation = require('../../models/bim/CostEstimation');
const BIMWall = require('../../models/bim/Wall');
const BIMColumn = require('../../models/bim/Column');
const BIMBeam = require('../../models/bim/Beam');
const BIMDoor = require('../../models/bim/Door');
const BIMWindow = require('../../models/bim/Window');
const BIMStair = require('../../models/bim/Stair');
const BIMFloor = require('../../models/bim/Floor');
const BIMBuildingMaterial = require('../../models/bim/BuildingMaterial');

// @desc    Get cost estimations for project
// @route   GET /api/bim/cost-estimation?bim_project_id=xxx
exports.getCostEstimations = async (req, res, next) => {
  try {
    const { bim_project_id } = req.query;
    const estimations = await BIMCostEstimation.find({ bim_project_id })
      .populate('created_by', 'name email')
      .sort({ version: -1 });
    res.json(estimations);
  } catch (err) { next(err); }
};

// @desc    Get single cost estimation
// @route   GET /api/bim/cost-estimation/:id
exports.getCostEstimation = async (req, res, next) => {
  try {
    const estimation = await BIMCostEstimation.findById(req.params.id)
      .populate('created_by', 'name email');
    if (!estimation) return res.status(404).json({ message: 'Cost estimation not found' });
    res.json(estimation);
  } catch (err) { next(err); }
};

// @desc    Auto-generate BOQ from design
// @route   POST /api/bim/cost-estimation/generate
exports.generateBOQ = async (req, res, next) => {
  try {
    const { company_id, userId } = req.user;
    const { bim_project_id } = req.body;

    // Fetch all elements
    const floors = await BIMFloor.find({ bim_project_id });
    const floorIds = floors.map(f => f._id);

    const [walls, columns, beams, doors, windows, stairs] = await Promise.all([
      BIMWall.find({ floor_id: { $in: floorIds } }),
      BIMColumn.find({ floor_id: { $in: floorIds } }),
      BIMBeam.find({ floor_id: { $in: floorIds } }),
      BIMDoor.find({ floor_id: { $in: floorIds } }),
      BIMWindow.find({ floor_id: { $in: floorIds } }),
      BIMStair.find({ floor_id: { $in: floorIds } }),
    ]);

    // Fetch material rates
    const materials = await BIMBuildingMaterial.find({ $or: [{ company_id }, { is_default: true }] });
    const rateMap = {};
    materials.forEach(m => { rateMap[m.name] = m.cost_per_unit; });

    const boqItems = [];
    let materialCost = 0, labourCost = 0, structuralCost = 0;

    // Calculate wall costs
    walls.forEach(wall => {
      const dx = wall.end_point.x - wall.start_point.x;
      const dy = wall.end_point.y - wall.start_point.y;
      const length = Math.sqrt(dx * dx + dy * dy) / 1000; // mm to m
      const height = (wall.height || 3000) / 1000;
      const thickness = (wall.thickness || 230) / 1000;
      const area = length * height;
      const volume = area * thickness;

      // Brickwork
      const brickCount = Math.ceil(volume * 500); // ~500 bricks per cum
      const brickCost = brickCount * (rateMap['Red Clay Brick'] || 8);
      boqItems.push({ category: 'material', item_name: `Brickwork - Wall`, description: `${length.toFixed(1)}m x ${height.toFixed(1)}m x ${thickness.toFixed(3)}m`, unit: 'nos', quantity: brickCount, rate: rateMap['Red Clay Brick'] || 8, amount: brickCost, element_type: 'wall', element_id: wall._id });
      materialCost += brickCost;

      // Cement for brickwork
      const cementBags = Math.ceil(volume * 1.5 * 7); // ~7 bags per cum mortar
      const cementCost = cementBags * (rateMap['OPC Cement 53 Grade'] || 380);
      boqItems.push({ category: 'material', item_name: 'Cement for Brickwork', unit: 'bag', quantity: cementBags, rate: rateMap['OPC Cement 53 Grade'] || 380, amount: cementCost, element_type: 'wall', element_id: wall._id });
      materialCost += cementCost;

      // Plastering
      const plasterArea = area * 2; // Both sides
      const plasterCost = plasterArea * 10.764 * (rateMap['Cement Plaster'] || 18);
      boqItems.push({ category: 'finishing', item_name: 'Cement Plastering', unit: 'sqft', quantity: Math.ceil(plasterArea * 10.764), rate: rateMap['Cement Plaster'] || 18, amount: plasterCost, element_type: 'wall', element_id: wall._id });
      materialCost += plasterCost;

      // Labour for brickwork
      const labCost = volume * 800; // ₹800 per cum labour
      boqItems.push({ category: 'labour', item_name: 'Mason Labour - Brickwork', unit: 'cum', quantity: parseFloat(volume.toFixed(2)), rate: 800, amount: labCost, element_type: 'wall', element_id: wall._id });
      labourCost += labCost;
    });

    // Calculate column costs
    columns.forEach(col => {
      const w = (col.width || 300) / 1000;
      const d = (col.depth || 300) / 1000;
      const h = (col.height || 3000) / 1000;
      const volume = col.shape === 'circular' ? Math.PI * Math.pow((col.diameter || 300) / 2000, 2) * h : w * d * h;
      const concreteCost = volume * (rateMap['M25 Concrete'] || 6000);
      const steelKg = volume * 7850 * 0.02; // ~2% steel
      const steelCost = steelKg * (rateMap['Fe500 TMT Steel'] || 65);

      boqItems.push({ category: 'structural', item_name: `RCC Column ${(w * 1000).toFixed(0)}x${(d * 1000).toFixed(0)}mm`, unit: 'cum', quantity: parseFloat(volume.toFixed(3)), rate: rateMap['M25 Concrete'] || 6000, amount: concreteCost, element_type: 'column', element_id: col._id });
      boqItems.push({ category: 'structural', item_name: 'Steel Reinforcement - Column', unit: 'kg', quantity: parseFloat(steelKg.toFixed(1)), rate: rateMap['Fe500 TMT Steel'] || 65, amount: steelCost, element_type: 'column', element_id: col._id });
      structuralCost += concreteCost + steelCost;
    });

    // Calculate beam costs
    beams.forEach(beam => {
      const dx = beam.end_point.x - beam.start_point.x;
      const dy = beam.end_point.y - beam.start_point.y;
      const length = Math.sqrt(dx * dx + dy * dy) / 1000;
      const w = (beam.width || 230) / 1000;
      const d = (beam.depth || 450) / 1000;
      const volume = length * w * d;
      const concreteCost = volume * (rateMap['M25 Concrete'] || 6000);
      const steelKg = volume * 7850 * 0.025;
      const steelCost = steelKg * (rateMap['Fe500 TMT Steel'] || 65);

      boqItems.push({ category: 'structural', item_name: `RCC Beam ${(w * 1000).toFixed(0)}x${(d * 1000).toFixed(0)}mm`, unit: 'cum', quantity: parseFloat(volume.toFixed(3)), rate: rateMap['M25 Concrete'] || 6000, amount: concreteCost, element_type: 'beam', element_id: beam._id });
      boqItems.push({ category: 'structural', item_name: 'Steel Reinforcement - Beam', unit: 'kg', quantity: parseFloat(steelKg.toFixed(1)), rate: rateMap['Fe500 TMT Steel'] || 65, amount: steelCost, element_type: 'beam', element_id: beam._id });
      structuralCost += concreteCost + steelCost;
    });

    // Door costs
    let interiorCost = 0;
    doors.forEach(door => {
      const cost = door.bim?.cost || (door.door_type === 'single' ? 8000 : 15000);
      boqItems.push({ category: 'interior', item_name: `${door.door_type} Door ${door.width}x${door.height}mm`, unit: 'nos', quantity: 1, rate: cost, amount: cost, element_type: 'door', element_id: door._id });
      interiorCost += cost;
    });

    // Window costs
    windows.forEach(win => {
      const area = ((win.width || 1200) * (win.height || 1200)) / 1e6;
      const cost = win.bim?.cost || (area * 8000);
      boqItems.push({ category: 'interior', item_name: `${win.window_type} Window ${win.width}x${win.height}mm`, unit: 'nos', quantity: 1, rate: cost, amount: cost, element_type: 'window', element_id: win._id });
      interiorCost += cost;
    });

    // Slab costs (per floor)
    let slabCost = 0;
    floors.forEach(floor => {
      if (floor.total_area > 0) {
        const areaSqm = floor.total_area;
        const thickness = (floor.slab_thickness || 150) / 1000;
        const volume = areaSqm * thickness;
        const concreteCost = volume * (rateMap['M25 Concrete'] || 6000);
        const steelKg = volume * 7850 * 0.015;
        const steelCost = steelKg * (rateMap['Fe500 TMT Steel'] || 65);
        boqItems.push({ category: 'structural', item_name: `RCC Slab - ${floor.floor_name}`, unit: 'cum', quantity: parseFloat(volume.toFixed(3)), rate: 6000, amount: concreteCost, element_type: 'slab' });
        boqItems.push({ category: 'structural', item_name: `Steel - Slab ${floor.floor_name}`, unit: 'kg', quantity: parseFloat(steelKg.toFixed(1)), rate: 65, amount: steelCost, element_type: 'slab' });
        slabCost += concreteCost + steelCost;
      }
    });
    structuralCost += slabCost;

    // Calculate totals
    const electricalCost = materialCost * 0.08;
    const plumbingCost = materialCost * 0.06;
    const exteriorCost = materialCost * 0.05;
    const overheadCost = (materialCost + labourCost + structuralCost) * 0.1;
    const contingencyCost = (materialCost + labourCost + structuralCost) * 0.05;
    const subtotal = materialCost + labourCost + structuralCost + interiorCost + electricalCost + plumbingCost + exteriorCost + overheadCost + contingencyCost;
    const gstAmount = subtotal * 0.18;
    const totalCost = subtotal + gstAmount;

    const totalAreaSqft = floors.reduce((sum, f) => sum + (f.total_area || 0) * 10.764, 0);

    const estimation = await BIMCostEstimation.create({
      bim_project_id,
      company_id,
      created_by: userId,
      boq_items: boqItems,
      summary: {
        material_cost: Math.round(materialCost),
        labour_cost: Math.round(labourCost),
        structural_cost: Math.round(structuralCost),
        interior_cost: Math.round(interiorCost),
        electrical_cost: Math.round(electricalCost),
        plumbing_cost: Math.round(plumbingCost),
        exterior_cost: Math.round(exteriorCost),
        overhead_cost: Math.round(overheadCost),
        contingency_cost: Math.round(contingencyCost),
        subtotal: Math.round(subtotal),
        gst_percent: 18,
        gst_amount: Math.round(gstAmount),
        total_cost: Math.round(totalCost),
      },
      cost_per_sqft: totalAreaSqft > 0 ? Math.round(totalCost / totalAreaSqft) : 0,
      total_area_sqft: Math.round(totalAreaSqft),
    });

    res.status(201).json(estimation);
  } catch (err) { next(err); }
};

// @desc    Update cost estimation
// @route   PUT /api/bim/cost-estimation/:id
exports.updateCostEstimation = async (req, res, next) => {
  try {
    const estimation = await BIMCostEstimation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!estimation) return res.status(404).json({ message: 'Cost estimation not found' });
    res.json(estimation);
  } catch (err) { next(err); }
};

// @desc    Delete cost estimation
// @route   DELETE /api/bim/cost-estimation/:id
exports.deleteCostEstimation = async (req, res, next) => {
  try {
    await BIMCostEstimation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Cost estimation deleted' });
  } catch (err) { next(err); }
};
