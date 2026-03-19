import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { assetsController } from './controller.js';

export const assetsRoutes = Router();

assetsRoutes.use(authMiddleware);

assetsRoutes.get('/:familyId/expiring-documents', assetsController.expiringDocuments);
assetsRoutes.get('/:familyId/vehicles/service-due', assetsController.serviceDue);
assetsRoutes.get('/:familyId/valuation', assetsController.valuation);
assetsRoutes.get('/:familyId/:assetId', assetsController.get);
assetsRoutes.get('/:familyId', assetsController.list);
assetsRoutes.post('/', assetsController.create);
assetsRoutes.put('/:familyId/:assetId', assetsController.update);
assetsRoutes.delete('/:familyId/:assetId', assetsController.remove);
