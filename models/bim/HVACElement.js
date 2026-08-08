const mongoose = require('mongoose');
const { HVAC_ELEMENT_TYPES } = require('../../utils/bimConstants');

const hvacElementSchema = new mongoose.Schema({
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', required: true },
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMRoom', default: null },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  element_type: { type: String, enum: Object.values(HVAC_ELEMENT_TYPES), required: true },
  position: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  rotation: { type: Number, default: 0 },
  capacity_kw: { type: Number, default: 0 },
  capacity_btu: { type: Number, default: 0 },
  air_flow_cfm: { type: Number, default: 0 },
  duct_size: { width: { type: Number, default: 0 }, height: { type: Number, default: 0 }, diameter: { type: Number, default: 0 } },
  duct_material: { type: String, enum: ['gi', 'aluminium', 'fiberglass', 'fabric', 'pvc'], default: 'gi' },
  route_points: [{ x: Number, y: Number }],
  connected_to: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMHVACElement', default: null },
  refrigerant: { type: String, default: 'R32' },
  noise_level_db: { type: Number, default: 0 },
  color: { type: String, default: '#32CD32' },
  layer: { type: String, default: 'hvac' },
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  bim: {
    manufacturer: { type: String, default: '' },
    model_number: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    energy_rating: { type: String, default: '' },
    warranty_years: { type: Number, default: 5 },
    supplier: { type: String, default: '' },
    installation_date: { type: Date, default: null },
    expected_life_years: { type: Number, default: 15 },
    maintenance_interval_months: { type: Number, default: 6 },
  },
  canvas_id: { type: String, default: '' },
}, { timestamps: true });

hvacElementSchema.index({ floor_id: 1 });
hvacElementSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMHVACElement', hvacElementSchema);
