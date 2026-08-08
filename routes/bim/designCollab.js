const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/designCollabController');

router.use(auth);
// Session
router.post('/join', ctrl.joinSession);
router.post('/leave', ctrl.leaveSession);
router.get('/active', ctrl.getActiveCollaborators);
router.put('/cursor', ctrl.updateCursor);
// Comments
router.get('/comments', ctrl.getComments);
router.post('/comments', ctrl.addComment);
// Approvals
router.get('/approvals', ctrl.getApprovals);
router.post('/approvals', ctrl.submitApproval);
router.put('/approvals/:id', ctrl.reviewApproval);
// Revisions
router.get('/revisions', ctrl.getRevisions);
router.post('/revisions', ctrl.saveRevision);

module.exports = router;
