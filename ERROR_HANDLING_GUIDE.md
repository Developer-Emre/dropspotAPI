# Error Handling Implementation

## Overview

DropSpot API now includes comprehensive error handling with structured error responses, Prisma error handling, and proper HTTP status codes.

## Error Handler Components

### 1. Global Error Handler (`src/middleware/errorHandler.ts`)

**Features:**
- Centralized error processing
- Prisma error mapping
- JWT error handling
- Validation error processing
- Development vs Production error details
- Stack trace in development mode

**Error Types Handled:**
- Prisma database errors (P2002, P2025, P2003, etc.)
- JWT authentication errors (JsonWebTokenError, TokenExpiredError)
- Validation errors (express-validator)
- Custom application errors (AppErrorClass)
- Async route handler errors

### 2. Custom Error Class (`AppErrorClass`)

**Static Methods:**
```typescript
AppErrorClass.badRequest(message, code?, details?)     // 400
AppErrorClass.unauthorized(message?, code?)            // 401
AppErrorClass.forbidden(message?, code?, details?)     // 403
AppErrorClass.notFound(message?, code?)                // 404
AppErrorClass.conflict(message, code?, details?)       // 409
AppErrorClass.internal(message?, code?)                // 500
```

**Usage Example:**
```typescript
// In service layer
if (!drop) {
  throw AppErrorClass.notFound('Drop not found', 'DROP_NOT_FOUND');
}

if (drop.claimedStock >= drop.totalStock) {
  throw AppErrorClass.conflict('Drop is sold out', 'DROP_SOLD_OUT');
}
```

### 3. Async Handler Wrapper

**Purpose:** Automatically catches async errors and passes them to global error handler

**Usage:**
```typescript
// In routes
router.post('/drops/:id/claim', 
  authenticate,
  validate,
  asyncHandler(ClaimController.claimDrop)  // <-- Wraps async controller
);
```

### 4. Structured Error Responses

**Standard Format:**
```json
{
  "success": false,
  "error": {
    "code": "DROP_NOT_FOUND",
    "message": "Drop not found"
  }
}
```

