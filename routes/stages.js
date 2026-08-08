const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const auditLog = require('../middleware/auditLogger');
const { getStages, updateStage, getTimeline } = require('../controllers/stageController');

router.get('/:projectId', auth, getStages);
router.get('/timeline/:projectId', auth, getTimeline);
router.put('/:id', auth, authorize('admin', 'project_manager', 'engineer'), auditLog('stages', 'Updated construction stage'), updateStage);

module.exports = router;
