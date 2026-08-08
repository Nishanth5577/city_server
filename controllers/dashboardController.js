const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Worker = require('../models/Worker');
const Expense = require('../models/Expense');
const Material = require('../models/Material');
const Equipment = require('../models/Equipment');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const DailyProgressReport = require('../models/DailyProgressReport');
const AuditLog = require('../models/AuditLog');

// Helper: Calculate project health score
const calcHealthScore = (project) => {
  let score = 100;
  // Progress vs timeline
  if (project.expected_end_date) {
    const totalDays = (new Date(project.expected_end_date) - new Date(project.start_date)) / (1000 * 60 * 60 * 24);
    const elapsed = (Date.now() - new Date(project.start_date)) / (1000 * 60 * 60 * 24);
    const expectedProgress = Math.min(100, (elapsed / totalDays) * 100);
    const progressGap = expectedProgress - (project.progress_percentage || 0);
    if (progressGap > 20) score -= 30;
    else if (progressGap > 10) score -= 15;
    else if (progressGap > 0) score -= 5;
  }
  // Budget overrun
  if (project.budget > 0 && project.total_expenses > project.budget * 0.9) score -= 20;
  else if (project.budget > 0 && project.total_expenses > project.budget * 0.75) score -= 10;
  // Status penalty
  if (project.project_status === 'delayed') score -= 15;
  if (project.project_status === 'on_hold') score -= 10;
  return Math.max(0, Math.min(100, score));
};

// Helper: Determine risk level
const calcRiskLevel = (healthScore) => {
  if (healthScore >= 70) return 'low';
  if (healthScore >= 40) return 'medium';
  return 'high';
};

