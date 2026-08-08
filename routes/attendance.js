const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const {
  getAttendance, markAttendance, markBulkAttendance, getWorkerAttendanceSummary,
} = require('../controllers/attendanceController');

router.use(auth);
router.route('/')
  .get(getAttendance)
  .post(authorize('admin', 'project_manager', 'supervisor'), markAttendance);
router.post('/bulk', authorize('admin', 'project_manager', 'supervisor'), markBulkAttendance);
router.get('/summary/:workerId', getWorkerAttendanceSummary);

module.exports = router;
