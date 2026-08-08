const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const { supplierValidator } = require('../validators/resourceValidator');
const {
  getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
} = require('../controllers/supplierController');

router.use(auth);
router.route('/')
  .get(getSuppliers)
  .post(authorize('admin', 'project_manager'), supplierValidator, validate, createSupplier);
router.route('/:id')
  .get(getSupplier)
  .put(authorize('admin', 'project_manager'), supplierValidator, validate, updateSupplier)
  .delete(authorize('admin'), deleteSupplier);

module.exports = router;
