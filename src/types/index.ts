import { Request } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface SignupRequest {
  email: string;
  name: string;
  surname: string;
  password: string;
  role?: 'USER' | 'ADMIN';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateDropRequest {
  title: string;
  description: string;
  imageUrl?: string;
  totalStock: number;
  claimWindowStart: string;
  claimWindowEnd: string;
}

export interface UpdateDropRequest {
  title?: string;
  description?: string;
  imageUrl?: string;
  totalStock?: number;
  claimWindowStart?: string;
  claimWindowEnd?: string;
  isActive?: boolean;
}