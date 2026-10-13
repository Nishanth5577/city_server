const prisma = require('../../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

// GET /api/bim/cost-estimation?bim_project_id=xxx
exports.getEstimations = async (req, res, next) => {
  try {
    const { bim_project_id } = req.query;
    const where = {};
    if (bim_project_id) where.bim_project_id = bim_project_id;
    const estimations = await prisma.costEstimation.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(estimations.map(addId));
  } catch (err) { next(err); }
};

// GET /api/bim/cost-estimation/:id
exports.getEstimation = async (req, res, next) => {
  try {
    const est = await prisma.costEstimation.findUnique({ where: { id: req.params.id } });
    if (!est) return res.status(404).json({ message: 'Cost estimation not found' });
    res.json(addId(est));
  } catch (err) { next(err); }
};

// POST /api/bim/cost-estimation
exports.createEstimation = async (req, res, next) => {
  try {
    const { bim_project_id, name, description, items } = req.body;
    // Calculate total from items
    const itemsArr = Array.isArray(items) ? items : [];
    const total_cost = itemsArr.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_cost || 0), 0);
    const est = await prisma.costEstimation.create({
      data: { bim_project_id, name: name || 'Untitled Estimation', description: description || '', items: itemsArr, total_cost, created_by: req.user.userId },
    });
    res.status(201).json(addId(est));
  } catch (err) { next(err); }
};

// PUT /api/bim/cost-estimation/:id
exports.updateEstimation = async (req, res, next) => {
  try {
    const { _id, items, ...data } = req.body;
    if (items) {
      data.items = Array.isArray(items) ? items : [];
      data.total_cost = data.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_cost || 0), 0);
    }
    const est = await prisma.costEstimation.update({ where: { id: req.params.id }, data });
    res.json(addId(est));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Cost estimation not found' });
    next(err);
  }
};

// DELETE /api/bim/cost-estimation/:id
exports.deleteEstimation = async (req, res, next) => {
  try {
    await prisma.costEstimation.delete({ where: { id: req.params.id } });
    res.json({ message: 'Cost estimation deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Cost estimation not found' });
    next(err);
  }
};

// POST /api/bim/cost-estimation/generate - Generate BOQ from BIM project
exports.generateBOQ = async (req, res, next) => {
  try {
    const { bim_project_id, building_data } = req.body;
    if (!building_data) return res.json({ items: [], total_cost: 0, message: 'No building data provided' });

    const items = [];
    const floors = building_data.floors || [];
    const walls = building_data.walls || [];
    const doors = building_data.doors || [];
    const windows = building_data.windows || [];
    const slabs = building_data.slabs || [];
    const stairs = building_data.stairs || [];
    const roofs = building_data.roofs || [];

    // Calculate wall quantities
    if (walls.length > 0) {
      const totalWallArea = walls.reduce((sum, w) => sum + (w.length || 3) * (w.height || 3) * (w.thickness || 0.23), 0);
      items.push({ category: 'Masonry', description: 'Brick Wall Construction', unit: 'cum', quantity: Math.round(totalWallArea * 100) / 100, unit_cost: 5500, total: Math.round(totalWallArea * 5500) });
      items.push({ category: 'Plastering', description: 'Internal & External Plaster', unit: 'sqm', quantity: Math.round(totalWallArea / 0.23 * 2 * 100) / 100, unit_cost: 280, total: Math.round(totalWallArea / 0.23 * 2 * 280) });
    }

    // Calculate slab quantities
    if (slabs.length > 0 || floors.length > 0) {
      const slabCount = Math.max(slabs.length, floors.length, 1);
      const avgArea = 80; // sqm default
      items.push({ category: 'RCC', description: 'RCC Slab (M25 concrete)', unit: 'cum', quantity: Math.round(slabCount * avgArea * 0.15 * 100) / 100, unit_cost: 6200, total: Math.round(slabCount * avgArea * 0.15 * 6200) });
      items.push({ category: 'Steel', description: 'TMT Steel Reinforcement', unit: 'kg', quantity: Math.round(slabCount * avgArea * 0.15 * 100), unit_cost: 65, total: Math.round(slabCount * avgArea * 0.15 * 100 * 65) });
    }

    // Doors
    if (doors.length > 0) {
      items.push({ category: 'Joinery', description: 'Flush Doors with Frame', unit: 'nos', quantity: doors.length, unit_cost: 8500, total: doors.length * 8500 });
    }

    // Windows
    if (windows.length > 0) {
      items.push({ category: 'Joinery', description: 'Aluminium Sliding Windows', unit: 'nos', quantity: windows.length, unit_cost: 12000, total: windows.length * 12000 });
    }

    // Stairs
    if (stairs.length > 0) {
      items.push({ category: 'RCC', description: 'RCC Staircase', unit: 'nos', quantity: stairs.length, unit_cost: 45000, total: stairs.length * 45000 });
    }

    // Roofing
    if (roofs.length > 0) {
      items.push({ category: 'Roofing', description: 'RCC Roof Slab with Waterproofing', unit: 'sqm', quantity: 80, unit_cost: 2800, total: 80 * 2800 });
    }

    // Common items
    items.push({ category: 'Painting', description: 'Interior & Exterior Painting', unit: 'sqm', quantity: Math.max(walls.length * 25, 200), unit_cost: 45, total: Math.max(walls.length * 25, 200) * 45 });
    items.push({ category: 'Electrical', description: 'Electrical Wiring & Fittings', unit: 'point', quantity: Math.max(floors.length * 20, 30), unit_cost: 1500, total: Math.max(floors.length * 20, 30) * 1500 });
    items.push({ category: 'Plumbing', description: 'Plumbing & Sanitary Fittings', unit: 'point', quantity: Math.max(floors.length * 8, 12), unit_cost: 3500, total: Math.max(floors.length * 8, 12) * 3500 });

    const total_cost = items.reduce((sum, item) => sum + (item.total || 0), 0);

    res.json({ items, total_cost, summary: { walls: walls.length, doors: doors.length, windows: windows.length, floors: floors.length, slabs: slabs.length, stairs: stairs.length, roofs: roofs.length } });
  } catch (err) { next(err); }
};
