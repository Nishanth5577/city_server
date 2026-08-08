const Project = require('../models/Project');
const Task = require('../models/Task');
const CalendarEvent = require('../models/CalendarEvent');

exports.getCalendarEvents = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const dateFilter = {};
    if (start) dateFilter.$gte = new Date(start);
    if (end) dateFilter.$lte = new Date(end);

    const companyFilter = req.user.company_id ? { company_id: req.user.company_id } : {};

    // Project deadlines
    const projectQuery = { ...companyFilter };
    if (Object.keys(dateFilter).length) projectQuery.expected_end_date = dateFilter;
    const projects = await Project.find(projectQuery).select('project_name expected_end_date start_date project_status');

    // Task dates
    const taskQuery = {};
    if (Object.keys(dateFilter).length) {
      taskQuery.$or = [{ start_date: dateFilter }, { end_date: dateFilter }];
    }
    const tasks = await Task.find(taskQuery)
      .populate('project_id', 'project_name')
      .populate('assigned_worker', 'name')
      .select('task_name start_date end_date status priority project_id assigned_worker');

    // Custom calendar events
    const customQuery = { ...companyFilter };
    if (Object.keys(dateFilter).length) customQuery.start = dateFilter;
    const customEvents = await CalendarEvent.find(customQuery)
      .populate('project_id', 'project_name')
      .populate('created_by', 'name');

    const events = [];

    projects.forEach(p => {
      if (p.start_date) {
        events.push({ id: `proj-start-${p._id}`, title: `${p.project_name} - Start`, start: p.start_date, end: p.start_date, type: 'project_start', color: '#3b82f6', editable: false });
      }
      if (p.expected_end_date) {
        events.push({ id: `proj-end-${p._id}`, title: `${p.project_name} - Deadline`, start: p.expected_end_date, end: p.expected_end_date, type: 'project_deadline', color: p.project_status === 'delayed' ? '#ef4444' : '#f59e0b', editable: false });
      }
    });

    tasks.forEach(t => {
      events.push({
        id: `task-${t._id}`, title: `${t.task_name}${t.assigned_worker ? ` (${t.assigned_worker.name})` : ''}`,
        start: t.start_date || t.createdAt, end: t.end_date || t.start_date, type: 'task',
        color: t.priority === 'critical' ? '#ef4444' : t.priority === 'high' ? '#f97316' : '#10b981',
        meta: { project: t.project_id?.project_name, status: t.status, priority: t.priority }, editable: false,
      });
    });

    customEvents.forEach(e => {
      events.push({
        id: e._id, title: e.title, start: e.start, end: e.end || e.start, type: e.type,
        color: e.color, description: e.description, editable: true,
        meta: { project: e.project_id?.project_name, created_by: e.created_by?.name },
      });
    });

    res.json(events);
  } catch (error) { next(error); }
};

exports.createEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.create({ ...req.body, created_by: req.user.userId, company_id: req.user.company_id });
    res.status(201).json(event);
  } catch (error) { next(error); }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) { next(error); }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (error) { next(error); }
};
