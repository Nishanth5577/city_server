const StructuralDesign = require('../../models/bim/StructuralDesign');
const BIMProject = require('../../models/bim/BIMProject');
const Building = require('../../models/bim/Building');
const Floor = require('../../models/bim/Floor');
const Column = require('../../models/bim/Column');
const Beam = require('../../models/bim/Beam');
const Wall = require('../../models/bim/Wall');

// @desc    Generate structural design from building geometry
// @route   POST /api/bim/structural/generate
exports.generateStructural = async (req, res) => {
  try {
    const { bim_project_id, building_id } = req.body;
    const building = await Building.findById(building_id);
    if (!building) return res.status(404).json({ message: 'Building not found' });

    const floors = await Floor.find({ building_id });
    const columns = await Column.find({ bim_project_id, floor_id: { $in: floors.map(f => f._id) } });
    const beams = await Beam.find({ bim_project_id, floor_id: { $in: floors.map(f => f._id) } });
    const walls = await Wall.find({ bim_project_id, floor_id: { $in: floors.map(f => f._id) } });

    // Calculate loads
    const numFloors = floors.length || 1;
    const floorHeight = building.floor_height || 3000;
    const slabThickness = 150;
    const buildingType = building.building_type || 'residential';

    const liveLoadMap = {
      residential: 2.0, commercial: 4.0, industrial: 5.0,
      mixed_use: 3.0, institutional: 3.0,
    };
    const liveLoad = liveLoadMap[buildingType] || 2.0;
    const slabDeadLoad = (slabThickness / 1000) * 25; // RCC unit weight
    const floorFinish = 1.5;
    const partitionLoad = 1.5;
    const ceilingPlaster = 0.5;
    const totalFloorLoad = slabDeadLoad + floorFinish + partitionLoad + ceilingPlaster + liveLoad;

    // Auto-generate footings from columns
    const footings = columns.map(col => {
      const tributaryArea = 9; // default 3m × 3m
      const axialLoad = tributaryArea * numFloors * totalFloorLoad;
      const sbc = 200; // default soil bearing capacity
      const footingArea = axialLoad / (sbc * 0.8);
      const side = Math.ceil(Math.sqrt(footingArea) * 1000 / 50) * 50;
      return {
        column_id: col._id,
        footing_type: 'isolated',
        dimensions: { length: side, width: side, depth: 450 },
        reinforcement: 'Y12 @ 150 c/c both ways',
        axial_load: Math.round(axialLoad * 10) / 10,
      };
    });

    // Slab schedule
    const slabs = floors.map(floor => ({
      floor_id: floor._id,
      slab_type: 'two_way',
      thickness: slabThickness,
      reinforcement: 'Y10 @ 150 c/c both ways',
      grade_concrete: 'M25',
    }));

    // Seismic analysis (IS 1893)
    const totalWeight = totalFloorLoad * 100 * numFloors; // Assume 100 sqm per floor
    const zone = 'III';
    const Z = { II: 0.10, III: 0.16, IV: 0.24, V: 0.36 }[zone];
    const Ah = (Z / 2) * (1.0 / 5.0) * 2.5;
    const baseShear = Ah * totalWeight;

    // Wind load
    const basicWindSpeed = 39; // m/s — Chennai
    const Vz = basicWindSpeed * 1.0 * 1.0 * 1.0;
    const windPressure = 0.6 * Vz * Vz / 1000; // kN/m²

    const structural = await StructuralDesign.findOneAndUpdate(
      { bim_project_id, building_id },
      {
        bim_project_id,
        building_id,
        company_id: req.user.company_id,
        foundation: {
          type: numFloors > 4 ? 'raft' : 'isolated',
          depth: numFloors > 4 ? 2000 : 1500,
          soil_bearing_capacity: 200,
          water_table_depth: 0,
        },
        footings,
        slabs,
        load_summary: {
          dead_load: Math.round((slabDeadLoad + floorFinish + ceilingPlaster) * 100) / 100,
          live_load: liveLoad,
          partition_load: partitionLoad,
          wind_load: Math.round(windPressure * 100) / 100,
          seismic_load: Math.round(baseShear * 10) / 10,
          total_load: Math.round(totalFloorLoad * 100) / 100,
        },
        seismic: { zone, zone_factor: Z, importance_factor: 1.0, response_factor: 5.0, Ah: Math.round(Ah * 1000) / 1000, base_shear: Math.round(baseShear * 10) / 10 },
        wind: { basic_speed: basicWindSpeed, design_pressure: Math.round(windPressure * 100) / 100 },
        concrete_grade: numFloors > 4 ? 'M30' : 'M25',
        steel_grade: 'Fe500',
        design_code: 'IS 456:2000',
        status: 'generated',
      },
      { upsert: true, new: true }
    );

    res.status(201).json(structural);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get structural design for a project
// @route   GET /api/bim/structural/:projectId
exports.getStructural = async (req, res) => {
  try {
    const designs = await StructuralDesign.find({ bim_project_id: req.params.projectId })
      .populate('building_id', 'name building_type num_floors');
    res.json(designs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update structural design
// @route   PUT /api/bim/structural/:id
exports.updateStructural = async (req, res) => {
  try {
    const design = await StructuralDesign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!design) return res.status(404).json({ message: 'Structural design not found' });
    res.json(design);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get column schedule
// @route   GET /api/bim/structural/schedule/:projectId/columns
exports.getColumnSchedule = async (req, res) => {
  try {
    const columns = await Column.find({ bim_project_id: req.params.projectId })
      .populate('floor_id', 'floor_name level');
    const schedule = columns.map(col => ({
      id: col._id,
      floor: col.floor_id?.floor_name || 'Unknown',
      level: col.floor_id?.level || 0,
      shape: col.shape,
      width: col.width,
      depth: col.depth || col.width,
      diameter: col.diameter,
      material: col.material,
      position: col.position,
    }));
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get beam schedule
// @route   GET /api/bim/structural/schedule/:projectId/beams
exports.getBeamSchedule = async (req, res) => {
  try {
    const beams = await Beam.find({ bim_project_id: req.params.projectId })
      .populate('floor_id', 'floor_name level');
    const schedule = beams.map(beam => {
      const dx = (beam.end_point?.x || 0) - (beam.start_point?.x || 0);
      const dy = (beam.end_point?.y || 0) - (beam.start_point?.y || 0);
      const span = Math.sqrt(dx * dx + dy * dy);
      return {
        id: beam._id,
        floor: beam.floor_id?.floor_name || 'Unknown',
        level: beam.floor_id?.level || 0,
        width: beam.width,
        depth: beam.depth,
        span: Math.round(span),
        beam_type: beam.beam_type,
        material: beam.material,
      };
    });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
