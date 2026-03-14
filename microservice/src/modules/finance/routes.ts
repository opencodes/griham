import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { financeController } from './controller.js';

export const financeRoutes = Router();

financeRoutes.use(authMiddleware);

financeRoutes.get('/health', financeController.health);
financeRoutes.get('/accounts', financeController.listAccounts);
financeRoutes.get('/transactions', financeController.listTransactions);
