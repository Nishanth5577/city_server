const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const { generateProjectReport, generateExpenseReport, generateWorkerExcel, generateMaterialExcel } = require('../controllers/reportController');

router.get('/project/:projectId', auth, generateProjectReport);
router.get('/expenses', auth, generateExpenseReport);
router.get('/workers/excel', auth, authorize('admin', 'project_manager'), generateWorkerExcel);
router.get('/materials/excel', auth, authorize('admin', 'project_manager'), generateMaterialExcel);

module.exports = router;
