const mongoose = require('mongoose');
const { ROOF_TYPES } = require('../../utils/bimConstants');

const roofSchema = new mongoose.Schema({
  building_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMBuilding', required: true },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  roof_type: { type: String, enum: Object.values(ROOF_TYPES), default: ROOF_TYPES.FLAT },
  slope_angle: { type: Number, default: 0 },
  ridge_height: { type: Number, default: 0 },
  overhang: { type: Number, default: 300 },
  material: { type: String, default: 'rcc' },
  waterproofing: { type: String, default: 'bitumen' },
  insulation: { type: String, default: 'xps' },
  insulation_thickness: { type: Number, default: 50 },
  parapet_height: { type: Number, default: 900 },
  boundary_points: [{ x: Number, y: Number }],
  solar_panel_zones: [{ points: [{ x: Number, y: Number }], area: Number }],
  drainage: { type: String, enum: ['internal', 'external', 'both'], default: 'external' },
  color: { type: String, default: '#808080' },
  bim: {
    manufacturer: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    fire_rating: { type: String, default: '60min' },
    thermal_rating: { type: Number, default: 0 },
    weight_per_sqm: { type: Number, default: 0 },
    installation_date: { type: Date, default: null },
    expected_life_years: { type: Number, default: 50 },
    warranty_years: { type: Number, default: 10 },
  },
}, { timestamps: true });

roofSchema.index({ building_id: 1 });
roofSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMRoof', roofSchema);
