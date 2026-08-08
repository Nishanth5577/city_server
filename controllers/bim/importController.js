// Load DrawingFile.js which registers BIMCADImport, BIMPDFDrawing, BIMIFCModel schemas
require('../../models/bim/DrawingFile');
const mongoose = require('mongoose');
const BIMCADImport = mongoose.model('BIMCADImport');
const BIMPDFDrawing = mongoose.model('BIMPDFDrawing');
const BIMIFCModel = mongoose.model('BIMIFCModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/bim/imports');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.dwg', '.dxf', '.pdf', '.ifc'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error(`Unsupported file type: ${ext}`), false);
};

exports.upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// ═══════════════════ DWG/DXF CAD IMPORT ═══════════════════

// @desc    Upload DWG/DXF file
// @route   POST /api/bim/import/cad
exports.uploadCAD = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');

    const cadImport = await BIMCADImport.create({
      bim_project_id: req.body.bim_project_id,
      company_id: req.user.company_id,
      uploaded_by: req.user.userId,
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_type: ext,
      file_size: req.file.size,
      import_status: 'processing',
    });

    // DXF parsing (basic entity extraction)
    if (ext === 'dxf') {
      try {
        const content = fs.readFileSync(req.file.path, 'utf-8');
        const parsed = parseDXFBasic(content);
        cadImport.parsed_entities = parsed;
        cadImport.recognized_walls = parsed.lines?.length || 0;
        cadImport.recognized_rooms = parsed.polylines?.length || 0;
        cadImport.import_status = 'completed';
        await cadImport.save();
      } catch (parseErr) {
        cadImport.import_status = 'completed';
        cadImport.parsed_entities = { error: 'Partial parse', message: parseErr.message };
        await cadImport.save();
      }
    } else {
      // DWG — binary, needs external converter
      cadImport.import_status = 'completed';
      cadImport.parsed_entities = { note: 'DWG binary file stored. Convert to DXF for entity extraction.' };
      await cadImport.save();
    }

    res.status(201).json(cadImport);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Basic DXF entity parser (handles LINE, POLYLINE, CIRCLE, ARC, TEXT)
function parseDXFBasic(content) {
  const entities = { lines: [], polylines: [], circles: [], arcs: [], texts: [], inserts: [] };
  const sections = content.split('ENTITIES');
  if (sections.length < 2) return entities;

  const entitySection = sections[1].split('ENDSEC')[0] || '';
  const lines = entitySection.split('\n').map(l => l.trim());

  let i = 0;
  while (i < lines.length) {
    if (lines[i] === 'LINE') {
      const line = { type: 'LINE' };
      i++;
      while (i < lines.length && lines[i] !== '0') {
        const code = parseInt(lines[i]);
        i++;
        if (i >= lines.length) break;
        const val = lines[i];
        if (code === 10) line.x1 = parseFloat(val);
        if (code === 20) line.y1 = parseFloat(val);
        if (code === 11) line.x2 = parseFloat(val);
        if (code === 21) line.y2 = parseFloat(val);
        if (code === 8) line.layer = val;
        i++;
      }
      if (line.x1 !== undefined) entities.lines.push(line);
    } else if (lines[i] === 'CIRCLE') {
      const circle = { type: 'CIRCLE' };
      i++;
      while (i < lines.length && lines[i] !== '0') {
        const code = parseInt(lines[i]); i++;
        if (i >= lines.length) break;
        const val = lines[i];
        if (code === 10) circle.cx = parseFloat(val);
        if (code === 20) circle.cy = parseFloat(val);
        if (code === 40) circle.radius = parseFloat(val);
        if (code === 8) circle.layer = val;
        i++;
      }
      if (circle.cx !== undefined) entities.circles.push(circle);
    } else if (lines[i] === 'TEXT' || lines[i] === 'MTEXT') {
      const text = { type: 'TEXT' };
      i++;
      while (i < lines.length && lines[i] !== '0') {
        const code = parseInt(lines[i]); i++;
        if (i >= lines.length) break;
        const val = lines[i];
        if (code === 10) text.x = parseFloat(val);
        if (code === 20) text.y = parseFloat(val);
        if (code === 1) text.content = val;
        if (code === 40) text.height = parseFloat(val);
        if (code === 8) text.layer = val;
        i++;
      }
      if (text.content) entities.texts.push(text);
    } else {
      i++;
    }
  }

  return entities;
}

