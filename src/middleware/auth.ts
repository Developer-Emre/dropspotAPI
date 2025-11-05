import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthRequest, ApiResponse } from '../types';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.get('Authorization');
    const token = AuthService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      } as ApiResponse);
      return;
    }

    const payload = AuthService.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    } as ApiResponse);
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    } as ApiResponse);
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    } as ApiResponse);
    return;
  }

  next();
};