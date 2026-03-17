import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { contactsController } from './controller.js';

export const contactsRoutes = Router();

contactsRoutes.use(authMiddleware);

contactsRoutes.post('/contacts/sync', contactsController.sync);

