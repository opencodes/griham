import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { householdAPI, financeAPI, BankAccount, Transaction, Bill, CategoryInsightItem, Card, Insurance, Investment, Loan } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { FinanceMonthFilter } from '@/components/FinanceMonthFilter';
import { useFinanceMonth } from '@/contexts/FinanceMonthContext';
import { Wallet, TrendingUp, TrendingDown, AlertCircle, CreditCard, Sparkles, Send, Shield, Landmark, ArrowUpRight, CheckCircle2 } from 'lucide-react';

const getCategoryIcon = (category?: string) => {
  const value = (category || '').toLowerCase();

  if (value.includes('grocery')) return '🛒';
  if (value.includes('medical') || value.includes('health')) return '💊';
  if (value.includes('food') || value.includes('dining')) return '☕';
  if (value.includes('transport') || value.includes('travel')) return '🚕';
  if (value.includes('emi') || value.includes('loan')) return '📄';
  if (value.includes('subscription')) return '🎵';
  if (value.includes('shopping')) return '🛍️';
  if (value.includes('rent') || value.includes('home')) return '🏠';
  if (value.includes('entertainment')) return '🎬';
  if (value.includes('salary') || value.includes('income')) return '💰';

  return '💳';
};

const formatAmount = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
};

const UPCOMING_WINDOW_DAYS = 30;

const toDateOnly = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const parseDateInput = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : toDateOnly(date);
};

