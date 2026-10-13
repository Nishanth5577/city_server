const prisma = require('../../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

// ─── IFC Export ───
exports.exportIFC = async (req, res, next) => {
  try {
    const project = await prisma.bIMProject.findUnique({ where: { id: req.params.projectId || req.body.bim_project_id } });
    if (!project) return res.status(404).json({ message: 'BIM project not found' });
    const exportRecord = await prisma.iFCExport.create({
      data: { bim_project_id: project.id, format: 'ifc', status: 'completed', export_options: req.body.options || {}, created_by: req.user.userId },
    });
    res.status(201).json(addId(exportRecord));
  } catch (err) { next(err); }
};

// ─── DXF Export ───
exports.exportDXF = async (req, res, next) => {
  try {
    const bim_project_id = req.params.projectId || req.body.bim_project_id;
    const project = await prisma.bIMProject.findUnique({ where: { id: bim_project_id } });
    if (!project) return res.status(404).json({ message: 'BIM project not found' });
    const exportRecord = await prisma.iFCExport.create({
      data: { bim_project_id, format: 'dxf', status: 'completed', export_options: req.body.options || {}, created_by: req.user.userId },
    });
    res.status(201).json(addId(exportRecord));
  } catch (err) { next(err); }
};

// ─── PDF Export ───
exports.exportPDF = async (req, res, next) => {
  try {
    const bim_project_id = req.params.projectId || req.body.bim_project_id;
    const project = await prisma.bIMProject.findUnique({ where: { id: bim_project_id } });
    if (!project) return res.status(404).json({ message: 'BIM project not found' });
    const exportRecord = await prisma.iFCExport.create({
      data: { bim_project_id, format: 'pdf', status: 'completed', export_options: req.body.options || {}, created_by: req.user.userId },
    });
    res.status(201).json(addId(exportRecord));
  } catch (err) { next(err); }
};

// ─── List Exports ───
exports.getExports = async (req, res, next) => {
  try {
    const bim_project_id = req.params.projectId || req.query.bim_project_id;
    const where = bim_project_id ? { bim_project_id } : {};
    const exports_list = await prisma.iFCExport.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json(exports_list.map(addId));
  } catch (err) { next(err); }
};

// ─── Export Full Project (JSON) ───
exports.exportProject = async (req, res, next) => {
  try {
    const project = await prisma.bIMProject.findUnique({ where: { id: req.params.projectId || req.query.bim_project_id } });
    if (!project) return res.status(404).json({ message: 'BIM project not found' });
    // Return full project data as JSON export
    res.json({ export_format: 'json', project: addId(project), exported_at: new Date().toISOString(), exported_by: req.user.userId });
  } catch (err) { next(err); }
};

// ─── Export Single Floor ───
exports.exportFloor = async (req, res, next) => {
  try {
    const project = await prisma.bIMProject.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'BIM project not found' });
    const floorIndex = parseInt(req.params.floorIndex || req.query.floor || 0);
    const buildings = typeof project.buildings === 'object' ? project.buildings : [];
    const building = Array.isArray(buildings) && buildings.length > 0 ? buildings[0] : {};
    const floors = building.floors || [];
    const floor = floors[floorIndex] || null;
    res.json({ export_format: 'json', floor, floorIndex, exported_at: new Date().toISOString() });
  } catch (err) { next(err); }
};

// ─── Design History ───
exports.getDesignHistory = async (req, res, next) => {
  try {
    const bim_project_id = req.params.projectId || req.query.bim_project_id;
    if (!bim_project_id) return res.json([]);
    const history = await prisma.designHistory.findMany({
      where: { bim_project_id },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    res.json(history.map(addId));
  } catch (err) { next(err); }
};

exports.addDesignHistory = async (req, res, next) => {
  try {
    const { bim_project_id, action, description, snapshot } = req.body;
    const entry = await prisma.designHistory.create({
      data: { bim_project_id, action: action || 'edit', description: description || '', user_id: req.user.userId, user_name: req.user.name || 'User', snapshot: snapshot || null },
    });
    res.status(201).json(addId(entry));
  } catch (err) { next(err); }
};
