const Expense = require('../models/Expense');
const { sendExpenseApprovalEmail } = require('../services/emailService');
const User = require('../models/User');

exports.getExpenses = async (req, res, next) => {
  try {
    const { project_id, category, approved_status, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;
    if (project_id) query.project_id = project_id;
    if (category) query.category = category;
    if (approved_status) query.approved_status = approved_status;
    if (search) query.description = { $regex: search, $options: 'i' };

    const expenses = await Expense.find(query)
      .populate('project_id', 'project_name')
      .populate('created_by', 'name')
      .populate('approved_by', 'name')
      .skip((page - 1) * limit).limit(parseInt(limit)).sort({ date: -1 });
    const total = await Expense.countDocuments(query);

    // Budget stats
    const stats = await Expense.aggregate([
      { $match: query },
      { $group: {
        _id: '$approved_status',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      }},
    ]);

    res.json({ expenses, total, page: parseInt(page), pages: Math.ceil(total / limit), stats });
  } catch (error) { next(error); }
};

exports.createExpense = async (req, res, next) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      created_by: req.user.userId,
      company_id: req.user.company_id,
    });
    const populated = await Expense.findById(expense._id)
      .populate('project_id', 'project_name').populate('created_by', 'name');
    res.status(201).json(populated);
  } catch (error) { next(error); }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('project_id', 'project_name').populate('created_by', 'name');
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });
    res.json(expense);
  } catch (error) { next(error); }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });
    res.json({ message: 'Expense deleted.' });
  } catch (error) { next(error); }
};

exports.approveExpense = async (req, res, next) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { approved_status: status, approved_by: req.user.userId },
      { new: true }
    ).populate('project_id', 'project_name').populate('created_by', 'name email');

    if (!expense) return res.status(404).json({ message: 'Expense not found.' });

    // Send email to creator
    if (expense.created_by?.email) {
      await sendExpenseApprovalEmail(
        expense.created_by.email,
        status,
        expense.amount,
        expense.project_id?.project_name || ''
      );
    }

    res.json(expense);
  } catch (error) { next(error); }
};
