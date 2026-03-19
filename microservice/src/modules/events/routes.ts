import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { eventsController } from './controller.js';

export const eventsRoutes = Router();

eventsRoutes.use(authMiddleware);

eventsRoutes.post('/', eventsController.create);
eventsRoutes.get('/', eventsController.list);
eventsRoutes.post('/:id/sub-events', eventsController.createSubEvent);
eventsRoutes.get('/:id/sub-events', eventsController.listSubEvents);
eventsRoutes.post('/:id/participants', eventsController.createParticipant);
eventsRoutes.get('/:id/participants', eventsController.listParticipants);
eventsRoutes.get('/:id/finance-summary', eventsController.financeSummary);
eventsRoutes.get('/:id/ai-insights', eventsController.aiInsightPlaceholder);
eventsRoutes.get('/:id', eventsController.get);
eventsRoutes.patch('/:id', eventsController.update);
eventsRoutes.delete('/:id', eventsController.remove);
