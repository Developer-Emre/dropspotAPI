import { body, param } from 'express-validator';

/**
 * Validation rules for drop endpoints
 */

// Validation for creating a new drop
export const createDropValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('imageUrl')
    .optional({ nullable: true })
    .custom((value) => {
      // Allow null, undefined, or empty string
      if (!value || value === null || value === '') {
        return true;
      }
      // If value exists, validate it's a proper URL
      const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
      if (!urlRegex.test(value)) {
        throw new Error('Invalid image URL format');
      }
      return true;
    }),

  body('totalStock')
    .notEmpty()
    .withMessage('Total stock is required')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Total stock must be between 1 and 10000'),

  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format (use ISO 8601)')
    .custom((value) => {
      const startDate = new Date(value);
      const now = new Date();
      if (startDate <= now) {
        throw new Error('Start date must be in the future');
      }
      return true;
    }),

  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format (use ISO 8601)')
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.startDate);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('claimWindowStart')
    .notEmpty()
    .withMessage('Claim window start is required')
    .isISO8601()
    .withMessage('Invalid claim window start format (use ISO 8601)')
    .custom((value, { req }) => {
      const claimStart = new Date(value);
      const startDate = new Date(req.body.startDate);
      if (claimStart < startDate) {
        throw new Error('Claim window start must be after or equal to start date');
      }
      return true;
    }),

  body('claimWindowEnd')
    .notEmpty()
    .withMessage('Claim window end is required')
    .isISO8601()
    .withMessage('Invalid claim window end format (use ISO 8601)')
    .custom((value, { req }) => {
      const claimEnd = new Date(value);
      const claimStart = new Date(req.body.claimWindowStart);
      const endDate = new Date(req.body.endDate);
      
      if (claimEnd <= claimStart) {
        throw new Error('Claim window end must be after claim window start');
      }
      
      if (claimEnd > endDate) {
        throw new Error('Claim window end must be before or equal to end date');
      }
      
      // Minimum claim window duration (1 hour)
      const minDuration = 60 * 60 * 1000; // 1 hour in milliseconds
      if (claimEnd.getTime() - claimStart.getTime() < minDuration) {
        throw new Error('Claim window must be at least 1 hour long');
      }
      
      return true;
    })
];

// Validation for updating a drop
export const updateDropValidation = [
  param('id')
    .isLength({ min: 20, max: 30 })
    .matches(/^[a-z0-9]+$/)
    .withMessage('Invalid drop ID format'),

  body('title')
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('imageUrl')
    .optional({ nullable: true })
    .custom((value) => {
      // Allow null, undefined, or empty string
      if (!value || value === null || value === '') {
        return true;
      }
      // If value exists, validate it's a proper URL
      const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
      if (!urlRegex.test(value)) {
        throw new Error('Invalid image URL format');
      }
      return true;
    }),

  body('totalStock')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Total stock must be between 1 and 10000')
    .custom(async (value, { req }) => {
      // Check if new total stock is not less than already claimed stock
      // This would require a database check in the controller
      return true;
    }),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format (use ISO 8601)'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format (use ISO 8601)')
    .custom((value, { req }) => {
      if (value && req.body.startDate) {
        const endDate = new Date(value);
        const startDate = new Date(req.body.startDate);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),

  body('claimWindowStart')
    .optional()
    .isISO8601()
    .withMessage('Invalid claim window start format (use ISO 8601)')
    .custom((value, { req }) => {
      if (value && req.body.startDate) {
        const claimStart = new Date(value);
        const startDate = new Date(req.body.startDate);
        if (claimStart < startDate) {
          throw new Error('Claim window start must be after or equal to start date');
        }
      }
      return true;
    }),

  body('claimWindowEnd')
    .optional()
    .isISO8601()
    .withMessage('Invalid claim window end format (use ISO 8601)')
    .custom((value, { req }) => {
      if (value) {
        const claimEnd = new Date(value);
        
        if (req.body.claimWindowStart) {
          const claimStart = new Date(req.body.claimWindowStart);
          if (claimEnd <= claimStart) {
            throw new Error('Claim window end must be after claim window start');
          }
          
          // Minimum claim window duration (1 hour)
          const minDuration = 60 * 60 * 1000;
          if (claimEnd.getTime() - claimStart.getTime() < minDuration) {
            throw new Error('Claim window must be at least 1 hour long');
          }
        }
        
        if (req.body.endDate) {
          const endDate = new Date(req.body.endDate);
          if (claimEnd > endDate) {
            throw new Error('Claim window end must be before or equal to end date');
          }
        }
      }
      return true;
    })
];

// Validation for drop ID parameter
export const dropIdValidation = [
  param('id')
    .isLength({ min: 20, max: 30 })
    .matches(/^[a-z0-9]+$/)
    .withMessage('Invalid drop ID format')
];