const prisma = require('../config/prisma');

// Helper: Calculate project health score
const calcHealthScore = (project) => {
  let score = 100;
  if (project.expected_end_date) {
    const totalDays = (new Date(project.expected_end_date) - new Date(project.start_date)) / (1000 * 60 * 60 * 24);
    const elapsed = (Date.now() - new Date(project.start_date)) / (1000 * 60 * 60 * 24);
    const expectedProgress = Math.min(100, (elapsed / totalDays) * 100);
    const progressGap = expectedProgress - (project.progress_percentage || 0);
    if (progressGap > 20) score -= 30;
    else if (progressGap > 10) score -= 15;
    else if (progressGap > 0) score -= 5;
  }
  if (project.budget > 0 && project.total_expenses > project.budget * 0.9) score -= 20;
  else if (project.budget > 0 && project.total_expenses > project.budget * 0.75) score -= 10;
  if (project.project_status === 'delayed') score -= 15;
  if (project.project_status === 'on_hold') score -= 10;
  return Math.max(0, Math.min(100, score));
};

const calcRiskLevel = (healthScore) => {
  if (healthScore >= 70) return 'low';
  if (healthScore >= 40) return 'medium';
  return 'high';
};

// @desc    Get owner dashboard — ADVANCED
// @route   GET /api/dashboard/owner
exports.getOwnerDashboard = async (req, res, next) => {
  try {
    const companyId = req.user.company_id || null;
    const cf = companyId ? { company_id: companyId } : {};

    const [
      allProjects,
      totalExpensesAgg,
      totalIncomeAgg,
      paymentPendingAgg,
      totalWorkers,
      assignedWorkers,
      recentActivity,
    ] = await Promise.all([
      prisma.project.findMany({ where: cf, orderBy: { updatedAt: 'desc' } }),
      prisma.expense.aggregate({ where: { ...cf, approved_status: 'approved' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { ...cf, type: 'income', status: 'completed' }, _sum: { amount: true } }),
      prisma.project.aggregate({ where: cf, _sum: { payment_pending: true } }),
      prisma.worker.count({ where: cf }),
      prisma.worker.count({ where: { ...cf, availability: 'assigned' } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 15, include: { user: { select: { id: true, name: true } } } }),
    ]);

    // Material stats via raw aggregate
    const materialStats = await prisma.material.aggregate({
      where: cf,
      _sum: { available_stock: true, used_stock: true },
    });

    // Low stock count
    const allMats = await prisma.material.findMany({ where: cf, select: { available_stock: true, low_stock_threshold: true, cost: true } });
    const lowStockCount = allMats.filter(m => m.available_stock <= m.low_stock_threshold).length;
    const totalMaterialValue = allMats.reduce((s, m) => s + (m.available_stock * m.cost), 0);

    // Equipment by availability
    const equipmentRaw = await prisma.equipment.groupBy({ by: ['availability'], where: cf, _count: true });
    const equipmentStats = equipmentRaw.map(e => ({ _id: e.availability, count: e._count }));

    // Expense by category
    const expByCatRaw = await prisma.expense.groupBy({ by: ['category'], where: { ...cf, approved_status: 'approved' }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } });
    const expenseByCategory = expByCatRaw.map(e => ({ _id: e.category, total: e._sum.amount || 0 }));

    // Project counts
    const statusCounts = { total: allProjects.length, planning: 0, active: 0, completed: 0, delayed: 0, cancelled: 0, on_hold: 0 };
    const riskCounts = { low: 0, medium: 0, high: 0 };
    allProjects.forEach(p => {
      statusCounts[p.project_status] = (statusCounts[p.project_status] || 0) + 1;
      const health = calcHealthScore(p);
      riskCounts[calcRiskLevel(health)]++;
    });

    const totalIncome = totalIncomeAgg._sum.amount || 0;
    const totalExpenses = totalExpensesAgg._sum.amount || 0;
    const totalContractValue = allProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const totalBudget = allProjects.reduce((sum, p) => sum + (p.budget || 0), 0);

    res.json({
      projectOverview: statusCounts,
      finance: {
        totalContractValue, totalBudget, totalIncome, totalExpenses,
        remainingBudget: totalBudget - totalExpenses,
        profitEstimation: totalIncome - totalExpenses,
        paymentPending: paymentPendingAgg._sum.payment_pending || 0,
      },
      resources: {
        materials: { totalStock: materialStats._sum.available_stock || 0, totalUsed: materialStats._sum.used_stock || 0, totalValue: totalMaterialValue, lowStockCount },
        equipment: equipmentStats,
        workers: { total: totalWorkers, assigned: assignedWorkers, available: totalWorkers - assignedWorkers, utilization: totalWorkers > 0 ? Math.round((assignedWorkers / totalWorkers) * 100) : 0 },
      },
      projectHealth: allProjects.map(p => ({ ...p, _id: p.id, health_score: calcHealthScore(p), risk_level: calcRiskLevel(calcHealthScore(p)) })),
      riskPrediction: riskCounts,
      expenseByCategory,
      monthlyFinance: [],
      recentActivity: recentActivity.map(a => ({ ...a, _id: a.id, user_id: a.user ? { ...a.user, _id: a.user.id } : null })),
    });
  } catch (error) { next(error); }
};

