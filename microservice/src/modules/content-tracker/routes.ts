import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { contentTrackerController } from './controller.js';

export const contentTrackerRoutes = Router();

contentTrackerRoutes.use(authMiddleware);

contentTrackerRoutes.post('/content-tracker', contentTrackerController.create);
contentTrackerRoutes.get('/content-tracker', contentTrackerController.list);
contentTrackerRoutes.get('/content-tracker/:id', contentTrackerController.get);
contentTrackerRoutes.patch('/content-tracker/:id', contentTrackerController.update);
contentTrackerRoutes.delete('/content-tracker/:id', contentTrackerController.delete);
