const mongoose = require('mongoose');
const { ELECTRICAL_ELEMENT_TYPES } = require('../../utils/bimConstants');

const electricalElementSchema = new mongoose.Schema({
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', required: true },
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMRoom', default: null },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  element_type: { type: String, enum: Object.values(ELECTRICAL_ELEMENT_TYPES), required: true },
  position: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  rotation: { type: Number, default: 0 },
  mounting_height: { type: Number, default: 1200 },
  wattage: { type: Number, default: 0 },
  voltage: { type: Number, default: 230 },
  amperage: { type: Number, default: 0 },
  circuit_number: { type: String, default: '' },
  cable_type: { type: String, default: '' },
  cable_size: { type: String, default: '' },
  conduit_type: { type: String, enum: ['pvc', 'gi', 'flexible', 'none'], default: 'pvc' },
  connected_to: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMElectricalElement', default: null },
  wire_route: [{ x: Number, y: Number }],
  color: { type: String, default: '#FFD700' },
  layer: { type: String, default: 'electrical' },
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  bim: {
    manufacturer: { type: String, default: '' },
    model_number: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    ip_rating: { type: String, default: '' },
    energy_rating: { type: String, default: '' },
    warranty_years: { type: Number, default: 2 },
    supplier: { type: String, default: '' },
    installation_date: { type: Date, default: null },
    expected_life_years: { type: Number, default: 15 },
  },
  canvas_id: { type: String, default: '' },
}, { timestamps: true });

electricalElementSchema.index({ floor_id: 1 });
electricalElementSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMElectricalElement', electricalElementSchema);
