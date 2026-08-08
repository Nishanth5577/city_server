const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const auditLog = require('../middleware/auditLogger');
const { taskValidator } = require('../validators/projectValidator');
const {
  getTasks, getTask, createTask, updateTask, deleteTask, updateTaskStatus, getGanttTasks,
} = require('../controllers/taskController');

router.get('/', auth, getTasks);
router.get('/gantt/:projectId', auth, getGanttTasks);
router.get('/:id', auth, getTask);
router.post('/', auth, authorize('admin', 'project_manager', 'engineer'), taskValidator, validate, auditLog('tasks', 'Created task'), createTask);
router.put('/:id', auth, authorize('admin', 'project_manager', 'engineer'), auditLog('tasks', 'Updated task'), updateTask);
router.patch('/:id/status', auth, auditLog('tasks', 'Updated task status'), updateTaskStatus);
router.delete('/:id', auth, authorize('admin', 'project_manager'), auditLog('tasks', 'Deleted task'), deleteTask);

module.exports = router;
