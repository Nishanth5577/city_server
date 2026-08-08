const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const { getAuditLogs } = require('../controllers/auditLogController');

router.get('/', auth, authorize('admin'), getAuditLogs);

module.exports = router;
