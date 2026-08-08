const Project = require('../models/Project');
const ConstructionStage = require('../models/ConstructionStage');
const { CONSTRUCTION_STAGES } = require('../utils/constants');
const { generateProjectQR } = require('../services/qrService');

// @desc    Get all projects
// @route   GET /api/projects
exports.getProjects = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    // Scope by company for non-admin users
    if (req.user.company_id) {
      query.company_id = req.user.company_id;
    }

    // Project managers see only their assigned projects
    if (req.user.role === 'project_manager') {
      query.manager_id = req.user.userId;
    }

    // Workers/engineers/supervisors see projects they're assigned to
    if (['engineer', 'supervisor', 'worker'].includes(req.user.role)) {
      query.$or = [
        { manager_id: req.user.userId },
        { created_by: req.user.userId },
      ];
    }

    if (status) query.project_status = status;
    if (search) {
      const searchCondition = {
        $or: [
          { project_name: { $regex: search, $options: 'i' } },
          { client_name: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ],
      };
      // If role scoping already set $or, combine with $and
      if (query.$or) {
        const roleScopeOr = query.$or;
        delete query.$or;
        query.$and = [{ $or: roleScopeOr }, searchCondition];
      } else {
        Object.assign(query, searchCondition);
      }
    }

    const projects = await Project.find(query)
      .populate('manager_id', 'name email')
      .populate('created_by', 'name')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Project.countDocuments(query);

    res.json({
      projects,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager_id', 'name email phone')
      .populate('created_by', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const stages = await ConstructionStage.find({ project_id: project._id })
      .sort({ stage_order: 1 });

    res.json({ ...project.toObject(), stages });
  } catch (error) {
    next(error);
  }
};

// @desc    Create project
// @route   POST /api/projects
exports.createProject = async (req, res, next) => {
  try {
    const projectData = {
      ...req.body,
      created_by: req.user.userId,
      company_id: req.user.company_id,
    };

    const project = await Project.create(projectData);

    // Generate QR code
    const qrCode = await generateProjectQR(project._id, project.project_name);
    if (qrCode) {
      project.qr_code = qrCode;
      await project.save();
    }

    // Initialize construction stages
    const stages = CONSTRUCTION_STAGES.map((stage, index) => ({
      project_id: project._id,
      stage_name: stage,
      stage_order: index,
      status: index === 0 ? 'in_progress' : 'not_started',
    }));
    await ConstructionStage.insertMany(stages);

    const populated = await Project.findById(project._id)
      .populate('manager_id', 'name email')
      .populate('created_by', 'name');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('manager_id', 'name email')
      .populate('created_by', 'name');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const Task = require('../models/Task');
    const Expense = require('../models/Expense');
    const Material = require('../models/Material');
    const Equipment = require('../models/Equipment');
    const Document = require('../models/Document');
    const DailyProgressReport = require('../models/DailyProgressReport');

    // Cascade delete all related data
    await Promise.all([
      ConstructionStage.deleteMany({ project_id: req.params.id }),
      Task.deleteMany({ project_id: req.params.id }),
      Expense.deleteMany({ project_id: req.params.id }),
      Material.deleteMany({ project_id: req.params.id }),
      Equipment.updateMany({ assigned_project: req.params.id }, { $set: { assigned_project: null, availability: 'available' } }),
      Document.deleteMany({ project_id: req.params.id }),
      DailyProgressReport.deleteMany({ project_id: req.params.id }),
    ]);

    res.json({ message: 'Project and all related data deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project stats
// @route   GET /api/projects/stats/overview
exports.getProjectStats = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;

    const [total, active, completed, delayed, planning] = await Promise.all([
      Project.countDocuments(query),
      Project.countDocuments({ ...query, project_status: 'active' }),
      Project.countDocuments({ ...query, project_status: 'completed' }),
      Project.countDocuments({ ...query, project_status: 'delayed' }),
      Project.countDocuments({ ...query, project_status: 'planning' }),
    ]);

    const budgetAgg = await Project.aggregate([
      { $match: query },
      { $group: { _id: null, totalBudget: { $sum: '$budget' } } },
    ]);

    res.json({
      total,
      active,
      completed,
      delayed,
      planning,
      onHold: total - active - completed - delayed - planning,
      totalBudget: budgetAgg[0]?.totalBudget || 0,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public project info (for QR scan)
// @route   GET /api/projects/public/:id
exports.getPublicProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .select('project_name client_name location project_status progress_percentage description');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const stages = await ConstructionStage.find({ project_id: project._id })
      .select('stage_name status completion_percentage stage_order')
      .sort({ stage_order: 1 });

    res.json({ project, stages });
  } catch (error) {
    next(error);
  }
};