// @desc    Get owner dashboard — ADVANCED
// @route   GET /api/dashboard/owner
exports.getOwnerDashboard = async (req, res, next) => {
  try {
    const companyId = req.user.company_id ? new mongoose.Types.ObjectId(req.user.company_id) : null;
    const cf = companyId ? { company_id: companyId } : {};

    const [
      allProjects,
      totalExpensesAgg,
      totalIncomeAgg,
      paymentPendingAgg,
      totalWorkers,
      assignedWorkers,
      materialStats,
      equipmentStats,
      recentActivity,
      expenseByCategory,
      monthlyFinance,
    ] = await Promise.all([
      Project.find(cf).select('project_name progress_percentage project_status health_score budget contract_value total_expenses total_income payment_pending risk_level start_date expected_end_date').sort({ updatedAt: -1 }),
      Expense.aggregate([{ $match: { ...cf, approved_status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { ...cf, type: 'income', status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Project.aggregate([{ $match: cf }, { $group: { _id: null, total: { $sum: '$payment_pending' } } }]),
      Worker.countDocuments(cf),
      Worker.countDocuments({ ...cf, availability: 'assigned' }),
      Material.aggregate([{ $match: cf }, { $group: { _id: null, totalStock: { $sum: '$available_stock' }, totalUsed: { $sum: '$used_stock' }, totalValue: { $sum: { $multiply: ['$available_stock', '$cost'] } }, lowStockCount: { $sum: { $cond: [{ $lte: ['$available_stock', '$low_stock_threshold'] }, 1, 0] } } } }]),
      Equipment.aggregate([{ $match: cf }, { $group: { _id: '$availability', count: { $sum: 1 } } }]),
      AuditLog.find().sort({ createdAt: -1 }).limit(15).populate('user_id', 'name'),
      Expense.aggregate([{ $match: { ...cf, approved_status: 'approved' } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }]),
      Payment.aggregate([
        { $match: { ...cf, status: 'completed' } },
        { $group: { _id: { month: { $month: '$date' }, year: { $year: '$date' }, type: '$type' }, total: { $sum: '$amount' } } },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 24 },
      ]),
    ]);

    // Project counts
    const statusCounts = { total: allProjects.length, planning: 0, active: 0, completed: 0, delayed: 0, cancelled: 0, on_hold: 0 };
    const riskCounts = { low: 0, medium: 0, high: 0 };
    allProjects.forEach(p => {
      statusCounts[p.project_status] = (statusCounts[p.project_status] || 0) + 1;
      const health = calcHealthScore(p);
      const risk = calcRiskLevel(health);
      riskCounts[risk]++;
    });

    const totalIncome = totalIncomeAgg[0]?.total || 0;
    const totalExpenses = totalExpensesAgg[0]?.total || 0;
    const totalContractValue = allProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const totalBudget = allProjects.reduce((sum, p) => sum + (p.budget || 0), 0);

    res.json({
      // 1. Project Overview
      projectOverview: statusCounts,
      // 2. Financial Dashboard
      finance: {
        totalContractValue,
        totalBudget,
        totalIncome,
        totalExpenses,
        remainingBudget: totalBudget - totalExpenses,
        profitEstimation: totalIncome - totalExpenses,
        paymentPending: paymentPendingAgg[0]?.total || 0,
      },
      // 3. Resource Analytics
      resources: {
        materials: materialStats[0] || { totalStock: 0, totalUsed: 0, totalValue: 0, lowStockCount: 0 },
        equipment: equipmentStats,
        workers: { total: totalWorkers, assigned: assignedWorkers, available: totalWorkers - assignedWorkers, utilization: totalWorkers > 0 ? Math.round((assignedWorkers / totalWorkers) * 100) : 0 },
      },
      // 4. Project Health
      projectHealth: allProjects.map(p => ({ ...p.toObject(), health_score: calcHealthScore(p), risk_level: calcRiskLevel(calcHealthScore(p)) })),
      // 5. Risk Prediction
      riskPrediction: riskCounts,
      // Charts
      expenseByCategory,
      monthlyFinance,
      recentActivity,
    });
  } catch (error) { next(error); }
};

// @desc    Get manager dashboard
// @route   GET /api/dashboard/manager
exports.getManagerDashboard = async (req, res, next) => {
  try {
    const myProjects = await Project.find({ manager_id: req.user.userId })
      .select('project_name progress_percentage project_status budget contract_value total_expenses expected_end_date risk_level health_score');
    const projectIds = myProjects.map(p => p._id);

    const [taskStats, upcomingDeadlines, recentDPR, workerCount] = await Promise.all([
      Task.aggregate([{ $match: { project_id: { $in: projectIds } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.find({ project_id: { $in: projectIds }, end_date: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, status: { $ne: 'completed' } }).populate('assigned_worker', 'name').sort({ end_date: 1 }).limit(10),
      DailyProgressReport.find({ project_id: { $in: projectIds } }).sort({ date: -1 }).limit(5),
      Worker.countDocuments({ assigned_project: { $in: projectIds } }),
    ]);

    res.json({ projects: myProjects, taskStats, upcomingDeadlines, recentDPR, workerCount });
  } catch (error) { next(error); }
};

// @desc    Get engineer dashboard
// @route   GET /api/dashboard/engineer
exports.getEngineerDashboard = async (req, res, next) => {
  try {
    const [tasks, pendingVerifications] = await Promise.all([
      Task.find({ assigned_worker: req.user.userId }).populate('project_id', 'project_name').sort({ end_date: 1 }).limit(20),
      Task.countDocuments({ assigned_worker: req.user.userId, status: { $ne: 'completed' } }),
    ]);
    res.json({ tasks, pendingVerifications });
  } catch (error) { next(error); }
};

// @desc    Get worker dashboard
// @route   GET /api/dashboard/worker
exports.getWorkerDashboard = async (req, res, next) => {
  try {
    const tasks = await Task.find({ assigned_worker: req.user.userId, status: { $ne: 'completed' } }).populate('project_id', 'project_name').sort({ priority: -1, end_date: 1 });
    const completedTasks = await Task.countDocuments({ assigned_worker: req.user.userId, status: 'completed' });
    const totalTasks = await Task.countDocuments({ assigned_worker: req.user.userId });

    res.json({
      pendingTasks: tasks,
      completedTasks,
      totalTasks,
      productivity: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    });
  } catch (error) { next(error); }
};