**Development Mode (includes details):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR", 
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "constraint": "unique"
    },
    "stack": "Error: Invalid input data\n    at ..."
  }
}
```

## Error Code Categories

### Authentication Errors (401)
- `UNAUTHORIZED` - Missing or invalid token
- `TOKEN_EXPIRED` - JWT token has expired
- `INVALID_TOKEN` - Malformed JWT token

### Authorization Errors (403)
- `FORBIDDEN` - Insufficient permissions
- `NOT_IN_WAITLIST` - User must join waitlist first
- `NOT_ELIGIBLE` - User position too low for claiming

### Validation Errors (400)
- `VALIDATION_ERROR` - Input validation failed
- `BAD_REQUEST` - Invalid request format
- `INVALID_ID` - Malformed ID parameter

### Resource Errors (404)
- `NOT_FOUND` - Generic resource not found
- `DROP_NOT_FOUND` - Specific drop not found
- `ROUTE_NOT_FOUND` - API endpoint doesn't exist

### Business Logic Errors (409)
- `CONFLICT` - Generic business rule violation
- `DROP_NOT_ACTIVE` - Drop is inactive
- `DROP_SOLD_OUT` - No stock remaining
- `CLAIM_WINDOW_NOT_STARTED` - Claiming not yet available
- `CLAIM_WINDOW_ENDED` - Claiming period finished
- `DUPLICATE_RESOURCE` - Resource already exists

### Database Errors (500)
- `DATABASE_ERROR` - Generic database operation failed
- `DATABASE_CONNECTION_ERROR` - Cannot connect to database
- `DATABASE_SCHEMA_ERROR` - Schema/migration issues

## Implementation Examples

### 1. Service Layer (Recommended)

```typescript
// src/services/claimService.ts
export class ClaimService {
  static async claimDrop(userId: string, dropId: string) {
    // Business logic with proper error throwing
    if (!drop) {
      throw AppErrorClass.notFound('Drop not found', 'DROP_NOT_FOUND');
    }
    
    if (drop.claimedStock >= drop.totalStock) {
      throw AppErrorClass.conflict('Drop is sold out', 'DROP_SOLD_OUT');
    }
    
    // ... success path
    return result;
  }
}
```

### 2. Controller Layer (Simplified)

```typescript
// src/controllers/claimController.ts  
export class ClaimController {
  static async claimDrop(req: AuthRequest, res: Response, next: NextFunction) {
    // No try-catch needed - errors automatically handled
    const result = await ClaimService.claimDrop(userId, dropId);
    
    res.status(201).json({
      success: true,
      data: result
    });
  }
}
```

### 3. Route Layer (With AsyncHandler)

```typescript
// src/routes/claim.ts
router.post('/:id/claim',
  authenticate,
  validate, 
  asyncHandler(ClaimController.claimDrop)  // <-- Catches async errors
);
```

## Prisma Error Mapping

**Common Prisma Errors:**
- `P2002` (Unique constraint) → 409 DUPLICATE_RESOURCE
- `P2025` (Record not found) → 404 RESOURCE_NOT_FOUND  
- `P2003` (Foreign key constraint) → 400 FOREIGN_KEY_CONSTRAINT
- `P2014` (Relation violation) → 400 RELATION_CONSTRAINT

## Testing Error Handling

### 1. 404 Routes
```bash
curl http://localhost:3000/non-existent
# Response: {"success":false,"error":{"code":"ROUTE_NOT_FOUND",...}}
```

### 2. Authentication Errors
```bash
curl -X POST http://localhost:3000/drops/123/claim
# Response: {"success":false,"error":"Access token required"}
```

### 3. Business Logic Errors
```bash
# Try claiming non-existent drop (with auth token)
curl -X POST http://localhost:3000/drops/invalid-id/claim \
  -H "Authorization: Bearer <token>"
# Response: {"success":false,"error":{"code":"DROP_NOT_FOUND",...}}
```

### 4. Validation Errors
```bash
# Invalid email in signup
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"123"}'
# Response: {"success":false,"error":{"code":"VALIDATION_ERROR",...}}
```

## Benefits

### 1. Consistency
- All errors follow same JSON structure
- Consistent HTTP status codes
- Predictable error codes for frontend

### 2. Developer Experience  
- Clear error messages in development
- Stack traces for debugging
- Proper error logging

### 3. Security
- No sensitive data leaked in production
- Safe error messages for end users
- Proper error code classification

### 4. Maintainability
- Centralized error handling logic
- Easy to add new error types
- Consistent error response format

### 5. Frontend Integration
- Structured errors easy to handle
- Specific error codes for UI logic
- Predictable error response format

## Next Steps

1. **Add Request ID Tracking**
   - Generate unique request IDs
   - Include in error responses
   - Log for traceability

2. **Error Monitoring Integration**  
   - Sentry or similar service
   - Error rate tracking
   - Alert on error spikes

3. **Rate Limiting Errors**
   - Specific error codes for rate limits
   - Proper retry-after headers

4. **Input Sanitization**
   - XSS protection in error messages
   - SQL injection prevention

## Current Status

✅ **Implemented:**
- Global error handler middleware
- Custom error classes with proper HTTP codes
- Prisma error mapping
- JWT error handling  
- Async error catching
- Development vs production error details
- Structured error responses
- 404 handling for undefined routes

✅ **Working Examples:**
- Service layer error throwing (ClaimService)
- Controller layer simplified (ClaimController.claimDrop)
- Route layer with asyncHandler (claim routes)
- Server integration with error middlewares

🎯 **Result:** Production-ready error handling system that provides clear, consistent, and secure error responses while maintaining excellent developer experience.