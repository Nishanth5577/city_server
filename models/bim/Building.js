const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  building_type: { type: String, enum: ['residential', 'commercial', 'industrial', 'mixed_use', 'institutional', 'hospitality'], default: 'residential' },
  structural_system: { type: String, enum: ['rcc_frame', 'steel_frame', 'load_bearing', 'composite', 'precast', 'timber'], default: 'rcc_frame' },
  num_floors: { type: Number, default: 1, min: 1, max: 200 },
  num_basements: { type: Number, default: 0, min: 0 },
  total_height: { type: Number, default: 3000 },
  floor_height: { type: Number, default: 3000 },
  footprint: { length: { type: Number, default: 0 }, width: { type: Number, default: 0 } },
  total_built_area: { type: Number, default: 0 },
  occupancy_type: { type: String, enum: ['single_family', 'multi_family', 'office', 'retail', 'warehouse', 'hospital', 'school', 'hotel'], default: 'multi_family' },
  fire_safety_class: { type: String, default: '' },
  seismic_zone: { type: String, enum: ['I', 'II', 'III', 'IV', 'V'], default: 'III' },
  wind_zone: { type: String, default: '' },
  position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
  rotation: { type: Number, default: 0 },
  floors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor' }],
}, { timestamps: true });

buildingSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMBuilding', buildingSchema);
