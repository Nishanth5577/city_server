const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const auditLog = require('../middleware/auditLogger');
const { projectValidator } = require('../validators/projectValidator');
const {
  getProjects, getProject, createProject, updateProject, deleteProject,
  getProjectStats, getPublicProject,
} = require('../controllers/projectController');

// Public route (QR code access)
router.get('/public/:id', getPublicProject);

router.get('/stats/overview', auth, getProjectStats);
router.get('/', auth, getProjects);
router.get('/:id', auth, getProject);
router.post('/', auth, authorize('admin', 'project_manager'), projectValidator, validate, auditLog('projects', 'Created project'), createProject);
router.put('/:id', auth, authorize('admin', 'project_manager'), auditLog('projects', 'Updated project'), updateProject);
router.delete('/:id', auth, authorize('admin'), auditLog('projects', 'Deleted project'), deleteProject);

module.exports = router;
