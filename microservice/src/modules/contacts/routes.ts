import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { contactsController } from './controller.js';
import { contactsListController } from './listController.js';
import { contactsSummaryController } from './summaryController.js';
import { contactsCleanupController } from './cleanupController.js';
import { contactsMutateController } from './mutateController.js';

export const contactsRoutes = Router();

contactsRoutes.use(authMiddleware);

contactsRoutes.post('/contacts/sync', contactsController.sync);
contactsRoutes.get('/contacts/:familyId/summary', contactsSummaryController.summary);
contactsRoutes.get('/contacts/:familyId', contactsListController.list);
contactsRoutes.get('/contacts/:familyId/cleanup-suggestions', contactsCleanupController.suggestions);
contactsRoutes.post('/contacts/:familyId/cleanup-apply', contactsCleanupController.apply);
contactsRoutes.patch('/contacts/:id', contactsMutateController.update);
contactsRoutes.delete('/contacts/:id', contactsMutateController.remove);