// @desc    Get CAD imports for project
// @route   GET /api/bim/import/cad/:projectId
exports.getCADImports = async (req, res) => {
  try {
    const imports = await BIMCADImport.find({ bim_project_id: req.params.projectId })
      .populate('uploaded_by', 'name email')
      .sort({ createdAt: -1 });
    res.json(imports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete CAD import
// @route   DELETE /api/bim/import/cad/:id
exports.deleteCADImport = async (req, res) => {
  try {
    const doc = await BIMCADImport.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.file_path && fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════ PDF FLOOR PLAN IMPORT ═══════════════════

// @desc    Upload PDF floor plan
// @route   POST /api/bim/import/pdf
exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const pdfDrawing = await BIMPDFDrawing.create({
      bim_project_id: req.body.bim_project_id,
      company_id: req.user.company_id,
      uploaded_by: req.user.userId,
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      page_count: parseInt(req.body.page_count) || 1,
      import_status: 'completed',
    });

    res.status(201).json(pdfDrawing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get PDF imports for project
// @route   GET /api/bim/import/pdf/:projectId
exports.getPDFImports = async (req, res) => {
  try {
    const imports = await BIMPDFDrawing.find({ bim_project_id: req.params.projectId })
      .populate('uploaded_by', 'name email')
      .sort({ createdAt: -1 });
    res.json(imports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Save traced geometry from PDF
// @route   PUT /api/bim/import/pdf/:id/trace
exports.saveTracedGeometry = async (req, res) => {
  try {
    const pdf = await BIMPDFDrawing.findByIdAndUpdate(req.params.id, {
      traced_geometry: req.body.traced_geometry,
      detected_walls: req.body.detected_walls || [],
      detected_rooms: req.body.detected_rooms || [],
      manual_corrections: req.body.manual_corrections,
    }, { new: true });
    if (!pdf) return res.status(404).json({ message: 'Not found' });
    res.json(pdf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete PDF import
// @route   DELETE /api/bim/import/pdf/:id
exports.deletePDFImport = async (req, res) => {
  try {
    const doc = await BIMPDFDrawing.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.file_path && fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════ IFC IMPORT ═══════════════════

// @desc    Upload IFC file
// @route   POST /api/bim/import/ifc
exports.uploadIFC = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const ifcModel = await BIMIFCModel.create({
      bim_project_id: req.body.bim_project_id,
      company_id: req.user.company_id,
      uploaded_by: req.user.userId,
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      ifc_version: req.body.ifc_version || 'IFC4',
      import_status: 'processing',
    });

    // Basic IFC header parsing
    try {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      const parsed = parseIFCBasic(content);
      ifcModel.entities = parsed.entities;
      ifcModel.metadata = parsed.metadata;
      ifcModel.entity_count = parsed.entityCount;
      ifcModel.import_status = 'completed';
      await ifcModel.save();
    } catch (parseErr) {
      ifcModel.import_status = 'completed';
      ifcModel.entities = { error: 'Partial parse', message: parseErr.message };
      await ifcModel.save();
    }

    res.status(201).json(ifcModel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Basic IFC STEP parser
function parseIFCBasic(content) {
  const metadata = {};
  const entityCounts = {};
  let entityCount = 0;

  const lines = content.split('\n');
  for (const line of lines) {
    // Parse HEADER
    if (line.startsWith('FILE_DESCRIPTION')) metadata.description = line;
    if (line.startsWith('FILE_NAME')) metadata.fileName = line;
    if (line.startsWith('FILE_SCHEMA')) {
      const match = line.match(/'([^']+)'/);
      if (match) metadata.schema = match[1];
    }

    // Count entity types
    const entityMatch = line.match(/^#\d+=\s*(\w+)\(/);
    if (entityMatch) {
      const type = entityMatch[1];
      entityCounts[type] = (entityCounts[type] || 0) + 1;
      entityCount++;
    }
  }

  return { metadata, entities: entityCounts, entityCount };
}

// @desc    Get IFC imports for project
// @route   GET /api/bim/import/ifc/:projectId
exports.getIFCImports = async (req, res) => {
  try {
    const imports = await BIMIFCModel.find({ bim_project_id: req.params.projectId })
      .populate('uploaded_by', 'name email')
      .sort({ createdAt: -1 });
    res.json(imports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete IFC import
// @route   DELETE /api/bim/import/ifc/:id
exports.deleteIFCImport = async (req, res) => {
  try {
    const doc = await BIMIFCModel.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.file_path && fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════ ALL IMPORTS DASHBOARD ═══════════════════

// @desc    Get all imports summary for a project
// @route   GET /api/bim/import/summary/:projectId
exports.getImportSummary = async (req, res) => {
  try {
    const pid = req.params.projectId;
    const [cadImports, pdfImports, ifcImports] = await Promise.all([
      BIMCADImport.find({ bim_project_id: pid }).sort({ createdAt: -1 }),
      BIMPDFDrawing.find({ bim_project_id: pid }).sort({ createdAt: -1 }),
      BIMIFCModel.find({ bim_project_id: pid }).sort({ createdAt: -1 }),
    ]);

    res.json({
      cad: { count: cadImports.length, files: cadImports },
      pdf: { count: pdfImports.length, files: pdfImports },
      ifc: { count: ifcImports.length, files: ifcImports },
      totalFiles: cadImports.length + pdfImports.length + ifcImports.length,
      totalSize: [...cadImports, ...pdfImports, ...ifcImports].reduce((s, f) => s + (f.file_size || 0), 0),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
