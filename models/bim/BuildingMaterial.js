const mongoose = require('mongoose');
const { MATERIAL_CATEGORIES } = require('../../utils/bimConstants');

const buildingMaterialSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: Object.values(MATERIAL_CATEGORIES), required: true },
  description: { type: String, default: '' },
  unit: { type: String, default: 'sqm' },
  cost_per_unit: { type: Number, default: 0 },
  density: { type: Number, default: 0 },
  compressive_strength: { type: Number, default: 0 },
  tensile_strength: { type: Number, default: 0 },
  thermal_conductivity: { type: Number, default: 0 },
  fire_rating: { type: String, default: 'none' },
  water_absorption: { type: Number, default: 0 },
  color: { type: String, default: '#808080' },
  texture_url: { type: String, default: '' },
  texture_repeat: { x: { type: Number, default: 1 }, y: { type: Number, default: 1 } },
  roughness: { type: Number, default: 0.5, min: 0, max: 1 },
  metalness: { type: Number, default: 0, min: 0, max: 1 },
  opacity: { type: Number, default: 1, min: 0, max: 1 },
  specifications: {
    grade: { type: String, default: '' },
    standard: { type: String, default: '' },
    size: { type: String, default: '' },
    finish: { type: String, default: '' },
  },
  supplier_info: {
    supplier_name: { type: String, default: '' },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    lead_time_days: { type: Number, default: 0 },
    minimum_order: { type: Number, default: 0 },
  },
  is_default: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  tags: [String],
}, { timestamps: true });

buildingMaterialSchema.index({ company_id: 1 });
buildingMaterialSchema.index({ category: 1 });
buildingMaterialSchema.index({ is_default: 1 });
module.exports = mongoose.model('BIMBuildingMaterial', buildingMaterialSchema);
