const mongoose = require('mongoose');

const solarSystemSchema = new mongoose.Schema({
  building_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMBuilding', required: true },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  panels: [{
    position: { x: Number, y: Number },
    dimensions: { width: { type: Number, default: 1960 }, height: { type: Number, default: 992 } },
    rotation: { type: Number, default: 0 },
    tilt_angle: { type: Number, default: 15 },
    azimuth: { type: Number, default: 180 },
    wattage: { type: Number, default: 400 },
    panel_type: { type: String, enum: ['monocrystalline', 'polycrystalline', 'thin_film'], default: 'monocrystalline' },
  }],
  inverter: {
    type: { type: String, enum: ['string', 'micro', 'hybrid'], default: 'string' },
    capacity_kw: { type: Number, default: 0 },
    manufacturer: { type: String, default: '' },
    cost: { type: Number, default: 0 },
  },
  battery: {
    enabled: { type: Boolean, default: false },
    capacity_kwh: { type: Number, default: 0 },
    type: { type: String, enum: ['lithium_ion', 'lead_acid', 'flow'], default: 'lithium_ion' },
    manufacturer: { type: String, default: '' },
    cost: { type: Number, default: 0 },
  },
  total_capacity_kw: { type: Number, default: 0 },
  estimated_generation_kwh_year: { type: Number, default: 0 },
  estimated_savings_year: { type: Number, default: 0 },
  total_cost: { type: Number, default: 0 },
  payback_years: { type: Number, default: 0 },
  roof_area_used: { type: Number, default: 0 },
  co2_reduction_kg_year: { type: Number, default: 0 },
  bim: {
    installation_date: { type: Date, default: null },
    warranty_years: { type: Number, default: 25 },
    expected_life_years: { type: Number, default: 25 },
    degradation_rate_percent: { type: Number, default: 0.5 },
  },
}, { timestamps: true });

solarSystemSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMSolarSystem', solarSystemSchema);
