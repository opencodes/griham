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
financeRoutes.put('/transactions/:familyId/:transactionId', financeDataController.updateTransaction);
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

// Insurance
financeRoutes.get('/insurance/:familyId/summary', financeDataController.getInsuranceSummary);
financeRoutes.get('/insurance/:familyId', financeDataController.listInsurance);
financeRoutes.post('/insurance', financeDataController.createInsurance);
financeRoutes.put('/insurance/:familyId/:insuranceId', financeDataController.updateInsurance);
financeRoutes.delete('/insurance/:familyId/:insuranceId', financeDataController.deleteInsurance);

// Investments
financeRoutes.get('/investments/:familyId/summary', financeDataController.getInvestmentSummary);
financeRoutes.get('/investments/:familyId', financeDataController.listInvestments);
financeRoutes.post('/investments', financeDataController.createInvestment);
financeRoutes.put('/investments/:familyId/:investmentId', financeDataController.updateInvestment);
financeRoutes.delete('/investments/:familyId/:investmentId', financeDataController.deleteInvestment);

// Loans
financeRoutes.get('/loans/:familyId/summary', financeDataController.getLoanSummary);
financeRoutes.get('/loans/:familyId', financeDataController.listLoans);
financeRoutes.post('/loans', financeDataController.createLoan);
financeRoutes.put('/loans/:familyId/:loanId', financeDataController.updateLoan);
financeRoutes.delete('/loans/:familyId/:loanId', financeDataController.deleteLoan);

// AI
financeRoutes.get('/ai/insights/:familyId', financeController.insights);
financeRoutes.get('/ai/risk-suggestions/:familyId', financeController.riskSuggestions);
financeRoutes.get('/ai/narrative-summary/:familyId', financeController.narrativeSummary);
financeRoutes.post('/ai/ask-month/:familyId', financeController.askMonth);
financeRoutes.get('/ai/cashflow-tips/:familyId', financeController.cashflowTips);
financeRoutes.get('/ai/category-insights/:familyId', financeController.categoryInsights);
financeRoutes.post('/ai/interpret-search/:familyId', financeController.interpretSearch);
financeRoutes.get('/ai/savings-tips/:familyId', financeController.savingsTips);
financeRoutes.post('/ai/suggest-category/:familyId', financeController.suggestCategory);
financeRoutes.post('/ai/suggest-bill-category/:familyId', financeController.suggestBillCategory);
financeRoutes.post('/ai/parse-sms/:familyId', financeController.parseSms);
financeRoutes.post('/ai/parse-sms-card/:familyId', financeController.parseSmsCard);
financeRoutes.post('/ai/parse-sms-insurance/:familyId', financeController.parseSmsInsurance);
financeRoutes.post('/ai/parse-sms-investment/:familyId', financeController.parseSmsInvestment);
financeRoutes.post('/ai/parse-sms-loan/:familyId', financeController.parseSmsLoan);
