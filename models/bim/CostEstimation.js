const mongoose = require('mongoose');
const { COST_CATEGORIES } = require('../../utils/bimConstants');

const costEstimationSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'estimated', 'approved', 'revised'], default: 'draft' },
  boq_items: [{
    category: { type: String, enum: Object.values(COST_CATEGORIES) },
    item_name: { type: String, required: true },
    description: { type: String, default: '' },
    unit: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    element_type: { type: String, default: '' },
    element_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    material_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMBuildingMaterial', default: null },
  }],
  summary: {
    material_cost: { type: Number, default: 0 },
    labour_cost: { type: Number, default: 0 },
    electrical_cost: { type: Number, default: 0 },
    plumbing_cost: { type: Number, default: 0 },
    hvac_cost: { type: Number, default: 0 },
    solar_cost: { type: Number, default: 0 },
    interior_cost: { type: Number, default: 0 },
    exterior_cost: { type: Number, default: 0 },
    structural_cost: { type: Number, default: 0 },
    finishing_cost: { type: Number, default: 0 },
    landscaping_cost: { type: Number, default: 0 },
    equipment_cost: { type: Number, default: 0 },
    overhead_cost: { type: Number, default: 0 },
    contingency_cost: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    gst_percent: { type: Number, default: 18 },
    gst_amount: { type: Number, default: 0 },
    total_cost: { type: Number, default: 0 },
  },
  cost_per_sqft: { type: Number, default: 0 },
  total_area_sqft: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  linked_expense_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
}, { timestamps: true });

costEstimationSchema.index({ bim_project_id: 1 });
costEstimationSchema.index({ company_id: 1 });
module.exports = mongoose.model('BIMCostEstimation', costEstimationSchema);
