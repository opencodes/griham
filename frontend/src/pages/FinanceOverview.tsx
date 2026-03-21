import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { householdAPI, financeAPI, BankAccount, Transaction, Bill, CategoryInsightItem } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { FinanceMonthFilter } from '@/components/FinanceMonthFilter';
import { useFinanceMonth } from '@/contexts/FinanceMonthContext';
import { Wallet, TrendingUp, TrendingDown, AlertCircle, CreditCard, Sparkles, MessageCircle, Send, Shield, Landmark } from 'lucide-react';

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

        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-[var(--app-fg)]">Finance Overview</h2>
              <FinanceMonthFilter />
            </div>

            {/* Narrative summary: 2–3 sentences on income, expenses, bills, trend */}
            {(narrativeSummaryLoading || narrativeSummary) && (
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-semibold text-[var(--app-fg)]">Narrative summary</h3>
                </div>
                {narrativeSummaryLoading && (
                  <p className="text-sm text-[var(--app-fg-muted)]">Loading summary…</p>
                )}
                {!narrativeSummaryLoading && narrativeSummary && (
                  <p className="text-sm text-[var(--app-fg)] leading-relaxed">{narrativeSummary}</p>
                )}
              </div>
            )}

            {/* Category insights (compact) */}
            {(categoryInsightsLoading || categoryInsights.length > 0) && (
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-[var(--app-fg)]">Spending by category</h3>
                  {categoryInsightsLoading && <span className="text-xs text-[var(--app-fg-muted)]">Loading…</span>}
                </div>
                {categoryInsights.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categoryInsights.slice(0, 5).map((item) => (
                      <div
                        key={item.category}
                        className="rounded-lg bg-black/5 dark:bg-white/5 px-2.5 py-1.5 text-xs"
                      >
                        <span className="font-medium text-[var(--app-fg)]">{getCategoryIcon(item.category)} {item.category}</span>
                        <span className="text-[var(--app-fg-muted)] ml-1">· {item.percent}%</span>
                        <p className="text-[var(--app-fg-muted)] mt-0.5 line-clamp-2">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-6 glass-black-surface">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--app-fg)]">₹{totalBalance.toFixed(2)}</h3>
                <p className="text-sm text-[var(--app-fg-muted)]">Total Balance</p>
              </div>

              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-6 glass-black-surface">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">₹{Number(summary.total_income || 0).toFixed(2)}</h3>
                <p className="text-sm text-[var(--app-fg-muted)]">Income (This Month)</p>
              </div>

              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-6 glass-black-surface">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">₹{Number(summary.total_expense || 0).toFixed(2)}</h3>
                <p className="text-sm text-[var(--app-fg-muted)]">Expenses (This Month)</p>
              </div>

              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-6 glass-black-surface">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">{upcomingBills.length}</h3>
                <p className="text-sm text-[var(--app-fg-muted)]">Upcoming Bills</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
              <button
                onClick={() => navigate('/finance/accounts')}
                className="p-4 rounded-xl border border-[var(--panel-border)] hover:shadow-md transition text-left glass-black-surface"
              >
                <Wallet className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2" />
                <p className="font-semibold text-[var(--app-fg)]">Accounts</p>
                <p className="text-xs text-[var(--app-fg-muted)]">Manage bank accounts</p>
              </button>
              <button
                onClick={() => navigate('/finance/cards')}
                className="p-4 rounded-xl border border-[var(--panel-border)] hover:shadow-md transition text-left glass-black-surface"
              >
                <CreditCard className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
                <p className="font-semibold text-[var(--app-fg)]">Cards</p>
                <p className="text-xs text-[var(--app-fg-muted)]">Credit & debit cards</p>
              </button>
              <button
                onClick={() => navigate('/finance/transactions')}
                className="p-4 rounded-xl border border-[var(--panel-border)] hover:shadow-md transition text-left glass-black-surface"
              >
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
                <p className="font-semibold text-[var(--app-fg)]">Transactions</p>
                <p className="text-xs text-[var(--app-fg-muted)]">View all transactions</p>
              </button>
              <button
                onClick={() => navigate('/finance/bills')}
                className="p-4 rounded-xl border border-[var(--panel-border)] hover:shadow-md transition text-left glass-black-surface"
              >
                <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-2" />
                <p className="font-semibold text-[var(--app-fg)]">Bills</p>
                <p className="text-xs text-[var(--app-fg-muted)]">Manage bills</p>
              </button>
              <button
                onClick={() => navigate('/finance/insurance')}
                className="p-4 rounded-xl border border-[var(--panel-border)] hover:shadow-md transition text-left glass-black-surface"
              >
                <Shield className="w-8 h-8 text-cyan-600 dark:text-cyan-400 mb-2" />
                <p className="font-semibold text-[var(--app-fg)]">Insurance</p>
                <p className="text-xs text-[var(--app-fg-muted)]">Policies and dues</p>
              </button>
              <button
                onClick={() => navigate('/finance/investments')}
                className="p-4 rounded-xl border border-[var(--panel-border)] hover:shadow-md transition text-left glass-black-surface"
              >
                <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                <p className="font-semibold text-[var(--app-fg)]">Investments</p>
                <p className="text-xs text-[var(--app-fg-muted)]">Portfolio and SIPs</p>
              </button>
              <button
                onClick={() => navigate('/finance/loans')}
                className="p-4 rounded-xl border border-[var(--panel-border)] hover:shadow-md transition text-left glass-black-surface"
              >
                <Landmark className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2" />
                <p className="font-semibold text-[var(--app-fg)]">Loans</p>
                <p className="text-xs text-[var(--app-fg-muted)]">EMI and outstanding</p>
              </button>
            </div>

            {/* Ask about this month – Q&A widget */}
            {familyId && (
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-semibold text-[var(--app-fg)]">Ask about this month</h3>
                </div>
                <p className="text-xs text-[var(--app-fg-muted)] mb-2">
                  e.g. &quot;Why is expense high?&quot; or &quot;What were the top 3 categories?&quot;
                </p>
                <form onSubmit={handleAskSubmit} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={askLoading}
                    className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-[var(--app-fg)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={askLoading || !askQuestion.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none"
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
                  <div className="rounded-lg bg-black/5 dark:bg-white/5 px-2.5 py-1.5 mb-2">
                    <p className="text-xs text-[var(--app-fg-muted)]">You asked: {lastQuestion}</p>
                  </div>
                )}
                {askAnswer !== null && (
                  <div className="rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/20 px-3 py-2">
                    <p className="text-sm text-[var(--app-fg)] leading-relaxed">{askAnswer}</p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Transactions */}
            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-6 glass-black-surface">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[var(--app-fg)]">Recent Transactions</h3>
                <button
                  onClick={() => navigate('/finance/transactions')}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="space-y-0">
                {transactions.map((txn) => {
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
                  ].filter(Boolean).join(' • ');

                  return (
                    <article
                      key={txn.id}
                      className="px-3 py-2.5 transition hover:bg-black/5 dark:hover:bg-white/5 border-b border-[var(--panel-border)] last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex items-start gap-2.5">
                          <div className="w-8 h-8 flex items-center justify-center text-sm shrink-0">
                            {getCategoryIcon(txn.category)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                isIncome
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
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
                          <p className={`font-semibold text-sm ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isIncome ? '+' : '-'}₹{formatAmount(amount)}
                          </p>
                        </div>
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
