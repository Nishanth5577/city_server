const { body } = require('express-validator');

const expenseValidator = [
  body('project_id')
    .notEmpty().withMessage('Project ID is required')
    .isMongoId().withMessage('Invalid project ID'),
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isIn(['labor', 'materials', 'equipment', 'transport', 'subcontractor', 'utilities', 'permits', 'miscellaneous'])
    .withMessage('Invalid expense category'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
  body('date')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('receipt_url')
    .optional()
    .trim(),
];

const workerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Worker name is required')
    .isLength({ max: 200 }).withMessage('Name must be at most 200 characters'),
  body('role')
    .trim()
    .notEmpty().withMessage('Role is required')
    .isIn(['mason', 'carpenter', 'electrician', 'plumber', 'painter', 'welder', 'helper', 'driver', 'operator', 'supervisor', 'engineer', 'foreman', 'laborer', 'other'])
    .withMessage('Invalid worker role'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Phone must be a 10-digit number'),
  body('daily_wage')
    .optional()
    .isFloat({ min: 0 }).withMessage('Daily wage must be a non-negative number'),
  body('emergency_contact')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Emergency contact must be at most 200 characters'),
  body('aadhar_number')
    .optional()
    .trim()
    .matches(/^[0-9]{12}$/).withMessage('Aadhar number must be 12 digits'),
];

const materialValidator = [
  body('material_name')
    .trim()
    .notEmpty().withMessage('Material name is required')
    .isLength({ max: 200 }).withMessage('Material name must be at most 200 characters'),
  body('project_id')
    .optional()
    .isMongoId().withMessage('Invalid project ID'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Category must be at most 100 characters'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 0 }).withMessage('Quantity must be a non-negative number'),
  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost must be a non-negative number'),
  body('low_stock_threshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
  body('unit')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Unit must be at most 50 characters'),
];

const paymentValidator = [
  body('type')
    .notEmpty().withMessage('Payment type is required')
    .isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
  body('project_id')
    .optional()
    .isMongoId().withMessage('Invalid project ID'),
  body('date')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('payment_mode')
    .optional()
    .isIn(['cash', 'bank_transfer', 'cheque', 'upi', 'card'])
    .withMessage('Invalid payment mode'),
  body('party_name')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Party name must be at most 200 characters'),
];

const supplierValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Supplier name is required')
    .isLength({ max: 200 }).withMessage('Name must be at most 200 characters'),
  body('contact_person')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Contact person must be at most 200 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Phone must be a 10-digit number'),
  body('gst_number')
    .optional()
    .trim()
    .matches(/^[0-9A-Z]{15}$/).withMessage('GST number must be 15 alphanumeric characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Address must be at most 500 characters'),
];

const equipmentValidator = [
  body('equipment_name')
    .trim()
    .notEmpty().withMessage('Equipment name is required')
    .isLength({ max: 200 }).withMessage('Equipment name must be at most 200 characters'),
  body('type')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Type must be at most 100 characters'),
  body('cost_per_day')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost per day must be a non-negative number'),
  body('assigned_project')
    .optional()
    .isMongoId().withMessage('Invalid project ID'),
];

module.exports = {
  expenseValidator,
  workerValidator,
  materialValidator,
  paymentValidator,
  supplierValidator,
  equipmentValidator,
};
