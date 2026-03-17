import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { contactsController } from './controller.js';
import { contactsListController } from './listController.js';
import { contactsSummaryController } from './summaryController.js';

export const contactsRoutes = Router();

contactsRoutes.use(authMiddleware);

contactsRoutes.post('/contacts/sync', contactsController.sync);
contactsRoutes.get('/contacts/:familyId/summary', contactsSummaryController.summary);
contactsRoutes.get('/contacts/:familyId', contactsListController.list);

