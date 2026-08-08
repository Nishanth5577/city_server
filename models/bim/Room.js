const mongoose = require('mongoose');
const { ROOM_TYPES } = require('../../utils/bimConstants');

const roomSchema = new mongoose.Schema({
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', required: true },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  room_type: { type: String, enum: Object.values(ROOM_TYPES), default: ROOM_TYPES.BEDROOM },
  boundary_points: [{ x: Number, y: Number }],
  area: { type: Number, default: 0 },
  perimeter: { type: Number, default: 0 },
  height: { type: Number, default: 3000 },
  finish: {
    floor: { material: { type: String, default: 'tile' }, color: { type: String, default: '#e0e0e0' } },
    wall: { material: { type: String, default: 'paint' }, color: { type: String, default: '#ffffff' } },
    ceiling: { material: { type: String, default: 'paint' }, color: { type: String, default: '#ffffff' } },
  },
  bim_properties: {
    occupancy_load: { type: Number, default: 0 },
    ventilation_required: { type: Boolean, default: true },
    fire_exit_required: { type: Boolean, default: false },
    natural_light: { type: Boolean, default: true },
    ac_required: { type: Boolean, default: false },
  },
  label_position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
}, { timestamps: true });

roomSchema.index({ floor_id: 1 });
roomSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMRoom', roomSchema);
