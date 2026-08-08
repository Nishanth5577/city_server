const BIMBuilding = require('../../models/bim/Building');
const BIMFloor = require('../../models/bim/Floor');
const BIMProject = require('../../models/bim/BIMProject');

// @desc    Get buildings for a BIM project
// @route   GET /api/bim/buildings?bim_project_id=xxx
exports.getBuildings = async (req, res, next) => {
  try {
    const { bim_project_id } = req.query;
    if (!bim_project_id) return res.status(400).json({ message: 'bim_project_id is required' });

    const buildings = await BIMBuilding.find({ bim_project_id })
      .populate('floors');
    res.json(buildings);
  } catch (err) { next(err); }
};

// @desc    Get single building
// @route   GET /api/bim/buildings/:id
exports.getBuilding = async (req, res, next) => {
  try {
    const building = await BIMBuilding.findById(req.params.id)
      .populate({ path: 'floors', populate: 'rooms' });
    if (!building) return res.status(404).json({ message: 'Building not found' });
    res.json(building);
  } catch (err) { next(err); }
};

// @desc    Create building
// @route   POST /api/bim/buildings
exports.createBuilding = async (req, res, next) => {
  try {
    const { company_id } = req.user;
    const { bim_project_id, name, building_type, num_floors, floor_height, structural_system, footprint } = req.body;

    const building = await BIMBuilding.create({
      bim_project_id,
      company_id,
      name,
      building_type,
      num_floors: num_floors || 1,
      floor_height: floor_height || 3000,
      total_height: (num_floors || 1) * (floor_height || 3000),
      structural_system,
      footprint,
    });

    // Auto-create floors
    const floors = [];
    for (let i = 0; i < (num_floors || 1); i++) {
      const floor = await BIMFloor.create({
        building_id: building._id,
        bim_project_id,
        company_id,
        floor_number: i,
        floor_name: i === 0 ? 'Ground Floor' : `Floor ${i}`,
        level_height: floor_height || 3000,
        floor_type: i === 0 ? 'ground' : 'typical',
      });
      floors.push(floor._id);
    }
    building.floors = floors;
    await building.save();

    // Add to BIM project
    await BIMProject.findByIdAndUpdate(bim_project_id, { $push: { buildings: building._id } });

    const populated = await BIMBuilding.findById(building._id).populate('floors');
    res.status(201).json(populated);
  } catch (err) { next(err); }
};

// @desc    Update building
// @route   PUT /api/bim/buildings/:id
exports.updateBuilding = async (req, res, next) => {
  try {
    const building = await BIMBuilding.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('floors');
    if (!building) return res.status(404).json({ message: 'Building not found' });
    res.json(building);
  } catch (err) { next(err); }
};

// @desc    Delete building
// @route   DELETE /api/bim/buildings/:id
exports.deleteBuilding = async (req, res, next) => {
  try {
    const building = await BIMBuilding.findById(req.params.id);
    if (!building) return res.status(404).json({ message: 'Building not found' });

    await BIMFloor.deleteMany({ building_id: building._id });
    await BIMProject.findByIdAndUpdate(building.bim_project_id, { $pull: { buildings: building._id } });
    await building.deleteOne();

    res.json({ message: 'Building deleted' });
  } catch (err) { next(err); }
};
