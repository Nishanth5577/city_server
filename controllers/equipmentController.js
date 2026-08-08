const Equipment = require('../models/Equipment');

exports.getEquipment = async (req, res, next) => {
  try {
    const { assigned_project, availability, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;
    if (assigned_project) query.assigned_project = assigned_project;
    if (availability) query.availability = availability;
    if (search) query.equipment_name = { $regex: search, $options: 'i' };

    const equipment = await Equipment.find(query)
      .populate('assigned_project', 'project_name')
      .skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
    const total = await Equipment.countDocuments(query);
    res.json({ equipment, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.createEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.create({ ...req.body, company_id: req.user.company_id });
    res.status(201).json(equipment);
  } catch (error) { next(error); }
};

exports.updateEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assigned_project', 'project_name');
    if (!equipment) return res.status(404).json({ message: 'Equipment not found.' });
    res.json(equipment);
  } catch (error) { next(error); }
};

exports.deleteEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found.' });
    res.json({ message: 'Equipment deleted.' });
  } catch (error) { next(error); }
};

exports.getMaintenanceDue = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;
    query.maintenance_date = { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };

    const equipment = await Equipment.find(query).populate('assigned_project', 'project_name');
    res.json(equipment);
  } catch (error) { next(error); }
};
