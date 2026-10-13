const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getExpenses = async (req, res, next) => {
  try {
    const { project_id, category, approved_status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    if (project_id) where.project_id = project_id;
    if (category) where.category = category;
    if (approved_status) where.approved_status = approved_status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({ where, skip, take, include: { project: { select: { id: true, project_name: true } }, creator: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } } }, orderBy: { date: 'desc' } }),
      prisma.expense.count({ where }),
    ]);
    res.json({ expenses: expenses.map(e => ({ ...e, _id: e.id, project_id: e.project ? { ...e.project, _id: e.project.id } : e.project_id, created_by: e.creator ? { ...e.creator, _id: e.creator.id } : e.created_by, approved_by: e.approver ? { ...e.approver, _id: e.approver.id } : e.approved_by })), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.getExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: req.params.id }, include: { project: { select: { id: true, project_name: true } }, creator: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } } } });
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });
    res.json(addId(expense));
  } catch (error) { next(error); }
};

exports.createExpense = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user.userId, company_id: req.user.company_id };
    if (data.date) data.date = new Date(data.date);
    delete data._id;
    const expense = await prisma.expense.create({ data });
    res.status(201).json(addId(expense));
  } catch (error) { next(error); }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const { _id, ...data } = req.body;
    if (data.date) data.date = new Date(data.date);
    const expense = await prisma.expense.update({ where: { id: req.params.id }, data });
    res.json(addId(expense));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Expense not found.' });
    next(error);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Expense not found.' });
    next(error);
  }
};

exports.approveExpense = async (req, res, next) => {
  try {
    const { status } = req.body;
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: { approved_status: status || 'approved', approved_by: req.user.userId },
    });
    res.json(addId(expense));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Expense not found.' });
    next(error);
  }
};
