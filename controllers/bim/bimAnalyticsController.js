const prisma = require('../../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

// GET /api/bim/analytics — BIM project analytics dashboard
exports.getAnalytics = async (req, res, next) => {
  try {
    const company_id = req.user.company_id;
    const where = company_id ? { company_id } : {};

    const [totalProjects, activeProjects, completedProjects, totalMaterials, costEstimations, recentProjects] = await Promise.all([
      prisma.bIMProject.count({ where }),
      prisma.bIMProject.count({ where: { ...where, status: 'active' } }),
      prisma.bIMProject.count({ where: { ...where, status: 'completed' } }),
      prisma.buildingMaterial.count(),
      prisma.costEstimation.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
      prisma.bIMProject.findMany({ where, take: 5, orderBy: { updatedAt: 'desc' }, select: { id: true, design_name: true, status: true, description: true, updatedAt: true } }),
    ]);

    // Calculate total estimated cost
    const totalEstimatedCost = costEstimations.reduce((sum, e) => sum + (e.total_cost || 0), 0);

    // Material category distribution
    const materialsByCategory = await prisma.buildingMaterial.groupBy({ by: ['category'], _count: { id: true } });
    const materialDistribution = materialsByCategory.map(m => ({ category: m.category, count: m._count.id }));

    // Project status distribution
    const projectsByStatus = await prisma.bIMProject.groupBy({ by: ['status'], where, _count: { id: true } });
    const projectTypeDistribution = projectsByStatus.map(p => ({ type: p.status || 'draft', count: p._count.id }));


    res.json({
      overview: {
        totalProjects,
        activeProjects,
        completedProjects,
        draftProjects: totalProjects - activeProjects - completedProjects,
        totalMaterials,
        totalEstimatedCost,
      },
      materialDistribution,
      projectTypeDistribution,
      recentProjects: recentProjects.map(addId),
      recentEstimations: costEstimations.map(addId),
    });
  } catch (err) { next(err); }
};

// GET /api/bim/analytics/project/:id — single project analytics
exports.getProjectAnalytics = async (req, res, next) => {
  try {
    const project = await prisma.bIMProject.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ message: 'BIM project not found' });

    const [estimations, history, drawings] = await Promise.all([
      prisma.costEstimation.findMany({ where: { bim_project_id: req.params.id }, orderBy: { createdAt: 'desc' } }),
      prisma.designHistory.findMany({ where: { bim_project_id: req.params.id }, take: 20, orderBy: { createdAt: 'desc' } }),
      prisma.drawingFile.findMany({ where: { bim_project_id: req.params.id }, orderBy: { createdAt: 'desc' } }),
    ]);

    const buildingData = typeof project.building_data === 'object' ? project.building_data : {};
    const floors = buildingData.floors || [];
    const walls = buildingData.walls || [];
    const doors = buildingData.doors || [];
    const windows = buildingData.windows || [];

    res.json({
      project: addId(project),
      elementCounts: { floors: floors.length, walls: walls.length, doors: doors.length, windows: windows.length },
      estimations: estimations.map(addId),
      history: history.map(addId),
      drawings: drawings.map(addId),
      totalEstimatedCost: estimations.reduce((sum, e) => sum + (e.total_cost || 0), 0),
    });
  } catch (err) { next(err); }
};
