import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/authService';
import { SignupRequest, LoginRequest, ApiResponse } from '../types';
import { UserRole } from '@prisma/client';
import prisma from '../utils/db';

export class AuthController {
  static async signup(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          data: errors.array()
        } as ApiResponse);
        return;
      }

      const { email, name, surname, password, role }: SignupRequest = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        } as ApiResponse);
        return;
      }

      // Determine user role - only allow ADMIN in development or with admin secret
      let userRole: UserRole = UserRole.USER;
      if (role === 'ADMIN') {
        // Check if this is development environment OR admin secret is provided
        const isDevEnvironment = process.env.NODE_ENV === 'development';
        const adminSecret = req.headers['x-admin-secret'] as string;
        const validAdminSecret = process.env.ADMIN_SECRET || 'dev-admin-secret';
        
        if (isDevEnvironment || adminSecret === validAdminSecret) {
          userRole = UserRole.ADMIN;
        } else {
          res.status(403).json({
            success: false,
            error: 'Unauthorized to create admin user'
          } as ApiResponse);
          return;
        }
      }

      // Hash password and create user
      const passwordHash = await AuthService.hashPassword(password);
      
      const user = await prisma.user.create({
        data: {
          email,
          name: name.trim(),
          surname: surname.trim(),
          passwordHash,
          role: userRole
        },
        select: {
          id: true,
          email: true,
          name: true,
          surname: true,
          role: true,
          createdAt: true
        }
      });

      // Generate JWT token
      const token = AuthService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          token
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          data: errors.array()
        } as ApiResponse);
        return;
      }

      const { email, password }: LoginRequest = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        } as ApiResponse);
        return;
      }

      // Verify password
      const isValidPassword = await AuthService.comparePassword(password, user.passwordHash);
      
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        } as ApiResponse);
        return;
      }

      // Generate JWT token
      const token = AuthService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            surname: user.surname,
            role: user.role,
            createdAt: user.createdAt
          },
          token
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }
}