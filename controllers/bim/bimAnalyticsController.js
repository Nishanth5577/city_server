const BIMProject = require('../../models/bim/BIMProject');
const BIMBuilding = require('../../models/bim/Building');
const BIMFloor = require('../../models/bim/Floor');
const BIMWall = require('../../models/bim/Wall');
const BIMColumn = require('../../models/bim/Column');
const BIMDoor = require('../../models/bim/Door');
const BIMWindow = require('../../models/bim/Window');
const BIMCostEstimation = require('../../models/bim/CostEstimation');
const { BIMDesignApproval } = require('../../models/bim/BIMMetadata');

// @desc    Get BIM analytics
// @route   GET /api/bim/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const { company_id } = req.user;

    const [totalDesigns, draftDesigns, approvedDesigns, rejectedDesigns] = await Promise.all([
      BIMProject.countDocuments({ company_id }),
      BIMProject.countDocuments({ company_id, status: 'draft' }),
      BIMProject.countDocuments({ company_id, status: 'approved' }),
      BIMDesignApproval.countDocuments({ company_id, status: 'rejected' }),
    ]);

    const inProgress = await BIMProject.countDocuments({ company_id, status: 'in_progress' });
    const inReview = await BIMProject.countDocuments({ company_id, status: 'review' });

    // Element counts
    const projects = await BIMProject.find({ company_id }).select('_id');
    const projectIds = projects.map(p => p._id);

    const [wallCount, columnCount, doorCount, windowCount, floorCount, buildingCount] = await Promise.all([
      BIMWall.countDocuments({ bim_project_id: { $in: projectIds } }),
      BIMColumn.countDocuments({ bim_project_id: { $in: projectIds } }),
      BIMDoor.countDocuments({ bim_project_id: { $in: projectIds } }),
      BIMWindow.countDocuments({ bim_project_id: { $in: projectIds } }),
      BIMFloor.countDocuments({ bim_project_id: { $in: projectIds } }),
      BIMBuilding.countDocuments({ bim_project_id: { $in: projectIds } }),
    ]);

    // Cost summary
    const costEstimations = await BIMCostEstimation.find({ company_id });
    const totalEstimatedCost = costEstimations.reduce((sum, c) => sum + (c.summary?.total_cost || 0), 0);
    const totalArea = costEstimations.reduce((sum, c) => sum + (c.total_area_sqft || 0), 0);
    const avgCostPerSqft = totalArea > 0 ? Math.round(totalEstimatedCost / totalArea) : 0;

    // Recent projects
    const recentProjects = await BIMProject.find({ company_id })
      .populate('project_id', 'project_name')
      .populate('created_by', 'name')
      .sort({ updatedAt: -1 })
      .limit(5);

    // Cost by category
    const costByCategory = {};
    costEstimations.forEach(est => {
      if (est.summary) {
        Object.entries(est.summary.toObject ? est.summary.toObject() : est.summary).forEach(([key, val]) => {
          if (key !== 'subtotal' && key !== 'gst_percent' && key !== 'gst_amount' && key !== 'total_cost' && typeof val === 'number') {
            costByCategory[key] = (costByCategory[key] || 0) + val;
          }
        });
      }
    });

    res.json({
      overview: {
        totalDesigns,
        draftDesigns,
        inProgress,
        inReview,
        approvedDesigns,
        rejectedDesigns,
      },
      elements: {
        buildings: buildingCount,
        floors: floorCount,
        walls: wallCount,
        columns: columnCount,
        doors: doorCount,
        windows: windowCount,
      },
      costs: {
        totalEstimatedCost,
        totalArea,
        avgCostPerSqft,
        costByCategory,
      },
      recentProjects,
    });
  } catch (err) { next(err); }
};
