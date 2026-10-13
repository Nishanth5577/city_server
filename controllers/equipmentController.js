const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getEquipment = async (req, res, next) => {
  try {
    const { availability, type, search, page = 1, limit = 50 } = req.query;
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    if (availability) where.availability = availability;
    if (type) where.type = type;
    if (search) where.equipment_name = { contains: search, mode: 'insensitive' };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [equipment, total] = await Promise.all([
      prisma.equipment.findMany({ where, skip, take, include: { assigned_project: { select: { id: true, project_name: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.equipment.count({ where }),
    ]);
    res.json({ equipment: equipment.map(e => ({ ...e, _id: e.id, assigned_project: e.assigned_project ? { ...e.assigned_project, _id: e.assigned_project.id } : null })), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.getEquipmentById = async (req, res, next) => {
  try {
    const eq = await prisma.equipment.findUnique({ where: { id: req.params.id }, include: { assigned_project: { select: { id: true, project_name: true } } } });
    if (!eq) return res.status(404).json({ message: 'Equipment not found.' });
    res.json(addId(eq));
  } catch (error) { next(error); }
};

exports.createEquipment = async (req, res, next) => {
  try {
    const { assigned_project, ...data } = req.body;
    data.company_id = req.user.company_id;
    if (assigned_project) data.assigned_project_id = assigned_project;
    if (data.purchase_date) data.purchase_date = new Date(data.purchase_date);
    if (data.maintenance_date) data.maintenance_date = new Date(data.maintenance_date);
    if (data.next_maintenance) data.next_maintenance = new Date(data.next_maintenance);
    delete data._id;
    const eq = await prisma.equipment.create({ data });
    res.status(201).json(addId(eq));
  } catch (error) { next(error); }
};

exports.updateEquipment = async (req, res, next) => {
  try {
    const { _id, assigned_project, ...data } = req.body;
    if (assigned_project) data.assigned_project_id = assigned_project;
    if (data.purchase_date) data.purchase_date = new Date(data.purchase_date);
    if (data.next_maintenance) data.next_maintenance = new Date(data.next_maintenance);
    const eq = await prisma.equipment.update({ where: { id: req.params.id }, data });
    res.json(addId(eq));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Equipment not found.' });
    next(error);
  }
};

exports.deleteEquipment = async (req, res, next) => {
  try {
    await prisma.equipment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Equipment deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Equipment not found.' });
    next(error);
  }
};

exports.getMaintenanceDue = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    where.next_maintenance = { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
    const equipment = await prisma.equipment.findMany({ where, orderBy: { next_maintenance: 'asc' } });
    res.json(equipment.map(e => ({ ...e, _id: e.id })));
  } catch (error) { next(error); }
};
