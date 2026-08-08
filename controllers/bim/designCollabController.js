const { BIMCollaborator, BIMDesignComment, BIMDesignApproval, BIMRevisionHistory } = require('../../models/bim/BIMMetadata');

// @desc    Join collaboration session
// @route   POST /api/bim/collab/join
exports.joinSession = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { bim_project_id, socket_id, active_floor_id } = req.body;

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF7F50', '#87CEEB'];
    const existingCount = await BIMCollaborator.countDocuments({ bim_project_id, is_online: true });

    let collab = await BIMCollaborator.findOneAndUpdate(
      { bim_project_id, user_id: userId },
      { socket_id, is_online: true, last_activity: new Date(), active_floor_id, color: colors[existingCount % colors.length] },
      { upsert: true, new: true }
    );

    collab = await BIMCollaborator.findById(collab._id).populate('user_id', 'name email');

    if (global.io) {
      global.io.to(`bim_${bim_project_id}`).emit('bim:user_joined', collab);
    }

    res.json(collab);
  } catch (err) { next(err); }
};

// @desc    Leave session
// @route   POST /api/bim/collab/leave
exports.leaveSession = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { bim_project_id } = req.body;

    await BIMCollaborator.findOneAndUpdate(
      { bim_project_id, user_id: userId },
      { is_online: false, socket_id: '' }
    );

    if (global.io) {
      global.io.to(`bim_${bim_project_id}`).emit('bim:user_left', { user_id: userId });
    }

    res.json({ message: 'Left session' });
  } catch (err) { next(err); }
};

// @desc    Get active collaborators
// @route   GET /api/bim/collab/active?bim_project_id=xxx
exports.getActiveCollaborators = async (req, res, next) => {
  try {
    const { bim_project_id } = req.query;
    const collabs = await BIMCollaborator.find({ bim_project_id, is_online: true })
      .populate('user_id', 'name email profile_image');
    res.json(collabs);
  } catch (err) { next(err); }
};

// @desc    Update cursor position
// @route   PUT /api/bim/collab/cursor
exports.updateCursor = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { bim_project_id, x, y, active_floor_id } = req.body;

    await BIMCollaborator.findOneAndUpdate(
      { bim_project_id, user_id: userId },
      { cursor_position: { x, y }, active_floor_id, last_activity: new Date() }
    );

    if (global.io) {
      global.io.to(`bim_${bim_project_id}`).emit('bim:cursor_moved', {
        user_id: userId, x, y, active_floor_id,
      });
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
};

// @desc    Add comment
// @route   POST /api/bim/collab/comments
exports.addComment = async (req, res, next) => {
  try {
    const { company_id, userId } = req.user;
    const comment = await BIMDesignComment.create({ ...req.body, company_id, user_id: userId });
    const populated = await BIMDesignComment.findById(comment._id).populate('user_id', 'name email');

    if (global.io) {
      global.io.to(`bim_${req.body.bim_project_id}`).emit('bim:comment_added', populated);
    }

    res.status(201).json(populated);
  } catch (err) { next(err); }
};

// @desc    Get comments
// @route   GET /api/bim/collab/comments?bim_project_id=xxx
exports.getComments = async (req, res, next) => {
  try {
    const { bim_project_id, element_id, status } = req.query;
    const filter = { bim_project_id };
    if (element_id) filter.element_id = element_id;
    if (status) filter.status = status;

    const comments = await BIMDesignComment.find(filter)
      .populate('user_id', 'name email')
      .populate('mentions', 'name email')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) { next(err); }
};

// @desc    Submit for approval
// @route   POST /api/bim/collab/approvals
exports.submitApproval = async (req, res, next) => {
  try {
    const { company_id, userId } = req.user;
    const approval = await BIMDesignApproval.create({
      ...req.body,
      company_id,
      submitted_by: userId,
      status: 'submitted',
      submission_date: new Date(),
    });
    res.status(201).json(approval);
  } catch (err) { next(err); }
};

// @desc    Review approval
// @route   PUT /api/bim/collab/approvals/:id
exports.reviewApproval = async (req, res, next) => {
  try {
    const { status, comments, revision_notes, digital_signature } = req.body;
    const approval = await BIMDesignApproval.findByIdAndUpdate(req.params.id, {
      status,
      comments,
      revision_notes,
      digital_signature,
      reviewer_id: req.user.userId,
      review_date: new Date(),
    }, { new: true });

    if (!approval) return res.status(404).json({ message: 'Approval not found' });
    res.json(approval);
  } catch (err) { next(err); }
};

// @desc    Get approvals
// @route   GET /api/bim/collab/approvals?bim_project_id=xxx
exports.getApprovals = async (req, res, next) => {
  try {
    const { bim_project_id } = req.query;
    const approvals = await BIMDesignApproval.find({ bim_project_id })
      .populate('submitted_by', 'name email')
      .populate('reviewer_id', 'name email')
      .sort({ createdAt: -1 });
    res.json(approvals);
  } catch (err) { next(err); }
};

// @desc    Save revision
// @route   POST /api/bim/collab/revisions
exports.saveRevision = async (req, res, next) => {
  try {
    const { company_id, userId } = req.user;
    const revision = await BIMRevisionHistory.create({ ...req.body, company_id, user_id: userId });
    res.status(201).json(revision);
  } catch (err) { next(err); }
};

// @desc    Get revision history
// @route   GET /api/bim/collab/revisions?bim_project_id=xxx
exports.getRevisions = async (req, res, next) => {
  try {
    const { bim_project_id } = req.query;
    const revisions = await BIMRevisionHistory.find({ bim_project_id })
      .populate('user_id', 'name email')
      .sort({ version: -1 });
    res.json(revisions);
  } catch (err) { next(err); }
};
