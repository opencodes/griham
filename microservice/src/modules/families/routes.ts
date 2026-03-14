import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { familiesController } from './controller.js';

export const familiesRoutes = Router();

familiesRoutes.use(authMiddleware);

familiesRoutes.post('/families', familiesController.create);
familiesRoutes.get('/families', familiesController.list);
familiesRoutes.get('/families/me', familiesController.getCurrent);
familiesRoutes.get('/families/:id', familiesController.get);
familiesRoutes.put('/families/:id', familiesController.updateAddress);
familiesRoutes.get('/families/:id/members', familiesController.listMembers);
familiesRoutes.post('/families/:id/members', familiesController.addMember);
familiesRoutes.put('/families/:householdId/members/:memberId', familiesController.updateMember);

// Backend alias: /households/* -> same as /families/*
familiesRoutes.get('/households/:id', familiesController.get);
familiesRoutes.put('/households/:id', familiesController.updateAddress);
familiesRoutes.get('/households/:id/members', familiesController.listMembers);
familiesRoutes.post('/households/:id/members', familiesController.addMember);
