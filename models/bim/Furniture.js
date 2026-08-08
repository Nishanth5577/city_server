const mongoose = require('mongoose');
const { FURNITURE_TYPES } = require('../../utils/bimConstants');

const furnitureSchema = new mongoose.Schema({
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', required: true },
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMRoom', default: null },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  furniture_type: { type: String, enum: Object.values(FURNITURE_TYPES), default: FURNITURE_TYPES.TABLE },
  name: { type: String, default: '' },
  position: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  rotation: { type: Number, default: 0 },
  dimensions: { width: { type: Number, default: 600 }, depth: { type: Number, default: 600 }, height: { type: Number, default: 750 } },
  scale: { x: { type: Number, default: 1 }, y: { type: Number, default: 1 } },
  material: { type: String, default: 'wood' },
  color: { type: String, default: '#DEB887' },
  layer: { type: String, default: 'furniture' },
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  bim: {
    manufacturer: { type: String, default: '' },
    model_number: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    warranty_years: { type: Number, default: 1 },
    supplier: { type: String, default: '' },
    installation_date: { type: Date, default: null },
    expected_life_years: { type: Number, default: 10 },
    maintenance_interval_months: { type: Number, default: 12 },
  },
  canvas_id: { type: String, default: '' },
}, { timestamps: true });

furnitureSchema.index({ floor_id: 1 });
furnitureSchema.index({ bim_project_id: 1 });
furnitureSchema.index({ room_id: 1 });
module.exports = mongoose.model('BIMFurniture', furnitureSchema);
