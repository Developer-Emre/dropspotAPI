import { param, query } from 'express-validator';

/**
 * Validation rules for waitlist endpoints
 */

// Validation for drop ID parameter (supports CUID and UUID)
export const dropIdValidation = [
  param('id')
    .custom((value) => {
      // CUID format: starts with 'c', 25 chars, base32
      const cuidRegex = /^c[a-z0-9]{24}$/;
      // UUID format: 8-4-4-4-12 hex digits with hyphens
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (cuidRegex.test(value) || uuidRegex.test(value)) {
        return true;
      }
      throw new Error('Invalid drop ID format (must be CUID or UUID)');
    })
];

// Validation for pagination parameters
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be a positive integer between 1 and 1000'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a positive integer between 1 and 100')
];