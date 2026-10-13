const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getCalendarEvents = async (req, res, next) => {
  try {
    const { start, end, project_id } = req.query;
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    if (project_id) where.project_id = project_id;
    if (start && end) where.start = { gte: new Date(start), lte: new Date(end) };
    const events = await prisma.calendarEvent.findMany({ where, orderBy: { start: 'asc' } });
    res.json(events.map(addId));
  } catch (error) { next(error); }
};

exports.createCalendarEvent = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user.userId, company_id: req.user.company_id };
    if (data.start) data.start = new Date(data.start);
    if (data.end) data.end = new Date(data.end);
    delete data._id;
    const event = await prisma.calendarEvent.create({ data });
    res.status(201).json(addId(event));
  } catch (error) { next(error); }
};

exports.updateCalendarEvent = async (req, res, next) => {
  try {
    const { _id, ...data } = req.body;
    if (data.start) data.start = new Date(data.start);
    if (data.end) data.end = new Date(data.end);
    const event = await prisma.calendarEvent.update({ where: { id: req.params.id }, data });
    res.json(addId(event));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Event not found.' });
    next(error);
  }
};

exports.deleteCalendarEvent = async (req, res, next) => {
  try {
    await prisma.calendarEvent.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Event not found.' });
    next(error);
  }
};

exports.createEvent = exports.createCalendarEvent;
exports.updateEvent = exports.updateCalendarEvent;
exports.deleteEvent = exports.deleteCalendarEvent;
