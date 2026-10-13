const prisma = require('../config/prisma');
const { CONSTRUCTION_STAGES } = require('../utils/constants');
const { generateProjectQR } = require('../services/qrService');

// Helper: add _id field for frontend compat
const addId = (obj) => obj ? { ...obj, _id: obj.id } : obj;
const addIds = (arr) => arr.map(addId);

// @desc    Get all projects
// @route   GET /api/projects
exports.getProjects = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (req.user.company_id) where.company_id = req.user.company_id;

    if (req.user.role === 'project_manager') {
      where.manager_id = req.user.userId;
    }

    if (['engineer', 'supervisor', 'worker'].includes(req.user.role)) {
      where.OR = [
        { manager_id: req.user.userId },
        { created_by: req.user.userId },
      ];
    }

    if (status) where.project_status = status;
    if (search) {
      const searchFilter = {
        OR: [
          { project_name: { contains: search, mode: 'insensitive' } },
          { client_name: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      };
      if (where.OR) {
        const roleOr = where.OR;
        delete where.OR;
        where.AND = [{ OR: roleOr }, searchFilter];
      } else {
        Object.assign(where, searchFilter);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          manager: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    // Map for frontend compat
    const mapped = projects.map(p => ({
      ...p, _id: p.id,
      manager_id: p.manager ? { ...p.manager, _id: p.manager.id } : p.manager_id,
      created_by: p.creator ? { ...p.creator, _id: p.creator.id } : p.created_by,
    }));

    res.json({
      projects: mapped,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / take),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
exports.getProject = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        manager: { select: { id: true, name: true, email: true, phone: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const stages = await prisma.constructionStage.findMany({
      where: { project_id: project.id },
      orderBy: { stage_order: 'asc' },
    });

    res.json({
      ...project, _id: project.id,
      manager_id: project.manager ? { ...project.manager, _id: project.manager.id } : project.manager_id,
      created_by: project.creator ? { ...project.creator, _id: project.creator.id } : project.created_by,
      stages: addIds(stages),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create project
// @route   POST /api/projects
exports.createProject = async (req, res, next) => {
  try {
    const { site_address, ...rest } = req.body;

    // Flatten site_address if sent as object
    const projectData = {
      ...rest,
      created_by: req.user.userId,
      company_id: req.user.company_id,
    };
    if (site_address) {
      projectData.site_street = site_address.street || '';
      projectData.site_city = site_address.city || '';
      projectData.site_state = site_address.state || '';
      projectData.site_zip = site_address.zip || '';
    }

    // Auto-gen project_id
    const count = await prisma.project.count();
    const rand = Math.floor(Math.random() * 900) + 100;
    projectData.project_id = `CC-PRJ-${String(count + 1).padStart(4, '0')}-${rand}`;

    // Convert date strings
    if (projectData.start_date) projectData.start_date = new Date(projectData.start_date);
    if (projectData.expected_end_date) projectData.expected_end_date = new Date(projectData.expected_end_date);

    const project = await prisma.project.create({ data: projectData });

    // Generate QR code
    try {
      const qrCode = await generateProjectQR(project.id, project.project_name);
      if (qrCode) {
        await prisma.project.update({ where: { id: project.id }, data: { qr_code: qrCode } });
      }
    } catch {}

    // Initialize construction stages
    const stagesData = CONSTRUCTION_STAGES.map((stage, idx) => ({
      project_id: project.id,
      stage_name: stage,
      stage_order: idx,
      status: idx === 0 ? 'in_progress' : 'not_started',
    }));
    await prisma.constructionStage.createMany({ data: stagesData });

    const populated = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(addId(populated));
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
exports.updateProject = async (req, res, next) => {
  try {
    const { site_address, _id, ...updateData } = req.body;
    if (site_address) {
      updateData.site_street = site_address.street || '';
      updateData.site_city = site_address.city || '';
      updateData.site_state = site_address.state || '';
      updateData.site_zip = site_address.zip || '';
    }
    if (updateData.start_date) updateData.start_date = new Date(updateData.start_date);
    if (updateData.expected_end_date) updateData.expected_end_date = new Date(updateData.expected_end_date);
    if (updateData.actual_end_date) updateData.actual_end_date = new Date(updateData.actual_end_date);

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        manager: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    res.json(addId(project));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Project not found.' });
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
exports.deleteProject = async (req, res, next) => {
  try {
    const id = req.params.id;

    // Check exists
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    // Cascade delete related data
    await Promise.all([
      prisma.constructionStage.deleteMany({ where: { project_id: id } }),
      prisma.task.deleteMany({ where: { project_id: id } }),
      prisma.expense.deleteMany({ where: { project_id: id } }),
      prisma.material.deleteMany({ where: { project_id: id } }),
      prisma.equipment.updateMany({ where: { assigned_project_id: id }, data: { assigned_project_id: null, availability: 'available' } }),
      prisma.document.deleteMany({ where: { project_id: id } }),
      prisma.dailyProgressReport.deleteMany({ where: { project_id: id } }),
      prisma.attendance.deleteMany({ where: { project_id: id } }),
      prisma.payment.deleteMany({ where: { project_id: id } }),
    ]);

    await prisma.project.delete({ where: { id } });

    res.json({ message: 'Project and all related data deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project stats
// @route   GET /api/projects/stats/overview
exports.getProjectStats = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;

    const [total, active, completed, delayed, planning, budgetResult] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.count({ where: { ...where, project_status: 'active' } }),
      prisma.project.count({ where: { ...where, project_status: 'completed' } }),
      prisma.project.count({ where: { ...where, project_status: 'delayed' } }),
      prisma.project.count({ where: { ...where, project_status: 'planning' } }),
      prisma.project.aggregate({ where, _sum: { budget: true } }),
    ]);

    res.json({
      total, active, completed, delayed, planning,
      onHold: total - active - completed - delayed - planning,
      totalBudget: budgetResult._sum.budget || 0,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public project info (for QR scan)
// @route   GET /api/projects/public/:id
exports.getPublicProject = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      select: { id: true, project_name: true, client_name: true, location: true, project_status: true, progress_percentage: true, description: true },
    });

    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const stages = await prisma.constructionStage.findMany({
      where: { project_id: project.id },
      select: { id: true, stage_name: true, status: true, completion_percentage: true, stage_order: true },
      orderBy: { stage_order: 'asc' },
    });

    res.json({ project: addId(project), stages: addIds(stages) });
  } catch (error) {
    next(error);
  }
};
