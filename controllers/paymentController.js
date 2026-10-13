const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getPayments = async (req, res, next) => {
  try {
    const { project_id, type, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    if (project_id) where.project_id = project_id;
    if (type) where.type = type;
    if (status) where.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where, skip, take, include: { project: { select: { id: true, project_name: true } }, creator: { select: { id: true, name: true } } }, orderBy: { date: 'desc' } }),
      prisma.payment.count({ where }),
    ]);
    res.json({ payments: payments.map(p => ({ ...p, _id: p.id, project_id: p.project ? { ...p.project, _id: p.project.id } : p.project_id, created_by: p.creator ? { ...p.creator, _id: p.creator.id } : p.created_by })), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.getPayment = async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { project: { select: { id: true, project_name: true } } } });
    if (!payment) return res.status(404).json({ message: 'Payment not found.' });
    res.json(addId(payment));
  } catch (error) { next(error); }
};

exports.createPayment = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user.userId, company_id: req.user.company_id };
    if (data.date) data.date = new Date(data.date);
    if (data.amount) data.amount = parseFloat(data.amount);
    if (!data.project_id) delete data.project_id;
    delete data._id;
    const payment = await prisma.payment.create({ data });
    // Update project totals
    if (payment.status === 'completed' && payment.project_id) {
      const field = payment.type === 'income' ? 'total_income' : 'total_expenses';
      await prisma.project.update({ where: { id: payment.project_id }, data: { [field]: { increment: payment.amount } } });
    }
    res.status(201).json(addId(payment));
  } catch (error) { next(error); }
};

exports.updatePayment = async (req, res, next) => {
  try {
    const { _id, ...data } = req.body;
    if (data.date) data.date = new Date(data.date);
    const payment = await prisma.payment.update({ where: { id: req.params.id }, data });
    res.json(addId(payment));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Payment not found.' });
    next(error);
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    await prisma.payment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Payment deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Payment not found.' });
    next(error);
  }
};

exports.approvePayment = async (req, res, next) => {
  try {
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: req.body.status || 'completed', approved_by: req.user.userId },
    });
    res.json(addId(payment));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Payment not found.' });
    next(error);
  }
};

exports.getFinanceSummary = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    const [income, expense] = await Promise.all([
      prisma.payment.aggregate({ where: { ...where, type: 'income', status: 'completed' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { ...where, type: 'expense', status: 'completed' }, _sum: { amount: true } }),
    ]);
    res.json({ totalIncome: income._sum.amount || 0, totalExpense: expense._sum.amount || 0, profit: (income._sum.amount || 0) - (expense._sum.amount || 0) });
  } catch (error) { next(error); }
};
