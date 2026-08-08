const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const auditLog = require('../middleware/auditLogger');
const { expenseValidator } = require('../validators/resourceValidator');
const { getExpenses, createExpense, updateExpense, deleteExpense, approveExpense } = require('../controllers/expenseController');

router.get('/', auth, getExpenses);
router.post('/', auth, expenseValidator, validate, auditLog('expenses', 'Created expense'), createExpense);
router.put('/:id', auth, expenseValidator, validate, auditLog('expenses', 'Updated expense'), updateExpense);
router.patch('/:id/approve', auth, authorize('admin', 'project_manager'), auditLog('expenses', 'Approved/rejected expense'), approveExpense);
router.delete('/:id', auth, authorize('admin', 'project_manager'), auditLog('expenses', 'Deleted expense'), deleteExpense);

module.exports = router;
