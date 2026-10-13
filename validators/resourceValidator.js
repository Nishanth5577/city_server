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
  body('skill')
    .trim()
    .notEmpty().withMessage('Skill is required'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim(),
  body('salary')
    .optional({ values: 'falsy' }),
  body('emergency_contact')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 }).withMessage('Emergency contact must be at most 200 characters'),
  body('aadhar_number')
    .optional({ values: 'falsy' })
    .trim(),
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
    .notEmpty().withMessage('Payment type is required'),
  body('amount')
    .notEmpty().withMessage('Amount is required'),
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required'),
];

const supplierValidator = [
  body('company_name')
    .trim()
    .notEmpty().withMessage('Supplier company name is required')
    .isLength({ max: 200 }).withMessage('Company name must be at most 200 characters'),
  body('contact_person')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Contact person must be at most 200 characters'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail().withMessage('Invalid email format'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Phone must be at most 20 characters'),
  body('gst_number')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('GST number must be at most 20 characters'),
  body('address')
    .optional()
    .isObject().withMessage('Address must be an object'),
  body('address.street').optional().trim().isLength({ max: 200 }).withMessage('Street must be at most 200 characters'),
  body('address.city').optional().trim().isLength({ max: 100 }).withMessage('City must be at most 100 characters'),
  body('address.state').optional().trim().isLength({ max: 100 }).withMessage('State must be at most 100 characters'),
  body('address.zip').optional().trim().isLength({ max: 10 }).withMessage('ZIP must be at most 10 characters'),
  body('materials_supplied')
    .optional()
    .isArray().withMessage('Materials supplied must be an array'),
  body('rating')
    .optional()
    .isInt({ min: 0, max: 3 }).withMessage('Rating must be between 0 and 3'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Notes must be at most 2000 characters'),
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

