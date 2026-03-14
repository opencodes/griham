import type { Request, Response } from 'express';
import { BankAccountModel } from '../../db/schemas/BankAccount.js';
import { TransactionModel } from '../../db/schemas/Transaction.js';

export const financeController = {
  async health(_req: Request, res: Response): Promise<void> {
    res.success({ status: 'ok' });
  },

  async listAccounts(req: Request, res: Response): Promise<void> {
    const familyId = req.query.family_id as string | undefined;
    if (!familyId) {
      res.fail('family_id is required', 400);
      return;
    }
    const accounts = await BankAccountModel.find({ family_id: familyId }).lean();
    res.success(accounts);
  },

  async listTransactions(req: Request, res: Response): Promise<void> {
    const familyId = req.query.family_id as string | undefined;
    if (!familyId) {
      res.fail('family_id is required', 400);
      return;
    }
    const transactions = await TransactionModel.find({ family_id: familyId }).lean();
    res.success(transactions);
  },
};
