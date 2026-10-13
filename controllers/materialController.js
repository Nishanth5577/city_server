const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getMaterials = async (req, res, next) => {
  try {
    const { project_id, category, search, page = 1, limit = 50 } = req.query;
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    if (project_id) where.project_id = project_id;
    if (category) where.category = category;
    if (search) where.material_name = { contains: search, mode: 'insensitive' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [materials, total] = await Promise.all([
      prisma.material.findMany({ where, skip, take, include: { project: { select: { id: true, project_name: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.material.count({ where }),
    ]);
    res.json({ materials: materials.map(m => ({ ...m, _id: m.id, project_id: m.project ? { ...m.project, _id: m.project.id } : m.project_id })), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.getMaterial = async (req, res, next) => {
  try {
    const material = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!material) return res.status(404).json({ message: 'Material not found.' });
    res.json(addId(material));
  } catch (error) { next(error); }
};

exports.createMaterial = async (req, res, next) => {
  try {
    const data = { ...req.body, company_id: req.user.company_id };
    delete data._id;
    const material = await prisma.material.create({ data });
    res.status(201).json(addId(material));
  } catch (error) { next(error); }
};

exports.updateMaterial = async (req, res, next) => {
  try {
    const { _id, ...data } = req.body;
    const material = await prisma.material.update({ where: { id: req.params.id }, data });
    res.json(addId(material));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Material not found.' });
    next(error);
  }
};

exports.deleteMaterial = async (req, res, next) => {
  try {
    await prisma.material.delete({ where: { id: req.params.id } });
    res.json({ message: 'Material deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Material not found.' });
    next(error);
  }
};

exports.addTransaction = async (req, res, next) => {
  try {
    const material = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!material) return res.status(404).json({ message: 'Material not found.' });
    const txns = Array.isArray(material.transactions) ? material.transactions : [];
    txns.push({ ...req.body, date: new Date(), created_by: req.user.userId });

    const updates = { transactions: txns };
    if (req.body.type === 'purchase') {
      updates.available_stock = material.available_stock + (req.body.quantity || 0);
      updates.total_purchased = material.total_purchased + (req.body.quantity || 0);
    } else if (req.body.type === 'issue') {
      updates.available_stock = material.available_stock - (req.body.quantity || 0);
      updates.used_stock = material.used_stock + (req.body.quantity || 0);
      updates.total_issued = material.total_issued + (req.body.quantity || 0);
    } else if (req.body.type === 'return') {
      updates.available_stock = material.available_stock + (req.body.quantity || 0);
      updates.used_stock = material.used_stock - (req.body.quantity || 0);
      updates.total_returned = material.total_returned + (req.body.quantity || 0);
    }
    const updated = await prisma.material.update({ where: { id: req.params.id }, data: updates });
    res.json(addId(updated));
  } catch (error) { next(error); }
};

exports.useStock = async (req, res, next) => {
  try {
    const material = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!material) return res.status(404).json({ message: 'Material not found.' });
    const { quantity, issued_to } = req.body;
    const updates = { available_stock: material.available_stock - quantity, used_stock: material.used_stock + quantity, total_issued: material.total_issued + quantity };
    const txns = Array.isArray(material.transactions) ? material.transactions : [];
    txns.push({ type: 'issue', quantity, issued_to, date: new Date(), created_by: req.user.userId });
    updates.transactions = txns;
    const updated = await prisma.material.update({ where: { id: req.params.id }, data: updates });
    res.json({ ...updated, _id: updated.id });
  } catch (error) { next(error); }
};

exports.getLowStockAlerts = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    const materials = await prisma.material.findMany({ where, include: { project: { select: { id: true, project_name: true } } } });
    const lowStock = materials.filter(m => m.available_stock <= m.low_stock_threshold);
    res.json(lowStock.map(m => ({ ...m, _id: m.id })));
  } catch (error) { next(error); }
};
