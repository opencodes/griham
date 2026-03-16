import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { financeController } from './controller.js';
import { financeDataController } from './dataController.js';

export const financeRoutes = Router();

financeRoutes.use(authMiddleware);

// Accounts
financeRoutes.get('/accounts/:familyId', financeDataController.listAccounts);
financeRoutes.post('/accounts', financeDataController.createAccount);
financeRoutes.put('/accounts/:familyId/:accountId', financeDataController.updateAccount);
financeRoutes.delete('/accounts/:familyId/:accountId', financeDataController.deleteAccount);

// Transactions
financeRoutes.get('/transactions/:familyId/summary', financeDataController.getSummary);
financeRoutes.get('/transactions/:familyId', financeDataController.listTransactions);
financeRoutes.post('/transactions', financeDataController.createTransaction);
financeRoutes.delete('/transactions/:familyId/:transactionId', financeDataController.deleteTransaction);

// Bills
financeRoutes.get('/bills/:familyId/upcoming', financeDataController.getUpcomingBills);
financeRoutes.get('/bills/:familyId', financeDataController.listBills);
financeRoutes.post('/bills', financeDataController.createBill);
financeRoutes.put('/bills/:familyId/:billId', financeDataController.updateBill);
financeRoutes.delete('/bills/:familyId/:billId', financeDataController.deleteBill);

// Cards
financeRoutes.get('/cards/:familyId', financeDataController.listCards);
financeRoutes.post('/cards', financeDataController.createCard);
financeRoutes.put('/cards/:familyId/:cardId', financeDataController.updateCard);
financeRoutes.delete('/cards/:familyId/:cardId', financeDataController.deleteCard);

// AI
financeRoutes.get('/ai/insights/:familyId', financeController.insights);
financeRoutes.get('/ai/savings-tips/:familyId', financeController.savingsTips);
financeRoutes.post('/ai/suggest-category/:familyId', financeController.suggestCategory);
financeRoutes.post('/ai/suggest-bill-category/:familyId', financeController.suggestBillCategory);
financeRoutes.post('/ai/parse-sms/:familyId', financeController.parseSms);
financeRoutes.post('/ai/parse-sms-card/:familyId', financeController.parseSmsCard);