import { Router } from 'express';
import { authController } from './controller.js';
import { authMiddleware } from '../../shared/middleware/auth.js';

export const authRoutes = Router();

authRoutes.post('/auth/register', authController.register);
authRoutes.post('/auth/login', authController.login);
authRoutes.get('/auth/me', authMiddleware, authController.me);
