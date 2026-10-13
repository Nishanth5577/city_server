const prisma = require('../config/prisma');

// @desc    Predict project delay risk
// @route   GET /api/ai/delay-prediction/:projectId
exports.predictDelay = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const tasks = await prisma.task.findMany({ where: { project_id: project.id } });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => t.end_date && new Date(t.end_date) < new Date() && t.status !== 'completed').length;

    const now = new Date();
    const start = new Date(project.start_date || project.createdAt);
    const end = new Date(project.expected_end_date || now);
    const totalDuration = end - start;
    const elapsed = now - start;
    const timeProgress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
    const actualProgress = project.progress_percentage;

    let riskScore = 0;
    const riskFactors = [];

    if (timeProgress > actualProgress + 20) {
      riskScore += 30;
      riskFactors.push({ factor: 'Progress behind schedule', severity: 'high', detail: `Time: ${Math.round(timeProgress)}% elapsed, Progress: ${actualProgress}%` });
    } else if (timeProgress > actualProgress + 10) {
      riskScore += 15;
      riskFactors.push({ factor: 'Slightly behind schedule', severity: 'medium', detail: `Time: ${Math.round(timeProgress)}% elapsed, Progress: ${actualProgress}%` });
    }

    if (overdueTasks > 0) {
      const overdueRatio = overdueTasks / Math.max(totalTasks, 1);
      riskScore += Math.min(overdueRatio * 50, 30);
      riskFactors.push({ factor: 'Overdue tasks', severity: overdueRatio > 0.3 ? 'high' : 'medium', detail: `${overdueTasks} of ${totalTasks} tasks overdue` });
    }

    const expAgg = await prisma.expense.aggregate({ where: { project_id: project.id, approved_status: 'approved' }, _sum: { amount: true } });
    const totalExpense = expAgg._sum.amount || 0;
    if (project.budget > 0 && totalExpense > project.budget * 0.9) {
      riskScore += 20;
      riskFactors.push({ factor: 'Budget near/over limit', severity: 'high', detail: `₹${totalExpense.toLocaleString()} / ₹${project.budget.toLocaleString()}` });
    }

    const allMats = await prisma.material.findMany({ where: { project_id: project.id }, select: { available_stock: true, low_stock_threshold: true, material_name: true } });
    const lowStock = allMats.filter(m => m.available_stock <= m.low_stock_threshold).length;
    if (lowStock > 0) {
      riskScore += 10;
      riskFactors.push({ factor: 'Material shortage', severity: 'medium', detail: `${lowStock} materials below threshold` });
    }

    const riskLevel = riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';
    const predictedDelay = riskScore >= 50 ? Math.ceil((timeProgress - actualProgress) * totalDuration / 100 / (1000 * 60 * 60 * 24)) : 0;

    res.json({
      project: project.project_name, riskScore: Math.min(riskScore, 100), riskLevel,
      predictedDelayDays: Math.max(predictedDelay, 0), riskFactors,
      recommendations: generateRecommendations(riskFactors),
    });
  } catch (error) { next(error); }
};

// @desc    Resource recommendation
// @route   GET /api/ai/resource-recommendation/:projectId
exports.recommendResources = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const tasks = await prisma.task.findMany({ where: { project_id: project.id, status: { in: ['pending', 'in_progress'] } } });
    const workers = await prisma.worker.findMany({ where: { assigned_project_id: project.id } });
    const materials = await prisma.material.findMany({ where: { project_id: project.id } });

    const recommendations = [];
    const pendingHighPriority = tasks.filter(t => t.priority === 'critical' || t.priority === 'high');
    const unassignedTasks = tasks.filter(t => !t.assigned_worker_id);

    if (unassignedTasks.length > 0) {
      recommendations.push({ type: 'worker', priority: 'high', message: `${unassignedTasks.length} tasks need worker assignment`, suggestion: 'Assign workers to pending tasks to prevent delays' });
    }
    if (pendingHighPriority.length > workers.length) {
      recommendations.push({ type: 'worker', priority: 'medium', message: `${pendingHighPriority.length} high-priority tasks but only ${workers.length} workers assigned`, suggestion: 'Consider adding more workers' });
    }
    materials.filter(m => m.available_stock <= m.low_stock_threshold).forEach(m => {
      recommendations.push({ type: 'material', priority: 'high', message: `${m.material_name} stock is low (${m.available_stock} ${m.unit})`, suggestion: `Order at least ${m.low_stock_threshold * 2} ${m.unit}` });
    });

    res.json({ project: project.project_name, recommendations });
  } catch (error) { next(error); }
};

// @desc    Cost prediction
// @route   GET /api/ai/cost-prediction/:projectId
exports.predictCost = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const expenses = await prisma.expense.findMany({ where: { project_id: project.id, approved_status: 'approved' } });
    const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
    const progress = project.progress_percentage || 1;
    const projectedTotal = progress > 0 ? Math.round((totalExpense / progress) * 100) : 0;
    const overrun = projectedTotal - project.budget;
    const overrunPercentage = project.budget > 0 ? Math.round((overrun / project.budget) * 100) : 0;
    const byCategory = {};
    expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

    res.json({
      project: project.project_name, budget: project.budget, currentSpend: totalExpense, progress,
      projectedTotal, projectedOverrun: Math.max(overrun, 0), overrunPercentage: Math.max(overrunPercentage, 0),
      isOverBudget: overrun > 0, spendByCategory: byCategory,
      recommendation: overrun > 0 ? `Project projected to exceed budget by ₹${overrun.toLocaleString()}.` : 'Project is within budget.',
    });
  } catch (error) { next(error); }
};

function generateRecommendations(riskFactors) {
  const recs = [];
  riskFactors.forEach(rf => {
    if (rf.factor.includes('behind schedule')) { recs.push('Increase workforce or extend working hours'); recs.push('Review and re-prioritize pending tasks'); }
    if (rf.factor.includes('Overdue')) { recs.push('Assign additional resources to overdue tasks'); }
    if (rf.factor.includes('Budget')) { recs.push('Review and optimize material procurement'); }
    if (rf.factor.includes('shortage')) { recs.push('Place immediate material orders'); }
  });
  return [...new Set(recs)];
}
