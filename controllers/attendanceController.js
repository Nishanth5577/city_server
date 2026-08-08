const Attendance = require('../models/Attendance');
const Worker = require('../models/Worker');

// @desc    Get attendance records
// @route   GET /api/attendance
exports.getAttendance = async (req, res, next) => {
  try {
    const companyFilter = req.user.company_id ? { company_id: req.user.company_id } : {};
    const { worker_id, project_id, date, month, year, page = 1, limit = 50 } = req.query;
    const filter = { ...companyFilter };
    if (worker_id) filter.worker_id = worker_id;
    if (project_id) filter.project_id = project_id;
    if (date) {
      const d = new Date(date);
      filter.date = { $gte: new Date(d.setHours(0,0,0,0)), $lt: new Date(d.setHours(23,59,59,999)) };
    }
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }

    const total = await Attendance.countDocuments(filter);
    const records = await Attendance.find(filter)
      .populate('worker_id', 'name skill worker_id')
      .populate('project_id', 'project_name project_id')
      .populate('marked_by', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ records, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

// @desc    Mark attendance (bulk)
// @route   POST /api/attendance/bulk
exports.markBulkAttendance = async (req, res, next) => {
  try {
    const { records, project_id, date } = req.body;
    if (!records || !records.length) return res.status(400).json({ message: 'No records provided' });

    const operations = records.map(record => ({
      updateOne: {
        filter: { worker_id: record.worker_id, date: new Date(date) },
        update: {
          $set: {
            project_id,
            status: record.status || 'present',
            check_in: record.check_in || '',
            check_out: record.check_out || '',
            hours_worked: record.hours_worked || 8,
            overtime_hours: record.overtime_hours || 0,
            daily_wage: record.daily_wage || 0,
            notes: record.notes || '',
            marked_by: req.user.userId,
            company_id: req.user.company_id,
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(operations);

    // Update worker totals
    for (const record of records) {
      if (record.status === 'present' || record.status === 'overtime') {
        await Worker.findByIdAndUpdate(record.worker_id, {
          $inc: {
            total_days_present: 1,
            total_overtime_hours: record.overtime_hours || 0,
            total_earnings: record.daily_wage || 0,
          },
        });
      }
    }

    res.json({ message: `${records.length} attendance records saved` });
  } catch (error) { next(error); }
};

// @desc    Mark single attendance
// @route   POST /api/attendance
exports.markAttendance = async (req, res, next) => {
  try {
    const data = {
      ...req.body,
      date: new Date(req.body.date),
      marked_by: req.user.userId,
      company_id: req.user.company_id,
    };

    const record = await Attendance.findOneAndUpdate(
      { worker_id: data.worker_id, date: data.date },
      data,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json(record);
  } catch (error) { next(error); }
};

// @desc    Get attendance summary for a worker
// @route   GET /api/attendance/summary/:workerId
exports.getWorkerAttendanceSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const filter = { worker_id: req.params.workerId };
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }

    const stats = await Attendance.aggregate([
      { $match: filter },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        total_hours: { $sum: '$hours_worked' },
        total_overtime: { $sum: '$overtime_hours' },
        total_wage: { $sum: '$daily_wage' },
      }},
    ]);

    const calendar = await Attendance.find(filter)
      .select('date status hours_worked overtime_hours daily_wage')
      .sort({ date: 1 });

    res.json({ stats, calendar });
  } catch (error) { next(error); }
};
