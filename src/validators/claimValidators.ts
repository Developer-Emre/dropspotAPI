import { body, param } from 'express-validator';

// Shared drop ID validation (supports both CUID and UUID)
const dropIdValidation = param('id')
  .custom((value) => {
    // CUID format: starts with 'c', 25 chars, base32
    const cuidRegex = /^c[a-z0-9]{24}$/;
    // UUID format: 8-4-4-4-12 hex digits with hyphens
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (cuidRegex.test(value) || uuidRegex.test(value)) {
      return true;
    }
    throw new Error('Invalid drop ID format (must be CUID or UUID)');
  });

export const claimValidators = {
  claimDrop: [dropIdValidation],
  getClaimStatus: [dropIdValidation],
  completeClaim: [dropIdValidation]
};