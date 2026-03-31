import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { householdAPI, financeAPI, BankAccount, Transaction, Bill, CategoryInsightItem } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { FinanceMonthFilter } from '@/components/FinanceMonthFilter';
import { useFinanceMonth } from '@/contexts/FinanceMonthContext';
import { Wallet, TrendingUp, TrendingDown, AlertCircle, CreditCard, Sparkles, Send, Shield, Landmark, ArrowUpRight } from 'lucide-react';

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

export default function FinanceOverview() {
  const navigate = useNavigate();
  const { month } = useFinanceMonth();
  const [activeTab, setActiveTab] = useState('finance');
  const [insightTab, setInsightTab] = useState<'summary' | 'categories' | 'ask'>('summary');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState<string>('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0 });
  const [narrativeSummary, setNarrativeSummary] = useState<string | null>(null);
  const [narrativeSummaryLoading, setNarrativeSummaryLoading] = useState(false);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsightItem[]>([]);
  const [categoryInsightsLoading, setCategoryInsightsLoading] = useState(false);
  const [askQuestion, setAskQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  useEffect(() => {
    void loadFamily();
  }, []);

  useEffect(() => {
    if (familyId) {
      void loadAccounts();
      void loadUpcomingBills();
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
      setTransactions(data.slice(0, 5));
    } catch (error) {
      console.error('Failed to load transactions', error);
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

              {/* Savings Rate / Bills */}
              <div className="relative rounded-xl border border-[var(--panel-border)] p-4 glass-black-surface overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500 rounded-full opacity-[0.06] -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 dark:bg-amber-400/15 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[var(--app-fg-muted)]">Upcoming Bills</p>
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
                { path: '/finance/bills', icon: AlertCircle, label: 'Bills', desc: 'Manage bills', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-400/15' },
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
                {transactions.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <div className="w-11 h-11 mx-auto rounded-xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center mb-3">
                      <Wallet className="w-6 h-6 text-[var(--app-fg-subtle)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--app-fg-muted)]">No transactions this month</p>
                    <p className="text-xs text-[var(--app-fg-subtle)] mt-1">Transactions will appear here once recorded.</p>
                  </div>
                )}
                {transactions.map((txn, idx) => {
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
                        idx < transactions.length - 1 ? 'border-b border-[var(--panel-border)]' : ''
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
