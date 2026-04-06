import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as ai from '../../lib/ai/index.js';
import { buildTransactionSmsPrompt } from '../../lib/ai/prompts/finance.js';
import { getInsightsContext, getRiskSuggestionsContext, getCategoryInsightsContext, getNarrativeSummaryContext, getAskMonthContext } from './aggregate.js';
import {
  generateInsights,
  generateRiskSuggestions,
  generateCategoryInsights,
  generateNarrativeSummary,
  answerAskMonth,
  generateCashflowTips,
  getSavingsTips,
  interpretSearchQuery,
  suggestTransactionCategory,
  suggestBillCategory,
  parseSmsToTransaction,
  parseSmsToCard,
  parseSmsToInsurance,
  parseSmsToInvestment,
  parseSmsToLoan,
} from './service.js';
import { AiModel } from '../../db/schemas/AiModel.js';
import { BankAccountModel } from '../../db/schemas/BankAccount.js';
import { CardModel } from '../../db/schemas/Card.js';
import { TransactionModel } from '../../db/schemas/Transaction.js';

type AuthRequest = Request & { auth?: { userId: string } };

function getParseAuditMetadata(parsed: unknown): {
  modelUsed: string;
  accuracy: number | null;
  status: 'parsed' | 'invalid';
} {
  const aiAvailable = ai.isAiAvailable();
  const modelUsed = aiAvailable
    ? `${ai.getActiveProvider()}:${ai.getDefaultTextModel()}`
    : 'rule_based_fallback';
  const parsedRecord = parsed && typeof parsed === 'object'
    ? parsed as { amount?: unknown }
    : null;
  const hasValidAmount =
    typeof parsedRecord?.amount === 'number'
    && parsedRecord.amount > 0;

  return {
    modelUsed,
    accuracy: hasValidAmount ? (aiAvailable ? 0.9 : 0.6) : 0,
    status: hasValidAmount ? 'parsed' : 'invalid',
  };
}

function normalizeLastFourDigits(value: string | null | undefined): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function inferPaymentSource(text: string, parsedSource?: 'account' | 'card' | 'unknown'): 'account' | 'card' | 'unknown' {
  if (parsedSource === 'account' || parsedSource === 'card') return parsedSource;
  if (/\b(card|credit card|debit card)\b/i.test(text)) return 'card';
  if (/\b(a\/c|acct|account)\b/i.test(text)) return 'account';
  return 'unknown';
}

