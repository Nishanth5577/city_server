const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const auditLog = require('../middleware/auditLogger');
const { materialValidator } = require('../validators/resourceValidator');
const { getMaterials, createMaterial, updateMaterial, deleteMaterial, useStock, getLowStockAlerts } = require('../controllers/materialController');

router.get('/alerts/low-stock', auth, getLowStockAlerts);
router.get('/', auth, getMaterials);
router.post('/', auth, authorize('admin', 'project_manager', 'engineer'), materialValidator, validate, auditLog('materials', 'Created material'), createMaterial);
router.put('/:id', auth, authorize('admin', 'project_manager', 'engineer'), materialValidator, validate, auditLog('materials', 'Updated material'), updateMaterial);
router.patch('/:id/use', auth, auditLog('materials', 'Used material stock'), useStock);
router.delete('/:id', auth, authorize('admin', 'project_manager'), auditLog('materials', 'Deleted material'), deleteMaterial);

module.exports = router;
