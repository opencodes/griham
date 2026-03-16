import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getInsightsContext } from './aggregate.js';
import {
  generateInsights,
  getSavingsTips,
  suggestTransactionCategory,
  suggestBillCategory,
  parseSmsToTransaction,
  parseSmsToCard,
} from './service.js';
import { BankAccountModel } from '../../db/schemas/BankAccount.js';
import { TransactionModel } from '../../db/schemas/Transaction.js';

type AuthRequest = Request & { auth?: { userId: string } };

export const financeController = {
  async insights(req: Request, res: Response): Promise<void> {
    const familyId = req.params.familyId as string;
    const month = (req.query.month as string) || undefined;
    if (!familyId) {
      res.fail('familyId required', 400);
      return;
    }
    try {
      const context = await getInsightsContext(familyId, month);
      const { insights, ai_available } = await generateInsights(context);
      res.success({
        data: {
          total_balance: context.total_balance,
          total_income: context.total_income,
          total_expense: context.total_expense,
          savings_rate: context.savings_rate,
          upcoming_bills: context.upcoming_bills,
        },
        insights,
        ai_available,
      });
    } catch (e) {
      console.error('[finance] insights:', e);
      res.fail('Failed to load insights', 500);
    }
  },

  async savingsTips(_req: Request, res: Response): Promise<void> {
    try {
      const { tips, ai_available } = await getSavingsTips();
      res.success({ tips, ai_available });
    } catch (e) {
      console.error('[finance] savingsTips:', e);
      res.fail('Failed to get tips', 500);
    }
  },

  async suggestCategory(req: Request, res: Response): Promise<void> {
    const body = req.body as { description?: string; amount?: number; type?: string };
    const description = body?.description ?? '';
    try {
      const result = await suggestTransactionCategory(
        description,
        body?.amount,
        body?.type as 'income' | 'expense' | undefined
      );
      res.success(result);
    } catch (e) {
      console.error('[finance] suggestCategory:', e);
      res.fail('Failed to suggest category', 500);
    }
  },

  async suggestBillCategory(req: Request, res: Response): Promise<void> {
    const body = req.body as { bill_name?: string };
    const bill_name = body?.bill_name ?? '';
    try {
      const result = await suggestBillCategory(bill_name);
      res.success(result);
    } catch (e) {
      console.error('[finance] suggestBillCategory:', e);
      res.fail('Failed to suggest bill category', 500);
    }
  },

  async parseSms(req: AuthRequest, res: Response): Promise<void> {
    const familyId = req.params.familyId as string;
    const body = req.body as { sms_text?: string };
    const smsText = body?.sms_text ?? '';
    const userId = req.auth?.userId;

    if (!familyId || !smsText.trim()) {
      res.fail('familyId and sms_text are required', 400);
      return;
    }

    try {
      const parsed = await parseSmsToTransaction(smsText);
      if (!parsed || parsed.amount <= 0) {
        res.fail('Could not extract a valid transaction from the SMS', 400);
        return;
      }

      const accounts = await BankAccountModel.find({ family_id: familyId }).limit(1).lean();
      const accountId = accounts[0]?._id;
      if (!accountId || !userId) {
        res.success({
          parsed,
          created: false,
          message: 'Add a bank account and ensure you are logged in to auto-create the transaction.',
        });
        return;
      }

      const transactionDate = parsed.transaction_date
        ? new Date(parsed.transaction_date)
        : new Date();
      const id = uuidv4();
      await TransactionModel.create({
        _id: id,
        family_id: familyId,
        account_id: accountId,
        type: parsed.type,
        category: parsed.category,
        amount: parsed.amount,
        description: parsed.description ?? null,
        transaction_date: transactionDate,
        created_by: userId,
      });
      res.success({ parsed, created: true, transaction_id: id });
    } catch (e) {
      console.error('[finance] parseSms:', e);
      res.fail('Failed to parse SMS', 500);
    }
  },

  async parseSmsCard(req: Request, res: Response): Promise<void> {
    const body = req.body as { sms_text?: string };
    const smsText = body?.sms_text ?? '';

    if (!smsText.trim()) {
      res.fail('sms_text is required', 400);
      return;
    }

    try {
      const parsed = await parseSmsToCard(smsText);
      res.success(parsed ?? {});
    } catch (e) {
      console.error('[finance] parseSmsCard:', e);
      res.fail('Failed to parse card SMS', 500);
    }
  },
};