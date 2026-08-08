const Task = require('../models/Task');
const User = require('../models/User');
const { sendTaskAssignedEmail } = require('../services/emailService');

// @desc    Get tasks
// @route   GET /api/tasks
exports.getTasks = async (req, res, next) => {
  try {
    const { project_id, status, priority, assigned_worker, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (project_id) query.project_id = project_id;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assigned_worker) query.assigned_worker = assigned_worker;

    // Workers only see their own tasks
    if (req.user.role === 'worker') {
      query.assigned_worker = req.user.userId;
    }

    if (search) {
      query.task_name = { $regex: search, $options: 'i' };
    }

    const tasks = await Task.find(query)
      .populate('assigned_worker', 'name email')
      .populate('project_id', 'project_name')
      .populate('dependencies', 'task_name status')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Task.countDocuments(query);

    res.json({ tasks, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assigned_worker', 'name email phone')
      .populate('project_id', 'project_name')
      .populate('dependencies', 'task_name status completion_percentage');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
};

// @desc    Create task
// @route   POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const taskData = {
      ...req.body,
      created_by: req.user.userId,
    };

    const task = await Task.create(taskData);

    // Send email notification if worker is assigned
    if (task.assigned_worker) {
      const worker = await User.findById(task.assigned_worker);
      if (worker) {
        const Project = require('../models/Project');
        const project = await Project.findById(task.project_id);
        await sendTaskAssignedEmail(worker.email, task.task_name, project?.project_name || '');
      }
    }

    const populated = await Task.findById(task._id)
      .populate('assigned_worker', 'name email')
      .populate('project_id', 'project_name');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assigned_worker', 'name email')
      .populate('project_id', 'project_name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task status
// @route   PATCH /api/tasks/:id/status
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status, completion_percentage } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (completion_percentage !== undefined) updates.completion_percentage = completion_percentage;

    if (status === 'completed') updates.completion_percentage = 100;

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('assigned_worker', 'name email')
      .populate('project_id', 'project_name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks for Gantt chart
// @route   GET /api/tasks/gantt/:projectId
exports.getGanttTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ project_id: req.params.projectId })
      .populate('assigned_worker', 'name')
      .populate('dependencies', 'task_name')
      .sort({ start_date: 1 });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
};
