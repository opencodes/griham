import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { channelsController } from './controller.js';

export const channelsRoutes = Router();

channelsRoutes.use(authMiddleware);

channelsRoutes.post('/channels', channelsController.create);
channelsRoutes.get('/channels', channelsController.list);
channelsRoutes.get('/channels/:id', channelsController.get);
channelsRoutes.put('/channels/:id', channelsController.update);
channelsRoutes.delete('/channels/:id', channelsController.delete);
channelsRoutes.get('/channels/:id/stats', channelsController.getStats);