// @desc    Get manager dashboard
// @route   GET /api/dashboard/manager
exports.getManagerDashboard = async (req, res, next) => {
  try {
    const myProjects = await prisma.project.findMany({
      where: { manager_id: req.user.userId },
      select: { id: true, project_name: true, progress_percentage: true, project_status: true, budget: true, contract_value: true, total_expenses: true, expected_end_date: true, risk_level: true, health_score: true },
    });
    const projectIds = myProjects.map(p => p.id);

    const [tasks, upcomingTasks, recentDPR, workerCount] = await Promise.all([
      prisma.task.groupBy({ by: ['status'], where: { project_id: { in: projectIds } }, _count: true }),
      prisma.task.findMany({
        where: { project_id: { in: projectIds }, end_date: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, status: { not: 'completed' } },
        include: { assignedWorker: { select: { id: true, name: true } } },
        orderBy: { end_date: 'asc' }, take: 10,
      }),
      prisma.dailyProgressReport.findMany({ where: { project_id: { in: projectIds } }, orderBy: { date: 'desc' }, take: 5 }),
      prisma.worker.count({ where: { assigned_project_id: { in: projectIds } } }),
    ]);

    const taskStats = tasks.map(t => ({ _id: t.status, count: t._count }));

    res.json({
      projects: myProjects.map(p => ({ ...p, _id: p.id })),
      taskStats,
      upcomingDeadlines: upcomingTasks.map(t => ({ ...t, _id: t.id, assigned_worker: t.assignedWorker })),
      recentDPR: recentDPR.map(r => ({ ...r, _id: r.id })),
      workerCount,
    });
  } catch (error) { next(error); }
};

// @desc    Get engineer dashboard
// @route   GET /api/dashboard/engineer
exports.getEngineerDashboard = async (req, res, next) => {
  try {
    const [tasks, pendingVerifications] = await Promise.all([
      prisma.task.findMany({
        where: { assigned_worker_id: req.user.userId },
        include: { project: { select: { id: true, project_name: true } } },
        orderBy: { end_date: 'asc' }, take: 20,
      }),
      prisma.task.count({ where: { assigned_worker_id: req.user.userId, status: { not: 'completed' } } }),
    ]);
    res.json({
      tasks: tasks.map(t => ({ ...t, _id: t.id, project_id: t.project ? { ...t.project, _id: t.project.id } : t.project_id })),
      pendingVerifications,
    });
  } catch (error) { next(error); }
};

// @desc    Get worker dashboard
// @route   GET /api/dashboard/worker
exports.getWorkerDashboard = async (req, res, next) => {
  try {
    const [tasks, completedTasks, totalTasks] = await Promise.all([
      prisma.task.findMany({
        where: { assigned_worker_id: req.user.userId, status: { not: 'completed' } },
        include: { project: { select: { id: true, project_name: true } } },
        orderBy: [{ priority: 'desc' }, { end_date: 'asc' }],
      }),
      prisma.task.count({ where: { assigned_worker_id: req.user.userId, status: 'completed' } }),
      prisma.task.count({ where: { assigned_worker_id: req.user.userId } }),
    ]);

    res.json({
      pendingTasks: tasks.map(t => ({ ...t, _id: t.id, project_id: t.project ? { ...t.project, _id: t.project.id } : t.project_id })),
      completedTasks,
      totalTasks,
      productivity: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    });
  } catch (error) { next(error); }
};
