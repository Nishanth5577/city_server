const prisma = require('../../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getHistory = async (req, res, next) => {
  try {
    const bim_project_id = req.params.projectId || req.query.bim_project_id;
    if (!bim_project_id) return res.json([]);
    const history = await prisma.designHistory.findMany({
      where: { bim_project_id },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    res.json(history.map(addId));
  } catch (err) { next(err); }
};

exports.saveSnapshot = async (req, res, next) => {
  try {
    const { bim_project_id, action, description, snapshot } = req.body;
    const entry = await prisma.designHistory.create({
      data: { bim_project_id, action: action || 'snapshot', description: description || '', user_id: req.user.userId, user_name: req.user.name || 'User', snapshot: snapshot || null },
    });
    res.status(201).json(addId(entry));
  } catch (err) { next(err); }
};

exports.getCollaborators = async (req, res, next) => {
  try {
    const project = await prisma.bIMProject.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'BIM project not found' });
    const collaboratorIds = Array.isArray(project.collaborators) ? project.collaborators : [];
    if (collaboratorIds.length === 0) return res.json([]);
    const users = await prisma.user.findMany({
      where: { id: { in: collaboratorIds } },
      select: { id: true, name: true, email: true, role: true, profile_image: true },
    });
    res.json(users.map(addId));
  } catch (err) { next(err); }
};

exports.joinSession = async (req, res, next) => {
  try {
    // Real-time session tracking is handled via WebSocket — this REST endpoint acknowledges the join
    res.json({ status: 'joined', userId: req.user.userId, sessionId: req.params.projectId || req.body.projectId, timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
};

exports.leaveSession = async (req, res, next) => {
  try {
    res.json({ status: 'left', userId: req.user.userId, timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
};

exports.getActiveCollaborators = async (req, res, next) => {
  try {
    // In production this would query the WebSocket session store
    // For now, return the current user as the only active collaborator
    res.json([{ userId: req.user.userId, name: req.user.name || 'Current User', joinedAt: new Date().toISOString(), cursor: null }]);
  } catch (err) { next(err); }
};

exports.updateCursor = async (req, res, next) => {
  try {
    // Cursor updates are broadcast via WebSocket in real-time
    res.json({ status: 'ok' });
  } catch (err) { next(err); }
};

exports.getComments = async (req, res, next) => {
  try {
    const bim_project_id = req.params.projectId || req.query.bim_project_id;
    if (!bim_project_id) return res.json([]);
    // Store comments in design history with action='comment'
    const comments = await prisma.designHistory.findMany({
      where: { bim_project_id, action: 'comment' },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    res.json(comments.map(addId));
  } catch (err) { next(err); }
};

exports.addComment = async (req, res, next) => {
  try {
    const { bim_project_id, text, position } = req.body;
    const comment = await prisma.designHistory.create({
      data: { bim_project_id, action: 'comment', description: text || '', user_id: req.user.userId, user_name: req.user.name || 'User', snapshot: position ? { position } : null },
    });
    res.status(201).json(addId(comment));
  } catch (err) { next(err); }
};

exports.getApprovals = async (req, res, next) => {
  try {
    const bim_project_id = req.params.projectId || req.query.bim_project_id;
    if (!bim_project_id) return res.json([]);
    const approvals = await prisma.designHistory.findMany({
      where: { bim_project_id, action: { in: ['approval_submitted', 'approval_approved', 'approval_rejected'] } },
      orderBy: { createdAt: 'desc' }, take: 20,
    });
    res.json(approvals.map(addId));
  } catch (err) { next(err); }
};

exports.submitApproval = async (req, res, next) => {
  try {
    const { bim_project_id, description } = req.body;
    const approval = await prisma.designHistory.create({
      data: { bim_project_id, action: 'approval_submitted', description: description || 'Design submitted for approval', user_id: req.user.userId, user_name: req.user.name || 'User' },
    });
    res.status(201).json(addId(approval));
  } catch (err) { next(err); }
};

exports.reviewApproval = async (req, res, next) => {
  try {
    const { bim_project_id, status, feedback } = req.body;
    const review = await prisma.designHistory.create({
      data: { bim_project_id, action: status === 'approved' ? 'approval_approved' : 'approval_rejected', description: feedback || '', user_id: req.user.userId, user_name: req.user.name || 'User' },
    });
    res.status(201).json(addId(review));
  } catch (err) { next(err); }
};

exports.getRevisions = async (req, res, next) => {
  try {
    const bim_project_id = req.params.projectId || req.query.bim_project_id;
    if (!bim_project_id) return res.json([]);
    const revisions = await prisma.designHistory.findMany({
      where: { bim_project_id, action: 'revision' },
      orderBy: { createdAt: 'desc' }, take: 20,
    });
    res.json(revisions.map(addId));
  } catch (err) { next(err); }
};

exports.saveRevision = async (req, res, next) => {
  try {
    const { bim_project_id, description, snapshot } = req.body;
    const revision = await prisma.designHistory.create({
      data: { bim_project_id, action: 'revision', description: description || 'Design revision saved', user_id: req.user.userId, user_name: req.user.name || 'User', snapshot: snapshot || null },
    });
    res.status(201).json(addId(revision));
  } catch (err) { next(err); }
};
