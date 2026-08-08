const BIMFloor = require('../../models/bim/Floor');
const BIMWall = require('../../models/bim/Wall');
const BIMColumn = require('../../models/bim/Column');
const BIMDoor = require('../../models/bim/Door');
const BIMWindow = require('../../models/bim/Window');

// @desc    Get floors for a building
// @route   GET /api/bim/floors?building_id=xxx
exports.getFloors = async (req, res, next) => {
  try {
    const { building_id, bim_project_id } = req.query;
    const filter = {};
    if (building_id) filter.building_id = building_id;
    if (bim_project_id) filter.bim_project_id = bim_project_id;

    const floors = await BIMFloor.find(filter).sort({ floor_number: 1 });
    res.json(floors);
  } catch (err) { next(err); }
};

// @desc    Get single floor with all elements
// @route   GET /api/bim/floors/:id
exports.getFloor = async (req, res, next) => {
  try {
    const floor = await BIMFloor.findById(req.params.id)
      .populate('rooms')
      .populate('elements.walls')
      .populate('elements.columns')
      .populate('elements.doors')
      .populate('elements.windows')
      .populate('elements.stairs')
      .populate('elements.furniture');

    if (!floor) return res.status(404).json({ message: 'Floor not found' });
    res.json(floor);
  } catch (err) { next(err); }
};

// @desc    Save floor canvas data (2D plan)
// @route   PUT /api/bim/floors/:id/canvas
exports.saveCanvas = async (req, res, next) => {
  try {
    const { canvas_data, total_area, carpet_area } = req.body;
    const floor = await BIMFloor.findById(req.params.id);
    if (!floor) return res.status(404).json({ message: 'Floor not found' });

    floor.canvas_data = canvas_data;
    if (total_area !== undefined) floor.total_area = total_area;
    if (carpet_area !== undefined) floor.carpet_area = carpet_area;
    await floor.save();

    // Broadcast to collaborators
    if (global.io) {
      global.io.to(`bim_${floor.bim_project_id}`).emit('bim:canvas_updated', {
        floor_id: floor._id,
        canvas_data,
        updated_by: req.user.userId,
      });
    }

    res.json({ message: 'Canvas saved', floor_id: floor._id });
  } catch (err) { next(err); }
};

// @desc    Update floor properties
// @route   PUT /api/bim/floors/:id
exports.updateFloor = async (req, res, next) => {
  try {
    const floor = await BIMFloor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!floor) return res.status(404).json({ message: 'Floor not found' });
    res.json(floor);
  } catch (err) { next(err); }
};

// @desc    Duplicate floor (copy elements)
// @route   POST /api/bim/floors/:id/duplicate
exports.duplicateFloor = async (req, res, next) => {
  try {
    const sourceFloor = await BIMFloor.findById(req.params.id);
    if (!sourceFloor) return res.status(404).json({ message: 'Floor not found' });

    const { new_floor_number } = req.body;
    const newFloor = new BIMFloor({
      building_id: sourceFloor.building_id,
      bim_project_id: sourceFloor.bim_project_id,
      company_id: sourceFloor.company_id,
      floor_number: new_floor_number || sourceFloor.floor_number + 1,
      floor_name: `Floor ${new_floor_number || sourceFloor.floor_number + 1}`,
      level_height: sourceFloor.level_height,
      slab_thickness: sourceFloor.slab_thickness,
      floor_type: 'typical',
      canvas_data: sourceFloor.canvas_data,
      total_area: sourceFloor.total_area,
      carpet_area: sourceFloor.carpet_area,
    });
    await newFloor.save();

    res.status(201).json(newFloor);
  } catch (err) { next(err); }
};
