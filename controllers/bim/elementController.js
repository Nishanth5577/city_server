const BIMWall = require('../../models/bim/Wall');
const BIMColumn = require('../../models/bim/Column');
const BIMBeam = require('../../models/bim/Beam');
const BIMDoor = require('../../models/bim/Door');
const BIMWindow = require('../../models/bim/Window');
const BIMStair = require('../../models/bim/Stair');
const BIMFurniture = require('../../models/bim/Furniture');
const BIMRoom = require('../../models/bim/Room');
const BIMFloor = require('../../models/bim/Floor');

// Model map for dynamic CRUD
const MODEL_MAP = {
  wall: BIMWall,
  column: BIMColumn,
  beam: BIMBeam,
  door: BIMDoor,
  window: BIMWindow,
  stair: BIMStair,
  furniture: BIMFurniture,
  room: BIMRoom,
};

// @desc    Create element (unified for all types)
// @route   POST /api/bim/elements
exports.createElement = async (req, res, next) => {
  try {
    const { company_id } = req.user;
    const { element_type, floor_id, bim_project_id, ...elementData } = req.body;

    const Model = MODEL_MAP[element_type];
    if (!Model) return res.status(400).json({ message: `Invalid element type: ${element_type}` });

    const element = await Model.create({
      ...elementData,
      floor_id,
      bim_project_id,
      company_id,
    });

    // Add element reference to floor
    if (floor_id && element_type !== 'room') {
      const arrayField = element_type === 'furniture' ? 'elements.furniture' :
        `elements.${element_type}s`;
      await BIMFloor.findByIdAndUpdate(floor_id, {
        $push: { [arrayField]: element._id },
      });
    }
    if (floor_id && element_type === 'room') {
      await BIMFloor.findByIdAndUpdate(floor_id, { $push: { rooms: element._id } });
    }

    // Broadcast
    if (global.io) {
      global.io.to(`bim_${bim_project_id}`).emit('bim:element_created', {
        element_type,
        element,
        created_by: req.user.userId,
      });
    }

    res.status(201).json(element);
  } catch (err) { next(err); }
};

// @desc    Get elements by type and floor
// @route   GET /api/bim/elements?element_type=wall&floor_id=xxx
exports.getElements = async (req, res, next) => {
  try {
    const { element_type, floor_id, bim_project_id } = req.query;

    if (!element_type) return res.status(400).json({ message: 'element_type is required' });

    const Model = MODEL_MAP[element_type];
    if (!Model) return res.status(400).json({ message: `Invalid element type: ${element_type}` });

    const filter = {};
    if (floor_id) filter.floor_id = floor_id;
    if (bim_project_id) filter.bim_project_id = bim_project_id;

    const elements = await Model.find(filter);
    res.json(elements);
  } catch (err) { next(err); }
};

// @desc    Get single element
// @route   GET /api/bim/elements/:type/:id
exports.getElement = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const Model = MODEL_MAP[type];
    if (!Model) return res.status(400).json({ message: `Invalid element type: ${type}` });

    const element = await Model.findById(id);
    if (!element) return res.status(404).json({ message: 'Element not found' });
    res.json(element);
  } catch (err) { next(err); }
};

// @desc    Update element
// @route   PUT /api/bim/elements/:type/:id
exports.updateElement = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const Model = MODEL_MAP[type];
    if (!Model) return res.status(400).json({ message: `Invalid element type: ${type}` });

    const element = await Model.findByIdAndUpdate(id, req.body, { new: true });
    if (!element) return res.status(404).json({ message: 'Element not found' });

    // Broadcast update
    if (global.io) {
      global.io.to(`bim_${element.bim_project_id}`).emit('bim:element_updated', {
        element_type: type,
        element,
        updated_by: req.user.userId,
      });
    }

    res.json(element);
  } catch (err) { next(err); }
};

// @desc    Delete element
// @route   DELETE /api/bim/elements/:type/:id
exports.deleteElement = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const Model = MODEL_MAP[type];
    if (!Model) return res.status(400).json({ message: `Invalid element type: ${type}` });

    const element = await Model.findById(id);
    if (!element) return res.status(404).json({ message: 'Element not found' });

    // Remove from floor reference
    if (element.floor_id) {
      const arrayField = type === 'room' ? 'rooms' :
        type === 'furniture' ? 'elements.furniture' : `elements.${type}s`;
      await BIMFloor.findByIdAndUpdate(element.floor_id, { $pull: { [arrayField]: element._id } });
    }

    const bimProjectId = element.bim_project_id;
    await element.deleteOne();

    if (global.io) {
      global.io.to(`bim_${bimProjectId}`).emit('bim:element_deleted', {
        element_type: type,
        element_id: id,
        deleted_by: req.user.userId,
      });
    }

    res.json({ message: 'Element deleted' });
  } catch (err) { next(err); }
};

// @desc    Batch create elements (for paste, import, etc.)
// @route   POST /api/bim/elements/batch
exports.batchCreate = async (req, res, next) => {
  try {
    const { company_id } = req.user;
    const { elements, floor_id, bim_project_id } = req.body;

    const results = [];
    for (const { element_type, ...data } of elements) {
      const Model = MODEL_MAP[element_type];
      if (!Model) continue;

      const element = await Model.create({
        ...data,
        floor_id,
        bim_project_id,
        company_id,
      });
      results.push({ element_type, element });
    }

    res.status(201).json({ created: results.length, elements: results });
  } catch (err) { next(err); }
};

// @desc    Batch update elements (for multi-select operations)
// @route   PUT /api/bim/elements/batch
exports.batchUpdate = async (req, res, next) => {
  try {
    const { updates } = req.body; // [{element_type, element_id, data}]
    const results = [];

    for (const { element_type, element_id, data } of updates) {
      const Model = MODEL_MAP[element_type];
      if (!Model) continue;
      const element = await Model.findByIdAndUpdate(element_id, data, { new: true });
      if (element) results.push({ element_type, element });
    }

    res.json({ updated: results.length, elements: results });
  } catch (err) { next(err); }
};
