const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const { paymentValidator } = require('../validators/resourceValidator');
const {
  getPayments, getFinanceSummary, createPayment, updatePayment, deletePayment,
} = require('../controllers/paymentController');

router.use(auth);
router.get('/summary', authorize('admin', 'project_manager'), getFinanceSummary);
router.route('/')
  .get(getPayments)
  .post(authorize('admin', 'project_manager'), paymentValidator, validate, createPayment);
router.route('/:id')
  .put(authorize('admin', 'project_manager'), paymentValidator, validate, updatePayment)
  .delete(authorize('admin'), deletePayment);

module.exports = router;
