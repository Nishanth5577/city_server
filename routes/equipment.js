const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const auditLog = require('../middleware/auditLogger');
const { equipmentValidator } = require('../validators/resourceValidator');
const { getEquipment, createEquipment, updateEquipment, deleteEquipment, getMaintenanceDue } = require('../controllers/equipmentController');

router.get('/maintenance-due', auth, getMaintenanceDue);
router.get('/', auth, getEquipment);
router.post('/', auth, authorize('admin', 'project_manager'), equipmentValidator, validate, auditLog('equipment', 'Created equipment'), createEquipment);
router.put('/:id', auth, authorize('admin', 'project_manager'), equipmentValidator, validate, auditLog('equipment', 'Updated equipment'), updateEquipment);
router.delete('/:id', auth, authorize('admin'), auditLog('equipment', 'Deleted equipment'), deleteEquipment);

module.exports = router;
