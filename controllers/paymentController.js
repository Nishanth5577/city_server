const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Project = require('../models/Project');

// @desc    Get all payments
// @route   GET /api/payments
exports.getPayments = async (req, res, next) => {
  try {
    const companyFilter = req.user.company_id ? { company_id: req.user.company_id } : {};
    const { type, project_id, page = 1, limit = 20 } = req.query;
    const filter = { ...companyFilter };
    if (type) filter.type = type;
    if (project_id) filter.project_id = project_id;

    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('project_id', 'project_name project_id')
      .populate('supplier_id', 'company_name')
      .populate('created_by', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ payments, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

// @desc    Get finance summary
// @route   GET /api/payments/summary
exports.getFinanceSummary = async (req, res, next) => {
  try {
    const companyFilter = req.user.company_id ? { company_id: new mongoose.Types.ObjectId(req.user.company_id) } : {};
    const { project_id } = req.query;
    const filter = { ...companyFilter };
    if (project_id) filter.project_id = project_id;

    const [income, expense, byCategory] = await Promise.all([
      Payment.aggregate([
        { $match: { ...filter, type: 'income', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { ...filter, type: 'expense', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { ...filter, status: 'completed' } },
        { $group: { _id: { type: '$type', category: '$category' }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const totalIncome = income[0]?.total || 0;
    const totalExpense = expense[0]?.total || 0;

    res.json({
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
      byCategory,
    });
  } catch (error) { next(error); }
};

// @desc    Create payment
// @route   POST /api/payments
exports.createPayment = async (req, res, next) => {
  try {
    const payment = await Payment.create({
      ...req.body,
      created_by: req.user.userId,
      company_id: req.user.company_id,
    });

    // Update project totals
    if (payment.status === 'completed') {
      const updateField = payment.type === 'income' ? 'total_income' : 'total_expenses';
      await Project.findByIdAndUpdate(payment.project_id, {
        $inc: { [updateField]: payment.amount },
      });
    }

    res.status(201).json(payment);
  } catch (error) { next(error); }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
exports.updatePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (error) { next(error); }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Reverse project totals
    if (payment.status === 'completed') {
      const updateField = payment.type === 'income' ? 'total_income' : 'total_expenses';
      await Project.findByIdAndUpdate(payment.project_id, {
        $inc: { [updateField]: -payment.amount },
      });
    }

    await payment.deleteOne();
    res.json({ message: 'Payment deleted' });
  } catch (error) { next(error); }
};
