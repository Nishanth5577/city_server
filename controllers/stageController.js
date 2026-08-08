const ConstructionStage = require('../models/ConstructionStage');
const Project = require('../models/Project');

// @desc    Get stages for a project
// @route   GET /api/stages/:projectId
exports.getStages = async (req, res, next) => {
  try {
    const stages = await ConstructionStage.find({ project_id: req.params.projectId })
      .populate('updated_by', 'name')
      .sort({ stage_order: 1 });

    res.json(stages);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a stage
// @route   PUT /api/stages/:id
exports.updateStage = async (req, res, next) => {
  try {
    const { status, completion_percentage, notes } = req.body;
    const updates = { updated_by: req.user.userId };

    if (status) updates.status = status;
    if (completion_percentage !== undefined) updates.completion_percentage = completion_percentage;
    if (notes !== undefined) updates.notes = notes;

    if (status === 'in_progress' && !updates.start_date) {
      updates.start_date = new Date();
    }
    if (status === 'completed') {
      updates.completion_percentage = 100;
      updates.end_date = new Date();
    }

    const stage = await ConstructionStage.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('updated_by', 'name');

    if (!stage) {
      return res.status(404).json({ message: 'Stage not found.' });
    }

    // Recalculate project progress
    const allStages = await ConstructionStage.find({ project_id: stage.project_id });
    const totalProgress = allStages.reduce((sum, s) => sum + s.completion_percentage, 0);
    const avgProgress = Math.round(totalProgress / allStages.length);

    await Project.findByIdAndUpdate(stage.project_id, {
      progress_percentage: avgProgress,
      ...(avgProgress === 100 && { project_status: 'completed', actual_end_date: new Date() }),
    });

    res.json({ stage, projectProgress: avgProgress });
  } catch (error) {
    next(error);
  }
};

// @desc    Get progress timeline
// @route   GET /api/stages/timeline/:projectId
exports.getTimeline = async (req, res, next) => {
  try {
    const stages = await ConstructionStage.find({ project_id: req.params.projectId })
      .populate('updated_by', 'name')
      .sort({ stage_order: 1 });

    const timeline = stages.map(stage => ({
      name: stage.stage_name,
      order: stage.stage_order,
      status: stage.status,
      progress: stage.completion_percentage,
      startDate: stage.start_date,
      endDate: stage.end_date,
      updatedBy: stage.updated_by?.name || null,
      updatedAt: stage.updatedAt,
    }));

    res.json(timeline);
  } catch (error) {
    next(error);
  }
};
