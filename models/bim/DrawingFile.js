const mongoose = require('mongoose');

const drawingFileSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', default: null },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  file_name: { type: String, required: true },
  file_type: { type: String, enum: ['floor_plan', 'elevation', 'section', 'detail', 'site_plan', 'landscape'], default: 'floor_plan' },
  canvas_json: { type: mongoose.Schema.Types.Mixed, default: null },
  thumbnail: { type: String, default: null },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'final', 'approved', 'superseded'], default: 'draft' },
  scale: { type: String, default: '1:100' },
  paper_size: { type: String, enum: ['A0', 'A1', 'A2', 'A3', 'A4', 'custom'], default: 'A3' },
  notes: { type: String, default: '' },
}, { timestamps: true });

drawingFileSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMDrawingFile', drawingFileSchema);

// IFC Model
const ifcModelSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  file_name: { type: String, required: true },
  file_path: { type: String, default: '' },
  file_size: { type: Number, default: 0 },
  ifc_version: { type: String, enum: ['IFC2x3', 'IFC4', 'IFC4.3'], default: 'IFC4' },
  entities: { type: mongoose.Schema.Types.Mixed, default: {} },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  import_status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  entity_count: { type: Number, default: 0 },
}, { timestamps: true });

ifcModelSchema.index({ bim_project_id: 1 });
mongoose.model('BIMIFCModel', ifcModelSchema);

// CAD Import
const cadImportSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  file_name: { type: String, required: true },
  file_path: { type: String, default: '' },
  file_type: { type: String, enum: ['dwg', 'dxf'], required: true },
  file_size: { type: Number, default: 0 },
  parsed_entities: { type: mongoose.Schema.Types.Mixed, default: {} },
  recognized_walls: { type: Number, default: 0 },
  recognized_rooms: { type: Number, default: 0 },
  recognized_doors: { type: Number, default: 0 },
  recognized_windows: { type: Number, default: 0 },
  import_status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
}, { timestamps: true });

cadImportSchema.index({ bim_project_id: 1 });
mongoose.model('BIMCADImport', cadImportSchema);

// PDF Drawing
const pdfDrawingSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  file_name: { type: String, required: true },
  file_path: { type: String, default: '' },
  file_size: { type: Number, default: 0 },
  page_count: { type: Number, default: 1 },
  detected_walls: [{ start: { x: Number, y: Number }, end: { x: Number, y: Number }, thickness: Number }],
  detected_rooms: [{ boundary: [{ x: Number, y: Number }], label: String }],
  traced_geometry: { type: mongoose.Schema.Types.Mixed, default: null },
  import_status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  manual_corrections: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

pdfDrawingSchema.index({ bim_project_id: 1 });
mongoose.model('BIMPDFDrawing', pdfDrawingSchema);
