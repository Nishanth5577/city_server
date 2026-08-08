const Worker = require('../models/Worker');

exports.getWorkers = async (req, res, next) => {
  try {
    const { assigned_project, availability, skill, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;
    if (assigned_project) query.assigned_project = assigned_project;
    if (availability) query.availability = availability;
    if (skill) query.skill = { $regex: skill, $options: 'i' };
    if (search) query.name = { $regex: search, $options: 'i' };

    const workers = await Worker.find(query)
      .populate('assigned_project', 'project_name')
      .skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
    const total = await Worker.countDocuments(query);
    res.json({ workers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.getWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id).populate('assigned_project', 'project_name');
    if (!worker) return res.status(404).json({ message: 'Worker not found.' });
    res.json(worker);
  } catch (error) { next(error); }
};

exports.createWorker = async (req, res, next) => {
  try {
    const worker = await Worker.create({ ...req.body, company_id: req.user.company_id });
    res.status(201).json(worker);
  } catch (error) { next(error); }
};

exports.updateWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!worker) return res.status(404).json({ message: 'Worker not found.' });
    res.json(worker);
  } catch (error) { next(error); }
};

exports.deleteWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found.' });
    res.json({ message: 'Worker deleted.' });
  } catch (error) { next(error); }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const { date, status, hours_worked } = req.body;
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found.' });

    const existingIdx = worker.attendance.findIndex(a =>
      new Date(a.date).toDateString() === new Date(date).toDateString()
    );
    if (existingIdx >= 0) {
      worker.attendance[existingIdx] = { date, status, hours_worked: hours_worked || 8 };
    } else {
      worker.attendance.push({ date, status, hours_worked: hours_worked || 8 });
    }
    await worker.save();
    res.json(worker);
  } catch (error) { next(error); }
};

exports.getProductivity = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;

    const workers = await Worker.find(query).select('name skill attendance assigned_project availability');
    const productivity = workers.map(w => {
      const totalDays = w.attendance.length;
      const presentDays = w.attendance.filter(a => a.status === 'present' || a.status === 'half_day').length;
      return {
        _id: w._id,
        name: w.name,
        skill: w.skill,
        availability: w.availability,
        totalDays,
        presentDays,
        attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
      };
    });
    res.json(productivity);
  } catch (error) { next(error); }
};
