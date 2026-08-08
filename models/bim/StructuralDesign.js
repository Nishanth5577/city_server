const mongoose = require('mongoose');

const structuralDesignSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  building_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMBuilding', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  foundation: {
    type: { type: String, enum: ['isolated', 'combined', 'raft', 'pile', 'strip'], default: 'isolated' },
    depth: { type: Number, default: 1500 },
    soil_bearing_capacity: { type: Number, default: 200 },
    water_table_depth: { type: Number, default: 0 },
  },
  footings: [{
    column_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMColumn' },
    footing_type: { type: String, default: 'isolated' },
    dimensions: { length: Number, width: Number, depth: Number },
    reinforcement: { type: String, default: '' },
  }],
  slabs: [{
    floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor' },
    slab_type: { type: String, enum: ['one_way', 'two_way', 'flat', 'waffle', 'ribbed'], default: 'two_way' },
    thickness: { type: Number, default: 150 },
    reinforcement: { type: String, default: '' },
    grade_concrete: { type: String, default: 'M25' },
  }],
  load_summary: {
    dead_load: { type: Number, default: 0 },
    live_load: { type: Number, default: 0 },
    wind_load: { type: Number, default: 0 },
    seismic_load: { type: Number, default: 0 },
    total_load: { type: Number, default: 0 },
  },
  design_codes: {
    concrete: { type: String, default: 'IS 456:2000' },
    steel: { type: String, default: 'IS 1786:2008' },
    seismic: { type: String, default: 'IS 1893:2016' },
    wind: { type: String, default: 'IS 875 Part 3' },
  },
  status: { type: String, enum: ['draft', 'analysis', 'designed', 'approved'], default: 'draft' },
}, { timestamps: true });

structuralDesignSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMStructuralDesign', structuralDesignSchema);
