import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { requireRoot } from '../../shared/middleware/requireRoot.js';
import { adminController } from './controller.js';

export const adminRoutes = Router();

adminRoutes.use(authMiddleware);
adminRoutes.use(requireRoot);

// AI prompt playground
adminRoutes.get('/ai-prompts', adminController.listPrompts);
adminRoutes.get('/ai-prompts/:id/preview', adminController.previewPrompt);
adminRoutes.post('/ai-prompts/test', adminController.testPrompt);

// Users
adminRoutes.get('/users', adminController.listUsers);
adminRoutes.post('/users', adminController.createAdmin);
adminRoutes.put('/users/:id/reset-password', adminController.resetPassword);
adminRoutes.get('/users/:id/roles', adminController.getUserRoles);
adminRoutes.put('/users/:id/roles', adminController.setUserRoles);

// Roles
adminRoutes.get('/roles', adminController.listRoles);
adminRoutes.get('/roles/:id', adminController.getRole);
adminRoutes.post('/roles', adminController.createRole);
adminRoutes.put('/roles/:id', adminController.updateRole);
adminRoutes.delete('/roles/:id', adminController.deleteRole);
adminRoutes.put('/roles/:id/permissions', adminController.setRolePermissions);

// Permissions
adminRoutes.get('/permissions', adminController.listPermissions);
adminRoutes.get('/permissions/:id', adminController.getPermission);
adminRoutes.post('/permissions', adminController.createPermission);
adminRoutes.put('/permissions/:id', adminController.updatePermission);
adminRoutes.delete('/permissions/:id', adminController.deletePermission);

// Groups
adminRoutes.get('/groups', adminController.listGroups);
adminRoutes.get('/groups/:id', adminController.getGroup);
adminRoutes.post('/groups', adminController.createGroup);
adminRoutes.put('/groups/:id', adminController.updateGroup);
adminRoutes.delete('/groups/:id', adminController.deleteGroup);
adminRoutes.put('/groups/:id/members', adminController.setGroupMembers);
adminRoutes.put('/groups/:id/roles', adminController.setGroupRoles);
