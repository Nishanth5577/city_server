const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const auditLog = require('../middleware/auditLogger');
const { workerValidator } = require('../validators/resourceValidator');
const { getWorkers, getWorker, createWorker, updateWorker, deleteWorker, markAttendance, getProductivity } = require('../controllers/workerController');

router.get('/productivity', auth, getProductivity);
router.get('/', auth, getWorkers);
router.get('/:id', auth, getWorker);
router.post('/', auth, authorize('admin', 'project_manager', 'supervisor'), workerValidator, validate, auditLog('workers', 'Created worker'), createWorker);
router.put('/:id', auth, authorize('admin', 'project_manager', 'supervisor'), workerValidator, validate, auditLog('workers', 'Updated worker'), updateWorker);
router.patch('/:id/attendance', auth, authorize('admin', 'project_manager', 'supervisor'), markAttendance);
router.delete('/:id', auth, authorize('admin', 'project_manager'), auditLog('workers', 'Deleted worker'), deleteWorker);

module.exports = router;
