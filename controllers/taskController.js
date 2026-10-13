const prisma = require('../config/prisma');
const { sendTaskAssignedEmail } = require('../services/emailService');

const addId = (obj) => obj ? { ...obj, _id: obj.id } : obj;

// @desc    Get tasks
// @route   GET /api/tasks
exports.getTasks = async (req, res, next) => {
  try {
    const { project_id, status, priority, assigned_worker, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (project_id) where.project_id = project_id;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigned_worker) where.assigned_worker_id = assigned_worker;
    if (req.user.role === 'worker') where.assigned_worker_id = req.user.userId;
    if (search) where.task_name = { contains: search, mode: 'insensitive' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where, skip, take,
        include: {
          assignedWorker: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, project_name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ]);

    const mapped = tasks.map(t => ({
      ...t, _id: t.id,
      assigned_worker: t.assignedWorker ? { ...t.assignedWorker, _id: t.assignedWorker.id } : null,
      project_id: t.project ? { ...t.project, _id: t.project.id } : t.project_id,
    }));

    res.json({ tasks: mapped, total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
exports.getTask = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignedWorker: { select: { id: true, name: true, email: true, phone: true } },
        project: { select: { id: true, project_name: true } },
      },
    });
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json({
      ...task, _id: task.id,
      assigned_worker: task.assignedWorker ? { ...task.assignedWorker, _id: task.assignedWorker.id } : null,
      project_id: task.project ? { ...task.project, _id: task.project.id } : task.project_id,
    });
  } catch (error) { next(error); }
};

// @desc    Create task
// @route   POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const { assigned_worker, dependencies, ...rest } = req.body;
    const taskData = {
      ...rest,
      created_by: req.user.userId,
    };
    if (assigned_worker) taskData.assigned_worker_id = assigned_worker;
    if (taskData.start_date) taskData.start_date = new Date(taskData.start_date);
    if (taskData.end_date) taskData.end_date = new Date(taskData.end_date);

    const task = await prisma.task.create({ data: taskData });

    // Send email notification
    if (task.assigned_worker_id) {
      try {
        const worker = await prisma.user.findUnique({ where: { id: task.assigned_worker_id } });
        const project = await prisma.project.findUnique({ where: { id: task.project_id } });
        if (worker) await sendTaskAssignedEmail(worker.email, task.task_name, project?.project_name || '');
      } catch {}
    }

    const populated = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        assignedWorker: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, project_name: true } },
      },
    });

    res.status(201).json(addId(populated));
  } catch (error) { next(error); }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const { _id, assigned_worker, dependencies, ...updateData } = req.body;
    if (assigned_worker) updateData.assigned_worker_id = assigned_worker;
    if (updateData.start_date) updateData.start_date = new Date(updateData.start_date);
    if (updateData.end_date) updateData.end_date = new Date(updateData.end_date);

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        assignedWorker: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, project_name: true } },
      },
    });
    res.json(addId(task));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Task not found.' });
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Task not found.' });
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

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: updates,
      include: {
        assignedWorker: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, project_name: true } },
      },
    });
    res.json(addId(task));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Task not found.' });
    next(error);
  }
};

// @desc    Get tasks for Gantt chart
// @route   GET /api/tasks/gantt/:projectId
exports.getGanttTasks = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { project_id: req.params.projectId },
      include: { assignedWorker: { select: { id: true, name: true } } },
      orderBy: { start_date: 'asc' },
    });
    res.json(tasks.map(t => ({
      ...t, _id: t.id,
      assigned_worker: t.assignedWorker ? { ...t.assignedWorker, _id: t.assignedWorker.id } : null,
    })));
  } catch (error) { next(error); }
};
