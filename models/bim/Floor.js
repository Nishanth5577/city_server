const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema({
  building_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMBuilding', required: true },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  floor_number: { type: Number, required: true },
  floor_name: { type: String, default: '' },
  level_height: { type: Number, default: 3000 },
  slab_thickness: { type: Number, default: 150 },
  floor_type: { type: String, enum: ['basement', 'ground', 'typical', 'terrace', 'penthouse', 'mezzanine', 'parking'], default: 'typical' },
  canvas_data: { type: mongoose.Schema.Types.Mixed, default: null },
  total_area: { type: Number, default: 0 },
  carpet_area: { type: Number, default: 0 },
  rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BIMRoom' }],
  elements: {
    walls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BIMWall' }],
    columns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BIMColumn' }],
    beams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BIMBeam' }],
    doors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BIMDoor' }],
    windows: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BIMWindow' }],
    stairs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BIMStair' }],
    furniture: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BIMFurniture' }],
  },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

floorSchema.index({ building_id: 1 });
floorSchema.index({ bim_project_id: 1 });
floorSchema.index({ floor_number: 1 });

module.exports = mongoose.model('BIMFloor', floorSchema);
