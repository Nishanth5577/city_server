const { body } = require('express-validator');

const projectValidator = [
  body('project_name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ max: 200 }).withMessage('Project name must be at most 200 characters'),
  body('client_name')
    .trim()
    .notEmpty().withMessage('Client name is required')
    .isLength({ max: 200 }).withMessage('Client name must be at most 200 characters'),
  body('budget')
    .optional()
    .isNumeric().withMessage('Budget must be a number')
    .custom(v => v >= 0).withMessage('Budget cannot be negative'),
  body('start_date')
    .optional()
    .isISO8601().withMessage('Invalid start date'),
  body('expected_end_date')
    .optional()
    .isISO8601().withMessage('Invalid expected end date'),
];

const taskValidator = [
  body('task_name')
    .trim()
    .notEmpty().withMessage('Task name is required')
    .isLength({ max: 200 }).withMessage('Task name must be at most 200 characters'),
  body('project_id')
    .notEmpty().withMessage('Project ID is required')
    .isMongoId().withMessage('Invalid project ID'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('start_date')
    .optional()
    .isISO8601().withMessage('Invalid start date'),
  body('end_date')
    .optional()
    .isISO8601().withMessage('Invalid end date'),
];

module.exports = { projectValidator, taskValidator };