const daysUntil = (value?: string | null) => {
  const due = parseDateInput(value);
  if (!due) return null;
  const today = toDateOnly(new Date());
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getNextSipDate = (sipDay?: number) => {
  if (!sipDay || sipDay < 1) return null;
  const today = toDateOnly(new Date());
  const year = today.getFullYear();
  const month = today.getMonth();
  const currentMonthLastDay = new Date(year, month + 1, 0).getDate();
  const thisMonthDate = new Date(year, month, Math.min(sipDay, currentMonthLastDay));
  if (thisMonthDate >= today) return thisMonthDate;
  const nextMonthLastDay = new Date(year, month + 2, 0).getDate();
  return new Date(year, month + 1, Math.min(sipDay, nextMonthLastDay));
};

const getNextCardStatementDate = (billingDate?: number) => {
  if (!billingDate || billingDate < 1) return null;
  const today = toDateOnly(new Date());
  const year = today.getFullYear();
  const month = today.getMonth();
  const currentMonthLastDay = new Date(year, month + 1, 0).getDate();
  const thisMonthDate = new Date(year, month, Math.min(billingDate, currentMonthLastDay));
  if (thisMonthDate >= today) return thisMonthDate;
  const nextMonthLastDay = new Date(year, month + 2, 0).getDate();
  return new Date(year, month + 1, Math.min(billingDate, nextMonthLastDay));
};

const formatDueDay = (date: Date | null) => {
  if (!date) return '--';
  const today = new Date();
  const sameMonth = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  if (!sameMonth) {
    const day = date.getDate();
    const suffix = day >= 11 && day <= 13
      ? 'th'
      : day % 10 === 1
        ? 'st'
        : day % 10 === 2
          ? 'nd'
          : day % 10 === 3
            ? 'rd'
            : 'th';
    return `${day}${suffix} ${date.toLocaleDateString('en-IN', { month: 'short' })}`;
  }
  return date.toLocaleDateString('en-IN', { day: '2-digit' });
};

type UpcomingManagedExpenseItem = {
  id: string;
  kind: 'loan' | 'investment' | 'insurance' | 'card';
  dueDay: string;
  isOverdue: boolean;
  isDueSoon: boolean;
  category: string;
  itemIdLabel: string;
  amount: number;
  dueDate: Date | null;
  sortTime: number;
};

export default function FinanceOverview() {
  const navigate = useNavigate();
  const { month } = useFinanceMonth();
  const [activeTab, setActiveTab] = useState('finance');
  const [insightTab, setInsightTab] = useState<'summary' | 'categories' | 'ask'>('summary');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState<string>('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [insurance, setInsurance] = useState<Insurance[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0 });
  const [narrativeSummary, setNarrativeSummary] = useState<string | null>(null);
  const [narrativeSummaryLoading, setNarrativeSummaryLoading] = useState(false);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsightItem[]>([]);
  const [categoryInsightsLoading, setCategoryInsightsLoading] = useState(false);
  const [askQuestion, setAskQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [dismissedUpcomingExpenseIds, setDismissedUpcomingExpenseIds] = useState<string[]>([]);

  useEffect(() => {
    void loadFamily();
  }, []);

  useEffect(() => {
    if (familyId) {
      void loadAccounts();
      void loadUpcomingBills();
      void loadUpcomingExpenseSources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  useEffect(() => {
    if (familyId) {
      void loadTransactions();
      void loadSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, month]);

  useEffect(() => {
    if (!familyId) return;
    let cancelled = false;
    setNarrativeSummaryLoading(true);
    setNarrativeSummary(null);
    financeAPI.getNarrativeSummary(familyId, month).then((res) => {
      if (!cancelled && res?.narrative) setNarrativeSummary(res.narrative);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setNarrativeSummaryLoading(false);
    });
    return () => { cancelled = true; };
  }, [familyId, month]);

  useEffect(() => {
    setDismissedUpcomingExpenseIds([]);
  }, [familyId, month]);

  useEffect(() => {
    if (!familyId) return;
    let cancelled = false;
    setCategoryInsightsLoading(true);
    setCategoryInsights([]);
    financeAPI.getCategoryInsights(familyId, month).then((res) => {
      if (!cancelled && Array.isArray(res?.insights)) setCategoryInsights(res.insights);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setCategoryInsightsLoading(false);
    });
    return () => { cancelled = true; };
  }, [familyId, month]);

  const loadFamily = async () => {
    try {
      const families = await householdAPI.list();
      if (families.length > 0) {
        setFamilyId(families[0].id);
      }
    } catch (error) {
      console.error('Failed to load family', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await financeAPI.listAccounts(familyId);
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const data = await financeAPI.listTransactions(familyId, { month });
      setMonthTransactions(data);
      setRecentTransactions(data.slice(0, 5));
    } catch (error) {
      console.error('Failed to load transactions', error);
    }
  };

  const loadUpcomingExpenseSources = async () => {
    try {
      const [cardData, insuranceData, investmentData, loanData] = await Promise.all([
        financeAPI.listCards(familyId),
        financeAPI.listInsurance(familyId),
        financeAPI.listInvestments(familyId),
        financeAPI.listLoans(familyId),
      ]);
      setCards(cardData);
      setInsurance(insuranceData);
      setInvestments(investmentData);
      setLoans(loanData);
    } catch (error) {
      console.error('Failed to load upcoming expense sources', error);
    }
  };

  const loadUpcomingBills = async () => {
    try {
      const data = await financeAPI.getUpcomingBills(familyId);
      setUpcomingBills(data);
    } catch (error) {
      console.error('Failed to load bills', error);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await financeAPI.getSummary(familyId, month);
      setSummary(data);
    } catch (error) {
      console.error('Failed to load summary', error);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance.toString()), 0);

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = askQuestion.trim();
    if (!q || !familyId || askLoading) return;
    setAskLoading(true);
    setAskAnswer(null);
    setLastQuestion(q);
    try {
      const res = await financeAPI.askAboutMonth(familyId, { question: q, month });
      setAskAnswer(res?.answer ?? 'Could not get an answer.');
      setAskQuestion('');
    } catch {
      setAskAnswer('Something went wrong. Please try again.');
    } finally {
      setAskLoading(false);
    }
  };

  const savingsRate = summary.total_income > 0
    ? ((summary.total_income - summary.total_expense) / summary.total_income) * 100
    : 0;

  const upcomingManagedExpenseItems: UpcomingManagedExpenseItem[] = [
    ...loans.flatMap((loan) => {
      const days = daysUntil(loan.nextDueDate);
      const dueDate = parseDateInput(loan.nextDueDate);
      if (loan.status !== 'active' || days === null || days < 0 || days > UPCOMING_WINDOW_DAYS) return [];
      return [{
        id: `loan:${loan.id}`,
        kind: 'loan' as const,
        dueDay: formatDueDay(dueDate),
        isOverdue: (days ?? 0) < 0,
        isDueSoon: (days ?? Number.MAX_SAFE_INTEGER) >= 0 && (days ?? Number.MAX_SAFE_INTEGER) < 7,
        category: 'Loan EMI',
        itemIdLabel: loan.lender ? `${loan.lender} • ${loan.id.slice(-4)}` : loan.id.slice(-4),
        amount: Number(loan.emiAmount || 0),
        dueDate,
        sortTime: dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER,
      }];
    }),
    ...investments.flatMap((item) => {
      if (item.status !== 'active') return [];
      const nextSipDate = getNextSipDate(item.sipDay);
      if (!nextSipDate) return [];
      const today = toDateOnly(new Date());
      const diffDays = Math.ceil((nextSipDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0 || diffDays > UPCOMING_WINDOW_DAYS) return [];
      return [{
        id: `investment:${item.id}`,
        kind: 'investment' as const,
        dueDay: formatDueDay(nextSipDate),
        isOverdue: diffDays < 0,
        isDueSoon: diffDays >= 0 && diffDays < 7,
        category: 'Investment SIP',
        itemIdLabel: item.name ? `${item.name} • ${item.id.slice(-4)}` : item.id.slice(-4),
        amount: Number(item.sipAmount || 0),
        dueDate: nextSipDate,
        sortTime: nextSipDate.getTime(),
      }];
    }),
    ...insurance.flatMap((item) => {
      const days = daysUntil(item.nextDueDate);
      const dueDate = parseDateInput(item.nextDueDate);
      if (item.status !== 'active' || days === null || days < 0 || days > UPCOMING_WINDOW_DAYS) return [];
      return [{
        id: `insurance:${item.id}`,
        kind: 'insurance' as const,
        dueDay: formatDueDay(dueDate),
        isOverdue: (days ?? 0) < 0,
        isDueSoon: (days ?? Number.MAX_SAFE_INTEGER) >= 0 && (days ?? Number.MAX_SAFE_INTEGER) < 7,
        category: 'Insurance Premium',
        itemIdLabel: item.provider ? `${item.provider} • ${item.id.slice(-4)}` : item.id.slice(-4),
        amount: Number(item.premiumAmount || 0),
        dueDate,
        sortTime: dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER,
      }];
    }),
    ...cards.flatMap((card) => {
      if (card.status !== 'active') return [];
      const nextStatementDate = getNextCardStatementDate(card.billing_date);
      if (!nextStatementDate) return [];
      const today = toDateOnly(new Date());
      const diffDays = Math.ceil((nextStatementDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0 || diffDays > UPCOMING_WINDOW_DAYS) return [];
      const statementDue = monthTransactions.reduce((cardSum, tx) => {
        if (tx.type !== 'expense' || tx.card_id !== card.id) return cardSum;
        return cardSum + Number(tx.amount || 0);
      }, 0);
      return [{
        id: `card:${card.id}`,
        kind: 'card' as const,
        dueDay: formatDueDay(nextStatementDate),
        isOverdue: diffDays < 0,
        isDueSoon: diffDays >= 0 && diffDays < 7,
        category: 'Card Payment',
        itemIdLabel: `${card.bank_name || 'Card'} • ${card.last_four_digits || card.id.slice(-4)}`,
        amount: statementDue,
        dueDate: nextStatementDate,
        sortTime: nextStatementDate.getTime(),
      }];
    }),
  ].sort((a, b) => a.sortTime - b.sortTime || a.category.localeCompare(b.category));

  const visibleUpcomingManagedExpenseItems = upcomingManagedExpenseItems.filter(
    (item) => !dismissedUpcomingExpenseIds.includes(item.id)
  );

  const upcomingManagedExpenseTotal = visibleUpcomingManagedExpenseItems.reduce((sum, item) => sum + item.amount, 0);
  const upcomingManagedExpenseCount = visibleUpcomingManagedExpenseItems.length;
  const upcomingLoanExpense = visibleUpcomingManagedExpenseItems
    .filter((item) => item.kind === 'loan')
    .reduce((sum, item) => sum + item.amount, 0);
  const upcomingInvestmentExpense = visibleUpcomingManagedExpenseItems
    .filter((item) => item.kind === 'investment')
    .reduce((sum, item) => sum + item.amount, 0);
  const upcomingInsuranceExpense = visibleUpcomingManagedExpenseItems
    .filter((item) => item.kind === 'insurance')
    .reduce((sum, item) => sum + item.amount, 0);
  const upcomingCardStatementExpense = visibleUpcomingManagedExpenseItems
    .filter((item) => item.kind === 'card')
    .reduce((sum, item) => sum + item.amount, 0);

  const handleMarkUpcomingExpenseDone = (itemId: string) => {
    setDismissedUpcomingExpenseIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
  };

  return (
    <div className="flex h-screen overflow-hidden app-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        isCollapsed={sidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={handleMenuToggle} />

        <main className="flex-1 px-4 md:px-6 py-4 overflow-y-auto">
          <div className="space-y-4">

            {/* ── Page Header ──────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[1.375rem] font-bold text-[var(--app-fg)] tracking-tight">Finance Overview</h2>
                <p className="text-xs text-[var(--app-fg-muted)] mt-0.5">Track income, expenses and household finances.</p>
              </div>
              <FinanceMonthFilter />
            </div>

            {/* ── Summary Metric Cards ────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

              {/* Total Balance */}
              <div className="relative rounded-xl border border-[var(--panel-border)] p-4 glass-black-surface overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.06] -translate-y-1/2 translate-x-1/2"
                  style={{ background: 'var(--primary)' }} />
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--primary-light)' }}>
                    <Wallet className="w-4.5 h-4.5" style={{ color: 'var(--primary-text)' }} />
                  </div>
                  <p className="text-[13px] font-medium text-[var(--app-fg-muted)]">Total Balance</p>
                </div>
                <h3 className="text-[1.5rem] font-bold text-[var(--app-fg)] tracking-tight">₹{formatAmount(totalBalance)}</h3>
              </div>

              {/* Income */}
              <div className="relative rounded-xl border border-[var(--panel-border)] p-4 glass-black-surface overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 rounded-full opacity-[0.06] -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/15 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-[13px] font-medium text-[var(--app-fg-muted)]">Income (This Month)</p>
                </div>
                <h3 className="text-[1.5rem] font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">₹{formatAmount(Number(summary.total_income || 0))}</h3>
              </div>

              {/* Expenses */}
              <div className="relative rounded-xl border border-[var(--panel-border)] p-4 glass-black-surface overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500 rounded-full opacity-[0.06] -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 dark:bg-red-400/15 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-[13px] font-medium text-[var(--app-fg-muted)]">Expenses (This Month)</p>
                </div>
                <h3 className="text-[1.5rem] font-bold text-red-600 dark:text-red-400 tracking-tight">₹{formatAmount(Number(summary.total_expense || 0))}</h3>
              </div>

              {/* Savings Rate / Recurring Expenses */}
              <div className="relative rounded-xl border border-[var(--panel-border)] p-4 glass-black-surface overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500 rounded-full opacity-[0.06] -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 dark:bg-amber-400/15 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[var(--app-fg-muted)]">Upcoming Recurring Expenses</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-[1.5rem] font-bold text-amber-600 dark:text-amber-400 tracking-tight">{upcomingBills.length}</h3>
                  {summary.total_income > 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      savingsRate >= 20
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {savingsRate.toFixed(1)}% saved
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* ── Quick Actions Grid ─────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2.5">
              {[
                { path: '/finance/accounts', icon: Wallet, label: 'Accounts', desc: 'Manage bank accounts', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-400/15' },
                { path: '/finance/cards', icon: CreditCard, label: 'Cards', desc: 'Credit & debit cards', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-400/15' },
                { path: '/finance/transactions', icon: TrendingUp, label: 'Transactions', desc: 'View all transactions', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-400/15' },
                { path: '/finance/bills', icon: AlertCircle, label: 'Recurring Expenses', desc: 'Manage recurring expenses', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-400/15' },
                { path: '/finance/insurance', icon: Shield, label: 'Insurance', desc: 'Policies and dues', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10 dark:bg-cyan-400/15' },
                { path: '/finance/investments', icon: TrendingUp, label: 'Investments', desc: 'Portfolio and SIPs', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-400/15' },
                { path: '/finance/loans', icon: Landmark, label: 'Loans', desc: 'EMI and outstanding', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 dark:bg-amber-400/15' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="group p-3 rounded-xl border border-[var(--panel-border)] text-left glass-black-surface transition-all duration-200 hover:shadow-card-hover hover:border-[var(--primary-ring)] hover:-translate-y-0.5"
                  >
                    <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center mb-2.5 transition-transform duration-200 group-hover:scale-110`}>
                      <Icon className={`w-4.5 h-4.5 ${item.color}`} />
                    </div>
                    <p className="font-semibold text-[13px] text-[var(--app-fg)]">{item.label}</p>
                    <p className="text-[10px] text-[var(--app-fg-muted)] mt-0.5 leading-snug">{item.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--panel-border)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-400/15 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--app-fg)]">Upcoming Managed Expenses</h3>
                    <p className="text-[11px] text-[var(--app-fg-muted)]">Projected outflow from loans, SIPs, insurance, and card statements in the next {UPCOMING_WINDOW_DAYS} days.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-fg-muted)]">Total Upcoming</p>
                  <p className="text-[1.6rem] font-bold text-cyan-600 dark:text-cyan-400 tracking-tight">₹{formatAmount(upcomingManagedExpenseTotal)}</p>
                  <p className="text-[11px] text-[var(--app-fg-muted)]">
                    {upcomingManagedExpenseCount} item{upcomingManagedExpenseCount === 1 ? '' : 's'} scheduled
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 p-4">
                <div className="rounded-lg border border-[var(--panel-border)] bg-black/[0.02] dark:bg-white/[0.03] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-fg-muted)]">Loan EMI</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--app-fg)]">₹{formatAmount(upcomingLoanExpense)}</p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-black/[0.02] dark:bg-white/[0.03] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-fg-muted)]">Investments</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--app-fg)]">₹{formatAmount(upcomingInvestmentExpense)}</p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-black/[0.02] dark:bg-white/[0.03] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-fg-muted)]">Insurance</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--app-fg)]">₹{formatAmount(upcomingInsuranceExpense)}</p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-black/[0.02] dark:bg-white/[0.03] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-fg-muted)]">Card Statements</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--app-fg)]">₹{formatAmount(upcomingCardStatementExpense)}</p>
                </div>
              </div>

              <div className="px-4 pb-4">
                {visibleUpcomingManagedExpenseItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--panel-border)] px-4 py-6 text-center text-sm text-[var(--app-fg-muted)]">
                    No upcoming managed expense items left in this view.
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {visibleUpcomingManagedExpenseItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-col gap-2 rounded-lg border border-[var(--panel-border)] bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2.5 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0 md:flex md:items-center md:gap-2 md:flex-1">
                          <span className={`inline-flex min-w-10 shrink-0 items-center justify-center px-1 text-sm font-bold ${
                            item.isOverdue
                              ? 'text-red-600 dark:text-red-400'
                              : item.isDueSoon
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-black dark:text-gray-100'
                          }`}>
                            {item.dueDay}
                          </span>
                          <p className="truncate text-sm font-semibold text-[var(--app-fg)]">{item.category}</p>
                          <p className="truncate text-xs text-[var(--app-fg-muted)]">{item.itemIdLabel}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3 md:justify-end">
                          <p className="text-sm font-semibold text-[var(--app-fg)]">₹{formatAmount(item.amount)}</p>
                          <button
                            type="button"
                            onClick={() => handleMarkUpcomingExpenseDone(item.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Mark done
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* ── AI Insights Tabs ───────────────────────────── */}
            {((narrativeSummaryLoading || narrativeSummary) || (categoryInsightsLoading || categoryInsights.length > 0) || familyId) && (
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--panel-border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg ai-gradient-icon flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--app-fg)]">AI Finance Insights</h3>
                      <p className="text-[11px] text-[var(--app-fg-muted)]">Switch views without stacking extra sections.</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center rounded-lg p-1 bg-black/[0.03] dark:bg-white/[0.05]">
                    {[
                      { key: 'summary', label: 'Summary' },
                      { key: 'categories', label: 'Categories' },
                      { key: 'ask', label: 'Ask AI' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setInsightTab(tab.key as 'summary' | 'categories' | 'ask')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                          insightTab === tab.key
                            ? 'text-white ai-gradient-icon shadow-sm'
                            : 'text-[var(--app-fg-muted)] hover:text-[var(--app-fg)]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  {insightTab === 'summary' && (
                    <div className="min-h-[120px]">
                      {narrativeSummaryLoading && (
                        <div className="space-y-2">
                          <div className="skeleton h-4 w-full rounded" />
                          <div className="skeleton h-4 w-5/6 rounded" />
                          <div className="skeleton h-4 w-3/4 rounded" />
                        </div>
                      )}
                      {!narrativeSummaryLoading && narrativeSummary && (
                        <div className="rounded-lg ai-gradient-note px-4 py-3">
                          <p className="text-sm text-[var(--app-fg)] leading-relaxed">{narrativeSummary}</p>
                        </div>
                      )}
                      {!narrativeSummaryLoading && !narrativeSummary && (
                        <div className="rounded-lg border border-dashed border-[var(--panel-border)] px-4 py-6 text-center text-sm text-[var(--app-fg-muted)]">
                          No AI summary available for the selected month yet.
                        </div>
                      )}
                    </div>
                  )}

                  {insightTab === 'categories' && (
                    <div className="min-h-[120px]">
                      {categoryInsightsLoading && (
                        <div className="flex flex-wrap gap-2">
                          <div className="skeleton h-16 w-40 rounded-lg" />
                          <div className="skeleton h-16 w-44 rounded-lg" />
                          <div className="skeleton h-16 w-36 rounded-lg" />
                        </div>
                      )}
                      {!categoryInsightsLoading && categoryInsights.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {categoryInsights.slice(0, 6).map((item) => (
                            <div
                              key={item.category}
                              className="rounded-lg border border-[var(--panel-border)] bg-black/[0.02] dark:bg-white/[0.04] px-3 py-2 text-xs transition-colors hover:border-[var(--primary-ring)]"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{getCategoryIcon(item.category)}</span>
                                <span className="font-semibold text-[var(--app-fg)]">{item.category}</span>
                                <span className="text-[var(--app-fg-muted)] font-medium">· {item.percent}%</span>
                              </div>
                              <p className="text-[var(--app-fg-muted)] mt-1 line-clamp-2 leading-relaxed">{item.summary}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {!categoryInsightsLoading && categoryInsights.length === 0 && (
                        <div className="rounded-lg border border-dashed border-[var(--panel-border)] px-4 py-6 text-center text-sm text-[var(--app-fg-muted)]">
                          Category insights will appear here when enough spending data is available.
                        </div>
                      )}
                    </div>
                  )}

                  {insightTab === 'ask' && familyId && (
                    <div className="min-h-[120px]">
                      <p className="text-xs text-[var(--app-fg-muted)] mb-3">
                        Ask focused questions like &quot;Why is expense high?&quot; or &quot;What were the top 3 categories?&quot;
                      </p>
                      <form onSubmit={handleAskSubmit} className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={askQuestion}
                          onChange={(e) => setAskQuestion(e.target.value)}
                          placeholder="Ask a question..."
                          disabled={askLoading}
                          className="input-theme flex-1 min-w-0"
                        />
                        <button
                          type="submit"
                          disabled={askLoading || !askQuestion.trim()}
                          className="ai-gradient-button inline-flex items-center gap-1.5 px-4 text-sm font-semibold rounded-lg text-white disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {askLoading ? (
                            <span className="text-xs">…</span>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Ask
                            </>
                          )}
                        </button>
                      </form>
                      {lastQuestion && (
                        <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.05] px-3 py-2 mb-2">
                          <p className="text-xs text-[var(--app-fg-muted)]">You asked: <span className="font-medium text-[var(--app-fg)]">{lastQuestion}</span></p>
                        </div>
                      )}
                      {askAnswer !== null && (
                        <div className="rounded-lg ai-gradient-note px-4 py-3">
                          <p className="text-sm text-[var(--app-fg)] leading-relaxed">{askAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Recent Transactions ─────────────────────────── */}
            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--panel-border)]">
                <h3 className="text-sm font-semibold text-[var(--app-fg)]">Recent Transactions</h3>
                <button
                  onClick={() => navigate('/finance/transactions')}
                  className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--primary-text)' }}
                >
                  View All
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                {recentTransactions.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <div className="w-11 h-11 mx-auto rounded-xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center mb-3">
                      <Wallet className="w-6 h-6 text-[var(--app-fg-subtle)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--app-fg-muted)]">No transactions this month</p>
                    <p className="text-xs text-[var(--app-fg-subtle)] mt-1">Transactions will appear here once recorded.</p>
                  </div>
                )}
                {recentTransactions.map((txn, idx) => {
                  const enrichedTxn = txn as Transaction & {
                    merchant_name?: string | null;
                    payment_method?: string | null;
                  };
                  const isIncome = txn.type === 'income';
                  const amount = Number(txn.amount || 0);
                  const title = enrichedTxn.merchant_name || txn.description || txn.category || 'Uncategorized';
                  const txDate = new Date(txn.transaction_date);
                  const dateLabel = Number.isNaN(txDate.getTime())
                    ? txn.transaction_date
                    : txDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                  const subtitle = [
                    txn.account_name || 'Unknown account',
                    txn.bank_name || '',
                    enrichedTxn.payment_method || '',
                    dateLabel,
                  ].filter(Boolean).join(' · ');

                  return (
                    <article
                      key={txn.id}
                      className={`px-4 py-3 flex items-center justify-between gap-3 transition-colors duration-150 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${
                        idx < recentTransactions.length - 1 ? 'border-b border-[var(--panel-border)]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                          isIncome
                            ? 'bg-emerald-500/10 dark:bg-emerald-400/15'
                            : 'bg-red-500/10 dark:bg-red-400/15'
                        }`}>
                          {getCategoryIcon(txn.category)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                              isIncome
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {isIncome ? 'Income' : 'Expense'}
                            </span>
                            <p className="text-sm font-medium text-[var(--app-fg)] truncate">{title}</p>
                          </div>
                          <p className="text-[11px] text-[var(--app-fg-muted)] mt-0.5 truncate">{subtitle}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`font-semibold text-sm tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isIncome ? '+' : '-'}₹{formatAmount(amount)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
