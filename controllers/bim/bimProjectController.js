const prisma = require('../../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

// @desc    Get all BIM projects
// @route   GET /api/bim/projects
exports.getProjects = async (req, res, next) => {
  try {
    const { company_id } = req.user;
    const { project_id, status, page = 1, limit = 20 } = req.query;
    const where = { company_id };
    if (project_id) where.project_id = project_id;
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [projects, total] = await Promise.all([
      prisma.bIMProject.findMany({
        where, skip, take, orderBy: { updatedAt: 'desc' },
        include: { project: { select: { id: true, project_name: true, project_id: true, client_name: true } }, creator: { select: { id: true, name: true, email: true } } },
      }),
      prisma.bIMProject.count({ where }),
    ]);
    res.json({
      projects: projects.map(p => ({ ...p, _id: p.id, project_id: p.project ? { ...p.project, _id: p.project.id } : p.project_id, created_by: p.creator ? { ...p.creator, _id: p.creator.id } : p.created_by })),
      total, page: parseInt(page), pages: Math.ceil(total / take),
    });
  } catch (err) { next(err); }
};

// @desc    Get single BIM project
// @route   GET /api/bim/projects/:id
exports.getProject = async (req, res, next) => {
  try {
    const project = await prisma.bIMProject.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { id: true, project_name: true, project_id: true, client_name: true, contract_value: true, budget: true } }, creator: { select: { id: true, name: true, email: true } } },
    });
    if (!project) return res.status(404).json({ message: 'BIM project not found' });
    res.json(addId(project));
  } catch (err) { next(err); }
};

// @desc    Create BIM project
// @route   POST /api/bim/projects
exports.createProject = async (req, res, next) => {
  try {
    const { company_id, userId } = req.user;
    const { project_id, design_name, description, site_data, coordinate_system } = req.body;

    if (project_id) {
      const erpProject = await prisma.project.findUnique({ where: { id: project_id } });
      if (!erpProject) return res.status(400).json({ message: 'ERP Project not found' });
    }

    const bimProject = await prisma.bIMProject.create({
      data: {
        project_id: project_id || null, company_id, created_by: userId,
        design_name, description: description || '', site_data: site_data || {},
        coordinate_system: coordinate_system || 'metric',
        collaborators: [{ user_id: userId, role: 'owner' }],
      },
    });

    if (global.io) global.io.to(`company_${company_id}`).emit('bim:project_created', bimProject);
    res.status(201).json(addId(bimProject));
  } catch (err) { next(err); }
};

// @desc    Update BIM project
// @route   PUT /api/bim/projects/:id
exports.updateProject = async (req, res, next) => {
  try {
    const existing = await prisma.bIMProject.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'BIM project not found' });

    const updates = {};
    const allowed = ['design_name', 'description', 'status', 'site_data', 'canvas_settings', 'layer_visibility', 'grid_spacing', 'snap_enabled', 'tags', 'thumbnail', 'building_data', 'element_counts'];
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    updates.version = existing.version + 1;

    const project = await prisma.bIMProject.update({ where: { id: req.params.id }, data: updates });
    if (global.io) global.io.to(`bim_${project.id}`).emit('bim:project_updated', project);
    res.json(addId(project));
  } catch (err) { next(err); }
};

// @desc    Delete BIM project
// @route   DELETE /api/bim/projects/:id
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await prisma.bIMProject.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ message: 'BIM project not found' });
    await prisma.bIMProject.delete({ where: { id: req.params.id } });
    res.json({ message: 'BIM project deleted successfully' });
  } catch (err) { next(err); }
};

// @desc    Add collaborator
// @route   POST /api/bim/projects/:id/collaborators
exports.addCollaborator = async (req, res, next) => {
  try {
    const project = await prisma.bIMProject.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ message: 'BIM project not found' });

    const { user_id, role } = req.body;
    const collabs = Array.isArray(project.collaborators) ? project.collaborators : [];
    const exists = collabs.find(c => c.user_id === user_id);
    if (exists) return res.status(400).json({ message: 'User is already a collaborator' });

    collabs.push({ user_id, role: role || 'viewer', added_at: new Date() });
    const updated = await prisma.bIMProject.update({ where: { id: req.params.id }, data: { collaborators: collabs } });
    res.json(addId(updated));
  } catch (err) { next(err); }
};
