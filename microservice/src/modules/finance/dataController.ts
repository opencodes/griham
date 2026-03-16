import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BankAccountModel } from '../../db/schemas/BankAccount.js';
import { TransactionModel } from '../../db/schemas/Transaction.js';
import { BillModel } from '../../db/schemas/Bill.js';
import { CardModel } from '../../db/schemas/Card.js';

type AuthRequest = Request & { auth?: { userId: string } };

function toId<T extends { _id: string }>(doc: T) {
  return { ...doc, id: doc._id } as T & { id: string };
}

export const financeDataController = {
  // Accounts
  async listAccounts(req: Request, res: Response): Promise<void> {
    const list = await BankAccountModel.find({ family_id: req.params.familyId }).lean();
    res.success(list.map((a) => toId(a)));
  },

  async createAccount(req: AuthRequest, res: Response): Promise<void> {
    const body = req.body as {
      family_id?: string;
      account_name?: string;
      account_number?: string;
      bank_name?: string;
      account_type?: string;
      balance?: number;
      currency?: string;
    };
    const family_id = body.family_id;
    if (!family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    const id = uuidv4();
    await BankAccountModel.create({
      _id: id,
      family_id,
      account_name: body.account_name ?? 'Account',
      account_number: body.account_number ?? null,
      bank_name: body.bank_name ?? 'Bank',
      account_type: body.account_type ?? 'savings',
      balance: Number(body.balance) ?? 0,
      currency: body.currency ?? 'INR',
    });
    const account = await BankAccountModel.findById(id).lean();
    res.success(account ? toId(account) : null, 'Created', 201);
  },

  async updateAccount(req: Request, res: Response): Promise<void> {
    const { familyId, accountId } = req.params;
    const account = await BankAccountModel.findOne({ _id: accountId, family_id: familyId });
    if (!account) {
      res.fail('Account not found', 404);
      return;
    }
    const body = req.body as Partial<{ account_name: string; account_number: string; bank_name: string; account_type: string; balance: number; currency: string }>;
    if (body.account_name !== undefined) account.account_name = body.account_name;
    if (body.account_number !== undefined) account.account_number = body.account_number;
    if (body.bank_name !== undefined) account.bank_name = body.bank_name;
    if (body.account_type !== undefined) account.account_type = body.account_type;
    if (body.balance !== undefined) account.balance = body.balance;
    if (body.currency !== undefined) account.currency = body.currency;
    await account.save();
    res.success(toId(account.toObject()));
  },

  async deleteAccount(req: Request, res: Response): Promise<void> {
    const { familyId, accountId } = req.params;
    const deleted = await BankAccountModel.findOneAndDelete({ _id: accountId, family_id: familyId });
    if (!deleted) {
      res.fail('Account not found', 404);
      return;
    }
    res.success({ ok: true });
  },

  // Transactions
  async listTransactions(req: Request, res: Response): Promise<void> {
    const { familyId } = req.params;
    const { type, category, month } = req.query as { type?: string; category?: string; month?: string };
    const filter: Record<string, unknown> = { family_id: familyId };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      filter.transaction_date = {
        $gte: new Date(y, m - 1, 1),
        $lte: new Date(y, m, 0),
      };
    }
    const list = await TransactionModel.find(filter).sort({ transaction_date: -1 }).lean();
    res.success(list.map((t) => ({ ...toId(t), transaction_date: t.transaction_date instanceof Date ? t.transaction_date.toISOString().slice(0, 10) : t.transaction_date })));
  },

  async getSummary(req: Request, res: Response): Promise<void> {
    const { familyId } = req.params;
    const month = req.query.month as string | undefined;
    const filter: Record<string, unknown> = { family_id: familyId };
    if (month) {
      const [y, m] = month.split('-').map(Number);
      filter.transaction_date = { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0) };
    }
    const list = await TransactionModel.find(filter).select('type amount').lean();
    const total_income = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const total_expense = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    res.success({ total_income, total_expense, balance: total_income - total_expense });
  },

  async createTransaction(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.auth?.userId ?? '';
    const body = req.body as {
      family_id?: string;
      account_id?: string;
      type?: 'income' | 'expense';
      category?: string;
      amount?: number;
      description?: string;
      transaction_date?: string;
    };
    const family_id = body.family_id;
    if (!family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    const id = uuidv4();
    const transaction_date = body.transaction_date ? new Date(body.transaction_date) : new Date();
    await TransactionModel.create({
      _id: id,
      family_id,
      account_id: body.account_id ?? (await BankAccountModel.findOne({ family_id }).select('_id').then((a) => a?._id)) ?? '',
      type: body.type ?? 'expense',
      category: body.category ?? 'Other',
      amount: Number(body.amount) ?? 0,
      description: body.description ?? null,
      transaction_date,
      created_by: userId,
    });
    const tx = await TransactionModel.findById(id).lean();
    if (!tx) {
      res.fail('Failed to create transaction', 500);
      return;
    }
    res.success({ ...toId(tx), transaction_date: tx.transaction_date instanceof Date ? tx.transaction_date.toISOString().slice(0, 10) : tx.transaction_date }, 'Created', 201);
  },

  async deleteTransaction(req: Request, res: Response): Promise<void> {
    const { familyId, transactionId } = req.params;
    const deleted = await TransactionModel.findOneAndDelete({ _id: transactionId, family_id: familyId });
    if (!deleted) {
      res.fail('Transaction not found', 404);
      return;
    }
    res.success({ ok: true });
  },

  // Bills
  async listBills(req: Request, res: Response): Promise<void> {
    const list = await BillModel.find({ family_id: req.params.familyId }).lean();
    res.success(list.map((b) => ({ ...toId(b), due_date: b.due_date instanceof Date ? b.due_date.toISOString().slice(0, 10) : b.due_date })));
  },

  async getUpcomingBills(req: Request, res: Response): Promise<void> {
    const list = await BillModel.find({ family_id: req.params.familyId, status: 'pending' }).lean();
    res.success(list.map((b) => ({ ...toId(b), due_date: b.due_date instanceof Date ? b.due_date.toISOString().slice(0, 10) : b.due_date })));
  },

  async createBill(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      family_id?: string;
      bill_name?: string;
      category?: string;
      amount?: number;
      due_date?: string;
      is_recurring?: boolean;
      recurrence_pattern?: string;
      status?: string;
    };
    const family_id = body.family_id;
    if (!family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    const id = uuidv4();
    const due_date = body.due_date ? new Date(body.due_date) : new Date();
    await BillModel.create({
      _id: id,
      family_id,
      bill_name: body.bill_name ?? 'Bill',
      category: body.category ?? 'Other',
      amount: Number(body.amount) ?? 0,
      due_date,
      is_recurring: Boolean(body.is_recurring),
      recurrence_pattern: body.recurrence_pattern ?? null,
      status: body.status ?? 'pending',
    });
    const bill = await BillModel.findById(id).lean();
    if (!bill) {
      res.fail('Failed to create bill', 500);
      return;
    }
    res.success({ ...toId(bill), due_date: bill.due_date instanceof Date ? bill.due_date.toISOString().slice(0, 10) : bill.due_date }, 'Created', 201);
  },

  async updateBill(req: Request, res: Response): Promise<void> {
    const { familyId, billId } = req.params;
    const bill = await BillModel.findOne({ _id: billId, family_id: familyId });
    if (!bill) {
      res.fail('Bill not found', 404);
      return;
    }
    const body = req.body as Partial<{ bill_name: string; category: string; amount: number; due_date: string; is_recurring: boolean; recurrence_pattern: string; status: string }>;
    if (body.bill_name !== undefined) bill.bill_name = body.bill_name;
    if (body.category !== undefined) bill.category = body.category;
    if (body.amount !== undefined) bill.amount = body.amount;
    if (body.due_date !== undefined) bill.due_date = new Date(body.due_date);
    if (body.is_recurring !== undefined) bill.is_recurring = body.is_recurring;
    if (body.recurrence_pattern !== undefined) bill.recurrence_pattern = body.recurrence_pattern;
    if (body.status !== undefined) bill.status = body.status;
    await bill.save();
    const updated = bill.toObject();
    res.success({ ...toId(updated), due_date: updated.due_date instanceof Date ? updated.due_date.toISOString().slice(0, 10) : updated.due_date });
  },

  async deleteBill(req: Request, res: Response): Promise<void> {
    const { familyId, billId } = req.params;
    const deleted = await BillModel.findOneAndDelete({ _id: billId, family_id: familyId });
    if (!deleted) {
      res.fail('Bill not found', 404);
      return;
    }
    res.success({ ok: true });
  },

  // Cards
  async listCards(req: Request, res: Response): Promise<void> {
    const list = await CardModel.find({ family_id: req.params.familyId }).lean();
    res.success(list.map((c) => toId(c)));
  },

  async createCard(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      family_id?: string;
      card_type?: 'credit' | 'debit';
      bank_name?: string;
      card_name?: string;
      last_four_digits?: string;
      card_limit?: number;
      billing_date?: number;
      status?: string;
    };
    const family_id = body.family_id;
    if (!family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    const id = uuidv4();
    await CardModel.create({
      _id: id,
      family_id,
      card_type: body.card_type ?? 'debit',
      bank_name: body.bank_name ?? 'Bank',
      card_name: body.card_name ?? 'Card',
      last_four_digits: body.last_four_digits ?? '0000',
      card_limit: body.card_limit ?? null,
      billing_date: body.billing_date ?? null,
      status: (body.status as 'active' | 'inactive' | 'blocked') ?? 'active',
    });
    const card = await CardModel.findById(id).lean();
    res.success(card ? toId(card) : null, 'Created', 201);
  },

  async updateCard(req: Request, res: Response): Promise<void> {
    const { familyId, cardId } = req.params;
    const card = await CardModel.findOne({ _id: cardId, family_id: familyId });
    if (!card) {
      res.fail('Card not found', 404);
      return;
    }
    const body = req.body as Partial<{ card_type: string; bank_name: string; card_name: string; last_four_digits: string; card_limit: number; billing_date: number; status: string }>;
    if (body.card_type !== undefined) card.card_type = body.card_type as 'credit' | 'debit';
    if (body.bank_name !== undefined) card.bank_name = body.bank_name;
    if (body.card_name !== undefined) card.card_name = body.card_name;
    if (body.last_four_digits !== undefined) card.last_four_digits = body.last_four_digits;
    if (body.card_limit !== undefined) card.card_limit = body.card_limit;
    if (body.billing_date !== undefined) card.billing_date = body.billing_date;
    if (body.status !== undefined) card.status = body.status as 'active' | 'inactive' | 'blocked';
    await card.save();
    res.success(toId(card.toObject()));
  },

  async deleteCard(req: Request, res: Response): Promise<void> {
    const { familyId, cardId } = req.params;
    const deleted = await CardModel.findOneAndDelete({ _id: cardId, family_id: familyId });
    if (!deleted) {
      res.fail('Card not found', 404);
      return;
    }
    res.success({ ok: true });
  },
};