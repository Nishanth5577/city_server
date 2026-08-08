const mongoose = require('mongoose');

// BIM Metadata (generic metadata for any element)
const bimMetadataSchema = new mongoose.Schema({
  element_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  element_type: { type: String, required: true },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  geometry: { type: mongoose.Schema.Types.Mixed, default: {} },
  material: { type: String, default: '' },
  manufacturer: { type: String, default: '' },
  cost: { type: Number, default: 0 },
  dimensions: { width: Number, height: Number, depth: Number, length: Number, diameter: Number },
  installation_date: { type: Date, default: null },
  maintenance_date: { type: Date, default: null },
  expected_life_years: { type: Number, default: 0 },
  warranty_years: { type: Number, default: 0 },
  supplier: { type: String, default: '' },
  weight: { type: Number, default: 0 },
  fire_rating: { type: String, default: 'none' },
  thermal_rating: { type: Number, default: 0 },
  energy_rating: { type: String, default: '' },
  custom_properties: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

bimMetadataSchema.index({ element_id: 1, element_type: 1 });
bimMetadataSchema.index({ bim_project_id: 1 });
const BIMMetadata = mongoose.model('BIMMetadata', bimMetadataSchema);

// Virtual Tour
const virtualTourSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  waypoints: [{
    name: { type: String, default: '' },
    position: { x: Number, y: Number, z: Number },
    look_at: { x: Number, y: Number, z: Number },
    floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor' },
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMRoom' },
    duration: { type: Number, default: 3 },
    transition: { type: String, enum: ['cut', 'fade', 'slide'], default: 'slide' },
  }],
  hotspots: [{
    position: { x: Number, y: Number, z: Number },
    label: { type: String, default: '' },
    description: { type: String, default: '' },
    type: { type: String, enum: ['info', 'navigation', 'media', 'link'], default: 'info' },
    target: { type: String, default: '' },
  }],
  settings: {
    auto_play: { type: Boolean, default: false },
    loop: { type: Boolean, default: false },
    show_minimap: { type: Boolean, default: true },
    ambient_sound: { type: String, default: '' },
  },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  share_token: { type: String, default: null },
}, { timestamps: true });

virtualTourSchema.index({ bim_project_id: 1 });
const BIMVirtualTour = mongoose.model('BIMVirtualTour', virtualTourSchema);

// Design Comment
const designCommentSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  element_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  element_type: { type: String, default: '' },
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', default: null },
  position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
  content: { type: String, required: true, maxlength: 2000 },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  parent_comment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMDesignComment', default: null },
  attachments: [{ file_name: String, file_path: String, file_type: String }],
  status: { type: String, enum: ['open', 'resolved', 'archived'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
}, { timestamps: true });

designCommentSchema.index({ bim_project_id: 1 });
designCommentSchema.index({ element_id: 1 });
const BIMDesignComment = mongoose.model('BIMDesignComment', designCommentSchema);

// Design Approval
const designApprovalSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'revision_requested'], default: 'draft' },
  submission_date: { type: Date, default: null },
  review_date: { type: Date, default: null },
  comments: { type: String, default: '' },
  revision_notes: { type: String, default: '' },
  digital_signature: { type: String, default: null },
  snapshot_data: { type: mongoose.Schema.Types.Mixed, default: null },
  snapshot_thumbnail: { type: String, default: null },
}, { timestamps: true });

designApprovalSchema.index({ bim_project_id: 1 });
designApprovalSchema.index({ status: 1 });
const BIMDesignApproval = mongoose.model('BIMDesignApproval', designApprovalSchema);

// Revision History
const revisionHistorySchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  version: { type: Number, required: true },
  change_type: { type: String, enum: ['create', 'update', 'delete', 'import', 'export', 'approve', 'reject'], required: true },
  change_description: { type: String, default: '' },
  elements_changed: [{
    element_id: { type: mongoose.Schema.Types.ObjectId },
    element_type: { type: String },
    action: { type: String, enum: ['added', 'modified', 'deleted'] },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
  }],
  snapshot_json: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

revisionHistorySchema.index({ bim_project_id: 1 });
revisionHistorySchema.index({ version: -1 });
const BIMRevisionHistory = mongoose.model('BIMRevisionHistory', revisionHistorySchema);

// Collaborator (live session)
const collaboratorSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  socket_id: { type: String, default: '' },
  cursor_position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
  active_floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', default: null },
  selected_element_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  color: { type: String, default: '#FF0000' },
  is_online: { type: Boolean, default: true },
  last_activity: { type: Date, default: Date.now },
}, { timestamps: true });

collaboratorSchema.index({ bim_project_id: 1 });
collaboratorSchema.index({ user_id: 1 });
const BIMCollaborator = mongoose.model('BIMCollaborator', collaboratorSchema);

module.exports = {
  BIMMetadata,
  BIMVirtualTour,
  BIMDesignComment,
  BIMDesignApproval,
  BIMRevisionHistory,
  BIMCollaborator,
};