async function findLinkedPaymentSource(familyId: string, smsText: string, parsed: {
  payment_source?: 'account' | 'card' | 'unknown';
  last_four_digits?: string;
}) {
  const last4 = normalizeLastFourDigits(parsed.last_four_digits);
  const preferredSource = inferPaymentSource(smsText, parsed.payment_source);
  const [accounts, cards] = await Promise.all([
    BankAccountModel.find({ family_id: familyId }).select('_id account_number account_name bank_name').lean(),
    CardModel.find({ family_id: familyId }).select('_id last_four_digits card_name bank_name card_type').lean(),
  ]);

  const matchedAccount = last4
    ? accounts.find((account) => normalizeLastFourDigits(account.account_number) === last4) ?? null
    : null;
  const matchedCard = last4
    ? cards.find((card) => normalizeLastFourDigits(card.last_four_digits) === last4) ?? null
    : null;

  if (preferredSource === 'account' && matchedAccount) {
    return { accounts, matchedAccount, matchedCard: null, paymentMethod: 'account' as const, matchedLast4: last4 };
  }
  if (preferredSource === 'card' && matchedCard) {
    return { accounts, matchedAccount: null, matchedCard, paymentMethod: 'card' as const, matchedLast4: last4 };
  }
  if (matchedAccount) {
    return { accounts, matchedAccount, matchedCard: null, paymentMethod: 'account' as const, matchedLast4: last4 };
  }
  if (matchedCard) {
    return { accounts, matchedAccount: null, matchedCard, paymentMethod: 'card' as const, matchedLast4: last4 };
  }

  return {
    accounts,
    matchedAccount: null,
    matchedCard: null,
    paymentMethod: preferredSource === 'account' || preferredSource === 'card' ? preferredSource : null,
    matchedLast4: last4,
  };
}

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

  async riskSuggestions(req: Request, res: Response): Promise<void> {
    const familyId = req.params.familyId as string;
    const month = (req.query.month as string) || undefined;
    if (!familyId) {
      res.fail('familyId required', 400);
      return;
    }
    try {
      const context = await getRiskSuggestionsContext(familyId, month);
      const { risks, ai_available } = await generateRiskSuggestions(context);
      res.success({ risks, ai_available });
    } catch (e) {
      console.error('[finance] riskSuggestions:', e);
      res.fail('Failed to load risk suggestions', 500);
    }
  },

  async askMonth(req: Request, res: Response): Promise<void> {
    const familyId = req.params.familyId as string;
    const body = (req.body || {}) as { question?: string; month?: string };
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!familyId) {
      res.fail('familyId required', 400);
      return;
    }
    try {
      const context = await getAskMonthContext(familyId, body.month);
      const { answer, ai_available } = await answerAskMonth(question, context);
      res.success({ answer, ai_available });
    } catch (e) {
      console.error('[finance] askMonth:', e);
      res.fail('Failed to answer question', 500);
    }
  },

  async narrativeSummary(req: Request, res: Response): Promise<void> {
    const familyId = req.params.familyId as string;
    const month = (req.query.month as string) || undefined;
    if (!familyId) {
      res.fail('familyId required', 400);
      return;
    }
    try {
      const context = await getNarrativeSummaryContext(familyId, month);
      const { narrative, ai_available } = await generateNarrativeSummary(context);
      res.success({ narrative, ai_available });
    } catch (e) {
      console.error('[finance] narrativeSummary:', e);
      res.fail('Failed to load narrative summary', 500);
    }
  },

  async cashflowTips(req: Request, res: Response): Promise<void> {
    const familyId = req.params.familyId as string;
    const month = (req.query.month as string) || undefined;
    if (!familyId) {
      res.fail('familyId required', 400);
      return;
    }
    try {
      const context = await getRiskSuggestionsContext(familyId, month);
      const { tips, ai_available } = await generateCashflowTips(context);
      res.success({ tips, ai_available });
    } catch (e) {
      console.error('[finance] cashflowTips:', e);
      res.fail('Failed to load cash-flow tips', 500);
    }
  },

  async categoryInsights(req: Request, res: Response): Promise<void> {
    const familyId = req.params.familyId as string;
    const month = (req.query.month as string) || undefined;
    if (!familyId) {
      res.fail('familyId required', 400);
      return;
    }
    try {
      const context = await getCategoryInsightsContext(familyId, month);
      const { insights, ai_available } = await generateCategoryInsights(context);
      res.success({ insights, ai_available });
    } catch (e) {
      console.error('[finance] categoryInsights:', e);
      res.fail('Failed to load category insights', 500);
    }
  },

  async interpretSearch(req: Request, res: Response): Promise<void> {
    const familyId = req.params.familyId as string;
    const body = (req.body || {}) as { q?: string; month?: string };
    const query = typeof body.q === 'string' ? body.q.trim() : '';
    if (!familyId) {
      res.fail('familyId required', 400);
      return;
    }
    try {
      const { spec, ai_available } = await interpretSearchQuery(query, body.month);
      res.success({ spec, ai_available });
    } catch (e) {
      console.error('[finance] interpretSearch:', e);
      res.fail('Failed to interpret search', 500);
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

  async smsParseHistory(req: AuthRequest, res: Response): Promise<void> {
    const familyId = req.params.familyId as string;
    const limitParam = Number(req.query.limit);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
      : 25;

    if (!familyId) {
      res.fail('familyId required', 400);
      return;
    }

    try {
      const rows = await AiModel.find({ family_id: familyId, parse_type: 'transaction_sms' })
        .sort({ date: -1, _id: -1 })
        .limit(limit)
        .lean({ virtuals: true });

      res.success(rows.map((row) => {
        const output = row.output && typeof row.output === 'object'
          ? row.output as Record<string, unknown>
          : null;
        return {
          id: row._id,
          family_id: row.family_id,
          input_text: row.input_text,
          model_used: row.model_used,
          output,
          date: row.date instanceof Date ? row.date.toISOString() : row.date,
          accuracy: row.accuracy,
          status: row.status,
          parse_type: row.parse_type,
          transaction_id: row.transaction_id,
          created_by: row.created_by,
          amount: typeof output?.amount === 'number' ? output.amount : null,
          category: typeof output?.category === 'string' ? output.category : null,
          type: typeof output?.type === 'string' ? output.type : null,
          description: typeof output?.description === 'string' ? output.description : null,
        };
      }));
    } catch (e) {
      console.error('[finance] smsParseHistory:', e);
      res.fail('Failed to load SMS parse history', 500);
    }
  },

  async smsParsePrompt(req: Request, res: Response): Promise<void> {
    const sampleInput = typeof req.query.input === 'string' && req.query.input.trim()
      ? req.query.input.trim()
      : 'Your A/c XX1234 debited with Rs.5000 on 2026-03-18 at Amazon. Avl Bal Rs.45000';

    try {
      res.success({
        prompt_id: 'finance.sms-transaction',
        label: 'Finance SMS Transaction Parser',
        prompt: buildTransactionSmsPrompt(sampleInput),
        sample_input: sampleInput,
      });
    } catch (e) {
      console.error('[finance] smsParsePrompt:', e);
      res.fail('Failed to load SMS parse prompt', 500);
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
      const auditMeta = getParseAuditMetadata(parsed);
      const auditId = uuidv4();
      await AiModel.create({
        _id: auditId,
        family_id: familyId,
        created_by: userId ?? null,
        input_text: smsText,
        model_used: auditMeta.modelUsed,
        output: parsed ? JSON.parse(JSON.stringify(parsed)) : null,
        date: new Date(),
        accuracy: auditMeta.accuracy,
        status: auditMeta.status,
        parse_type: 'transaction_sms',
        transaction_id: null,
      }); 

      console.log("Parsed SMS data:", parsed);

      if (!parsed || parsed.amount <= 0) {
        res.fail('Could not extract a valid transaction from the SMS', 400);
        return;
      }

      const link = await findLinkedPaymentSource(familyId, smsText, parsed);
      const fallbackAccountId = link.paymentMethod === 'card'
        ? null
        : link.accounts[0]?._id ?? null;
      const accountId = link.matchedAccount?._id ?? fallbackAccountId;
      const cardId = link.matchedCard?._id ?? null;
      console.log("link " , link, "accountId ", accountId, "cardId ", cardId, "fallbackAccountId",);
      const linkedPaymentSource = cardId
        ? 'card'
        : accountId
          ? 'account'
          : null;
      console.log("link " , linkedPaymentSource);
      

      const transactionDate = parsed.transaction_date
        ? new Date(parsed.transaction_date)
        : new Date();
      const id = uuidv4();
      console.log("Transaction Creating For - ",{
        _id: id,
        family_id: familyId,
        account_id: accountId,
        card_id: cardId,
        type: parsed.type,
        category: parsed.category,
        amount: parsed.amount,
        description: parsed.description ?? null,
        transaction_date: transactionDate,
        created_by: userId,
        payment_method: linkedPaymentSource,
        source_type: 'sms_parse',
      });
      
      await TransactionModel.create({
        _id: id,
        family_id: familyId,
        account_id: accountId,
        card_id: cardId,
        type: parsed.type,
        category: parsed.category,
        amount: parsed.amount,
        description: parsed.description ?? null,
        transaction_date: transactionDate,
        created_by: userId,
        payment_method: linkedPaymentSource,
        source_type: 'sms_parse',
      });
      await AiModel.updateOne(
        { _id: auditId },
        { $set: { status: 'transaction_created', transaction_id: id } }
      );
      res.success({
        parsed: {
          ...parsed,
          linked_account_id: accountId,
          linked_card_id: cardId,
          linked_payment_source: linkedPaymentSource,
          matched_last_four_digits: link.matchedLast4,
        },
        created: true,
        transaction_id: id,
        ai_model_id: auditId,
      });
    } catch (e) {
      console.error('[finance] parseSms error:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      res.fail(`Failed to parse SMS: ${errorMessage}`, 500);
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

  async parseSmsInsurance(req: Request, res: Response): Promise<void> {
    const body = req.body as { sms_text?: string };
    const smsText = body?.sms_text ?? '';
    if (!smsText.trim()) {
      res.fail('sms_text is required', 400);
      return;
    }
    try {
      const parsed = await parseSmsToInsurance(smsText);
      res.success(parsed ?? {});
    } catch (e) {
      console.error('[finance] parseSmsInsurance:', e);
      res.fail('Failed to parse insurance SMS', 500);
    }
  },

  async parseSmsInvestment(req: Request, res: Response): Promise<void> {
    const body = req.body as { sms_text?: string };
    const smsText = body?.sms_text ?? '';
    if (!smsText.trim()) {
      res.fail('sms_text is required', 400);
      return;
    }
    try {
      const parsed = await parseSmsToInvestment(smsText);
      res.success(parsed ?? {});
    } catch (e) {
      console.error('[finance] parseSmsInvestment:', e);
      res.fail('Failed to parse investment SMS', 500);
    }
  },

  async parseSmsLoan(req: Request, res: Response): Promise<void> {
    const body = req.body as { sms_text?: string };
    const smsText = body?.sms_text ?? '';
    if (!smsText.trim()) {
      res.fail('sms_text is required', 400);
      return;
    }
    try {
      const parsed = await parseSmsToLoan(smsText);
      res.success(parsed ?? {});
    } catch (e) {
      console.error('[finance] parseSmsLoan:', e);
      res.fail('Failed to parse loan SMS', 500);
    }
  },
};
