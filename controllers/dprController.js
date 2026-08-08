const DailyProgressReport = require('../models/DailyProgressReport');

exports.getDPRs = async (req, res, next) => {
  try {
    const { project_id, start_date, end_date, page = 1, limit = 20 } = req.query;
    const query = {};
    if (project_id) query.project_id = project_id;
    if (start_date || end_date) {
      query.date = {};
      if (start_date) query.date.$gte = new Date(start_date);
      if (end_date) query.date.$lte = new Date(end_date);
    }

    const dprs = await DailyProgressReport.find(query)
      .populate('project_id', 'project_name')
      .populate('created_by', 'name')
      .skip((page - 1) * limit).limit(parseInt(limit)).sort({ date: -1 });
    const total = await DailyProgressReport.countDocuments(query);
    res.json({ dprs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.getDPR = async (req, res, next) => {
  try {
    const dpr = await DailyProgressReport.findById(req.params.id)
      .populate('project_id', 'project_name').populate('created_by', 'name');
    if (!dpr) return res.status(404).json({ message: 'DPR not found.' });
    res.json(dpr);
  } catch (error) { next(error); }
};

exports.createDPR = async (req, res, next) => {
  try {
    const dprData = { ...req.body, created_by: req.user.userId };

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      dprData.images = req.files.map(f => ({
        url: `/uploads/${f.filename}`,
        caption: '',
        type: 'progress',
      }));
    }

    const dpr = await DailyProgressReport.create(dprData);
    const populated = await DailyProgressReport.findById(dpr._id)
      .populate('project_id', 'project_name').populate('created_by', 'name');
    res.status(201).json(populated);
  } catch (error) { next(error); }
};

exports.updateDPR = async (req, res, next) => {
  try {
    const dpr = await DailyProgressReport.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('project_id', 'project_name').populate('created_by', 'name');
    if (!dpr) return res.status(404).json({ message: 'DPR not found.' });
    res.json(dpr);
  } catch (error) { next(error); }
};

exports.deleteDPR = async (req, res, next) => {
  try {
    const dpr = await DailyProgressReport.findByIdAndDelete(req.params.id);
    if (!dpr) return res.status(404).json({ message: 'DPR not found.' });
    res.json({ message: 'DPR deleted.' });
  } catch (error) { next(error); }
};
