/**
 * Aggregate family finance data for AI insights (read-only).
 */
import { BankAccountModel } from '../../db/schemas/BankAccount.js';
import { TransactionModel } from '../../db/schemas/Transaction.js';
import { BillModel } from '../../db/schemas/Bill.js';
import type { InsightsContext } from './service.js';

export async function getInsightsContext(
  familyId: string,
  month?: string
): Promise<InsightsContext> {
  const [accounts, transactions, bills] = await Promise.all([
    BankAccountModel.find({ family_id: familyId }).lean(),
    month ? getTransactionsForMonth(familyId, month) : [],
    BillModel.find({ family_id: familyId, status: 'pending' }).lean(),
  ]);

  const total_balance = accounts.reduce((sum, a) => sum + Number(a.balance ?? 0), 0);

  const total_income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const total_expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const savings_rate =
    total_income > 0 ? ((total_income - total_expense) / total_income) * 100 : 0;

  return {
    total_balance,
    total_income,
    total_expense,
    savings_rate: Math.round(savings_rate * 100) / 100,
    upcoming_bills: bills.length,
    month,
  };
}

async function getTransactionsForMonth(
  familyId: string,
  monthStr: string
): Promise<Array<{ type: string; amount: number }>> {
  const [y, m] = monthStr.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const list = await TransactionModel.find({
    family_id: familyId,
    transaction_date: { $gte: start, $lte: end },
  })
    .select('type amount')
    .lean();
  return list as Array<{ type: string; amount: number }>;
}