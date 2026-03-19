import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { householdAPI, financeAPI, Household, Transaction, Bill, Card, BankAccount } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useFinanceMonthOptional } from '@/contexts/FinanceMonthContext';
import { canAccessModule, hasPermission } from '@/lib/permissions';
import {
  Plus,
  Users,
  Wallet,
  Calendar,
  Package,
  Heart,
  ContactRound,
  ListTodo,
  MessageSquare,
  ArrowUpRight,
  AlertTriangle,
  Sparkles,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const financeMonth = useFinanceMonthOptional();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [membersCount, setMembersCount] = useState(0);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0 });
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiRiskSuggestions, setAiRiskSuggestions] = useState<string[]>([]);
  const [aiRiskSuggestionsLoading, setAiRiskSuggestionsLoading] = useState(false);

  const month = financeMonth?.month;

  useEffect(() => {
    if (activeTab === 'finance') navigate('/finance');
  }, [activeTab, navigate]);

  const getAiInsightsCacheKey = useCallback(
    (familyId: string) => `dashboard:ai-insights:${familyId}:${month || 'all'}`,
    [month]
  );

  const loadAiInsights = useCallback(
    async (familyId: string, forceRefresh = false) => {
      const cacheKey = getAiInsightsCacheKey(familyId);
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setAiInsights(cached);
          setAiInsightsLoading(false);
          return;
        }
      }

      setAiInsightsLoading(true);
      if (forceRefresh) setAiInsights(null);

      try {
        const insightsResult = await financeAPI.getInsights(familyId, month ?? undefined).catch(() => ({ insights: null, ai_available: false }));
        const nextInsights = insightsResult?.insights ?? null;
        setAiInsights(nextInsights);
        if (nextInsights) {
          sessionStorage.setItem(cacheKey, nextInsights);
        } else {
          sessionStorage.removeItem(cacheKey);
        }
      } finally {
        setAiInsightsLoading(false);
      }
    },
    [getAiInsightsCacheKey, month]
  );

  const loadDashboardData = useCallback(async () => {
    setIsDashboardLoading(true);
    try {
      const data = await householdAPI.list();
      setHouseholds(data);

      if (data.length === 0) {
        setMembersCount(0);
        setAccounts([]);
        setTransactions([]);
        setBills([]);
        setCards([]);
        setSummary({ total_income: 0, total_expense: 0, balance: 0 });
        setAiInsights(null);
        setAiInsightsLoading(false);
        setAiRiskSuggestions([]);
        return;
      }

      const familyId = data[0].id;
      setAiRiskSuggestionsLoading(true);
      setAiRiskSuggestions([]);
      void loadAiInsights(familyId);
      const [members, accountData, transactionData, billData, cardData, summaryData, riskResult] =
        await Promise.all([
          householdAPI.listMembers(familyId).catch(() => []),
          financeAPI.listAccounts(familyId).catch(() => []),
          financeAPI.listTransactions(familyId, month ? { month } : undefined).catch(() => []),
          financeAPI.listBills(familyId).catch(() => []),
          financeAPI.listCards(familyId).catch(() => []),
          financeAPI.getSummary(familyId, month).catch(() => ({ total_income: 0, total_expense: 0, balance: 0 })),
          financeAPI.getRiskSuggestions(familyId, month ?? undefined).catch(() => ({ risks: [], ai_available: false })),
        ]);

      setMembersCount(Array.isArray(members) ? members.length : 0);
      setAccounts(accountData);
      setTransactions(transactionData);
      setBills(billData);
      setCards(cardData);
      setSummary(summaryData);
      setAiRiskSuggestions(Array.isArray(riskResult?.risks) ? riskResult.risks : []);
      setAiRiskSuggestionsLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setIsDashboardLoading(false);
    }
  }, [loadAiInsights, month]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await householdAPI.create(name, address);
      setShowModal(false);
      setName('');
      setAddress('');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to create household', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0),
    [accounts]
  );

  const monthlyIncome = Number(summary.total_income || 0);
  const monthlyExpense = Number(summary.total_expense || 0);
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;
  const pendingBills = bills.filter((bill) => bill.status === 'pending').length;
  const overdueBills = bills.filter(
    (bill) => bill.status === 'pending' && new Date(bill.due_date).getTime() < Date.now()
  ).length;
  const now = Date.now();
  const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;
  const billsDueThisWeek = bills.filter((bill) => {
    if (bill.status !== 'pending') return false;
    const t = new Date(bill.due_date).getTime();
    return t >= now && t <= oneWeekFromNow;
  }).length;

  const moduleCards = useMemo(() => {
    const financePulse =
      overdueBills > 0
        ? `${overdueBills} bill${overdueBills > 1 ? 's' : ''} overdue; review payments.`
        : billsDueThisWeek > 0
          ? `Healthy; ${billsDueThisWeek} bill${billsDueThisWeek > 1 ? 's' : ''} due this week.`
          : pendingBills > 0
            ? `Healthy; ${pendingBills} pending bill${pendingBills > 1 ? 's' : ''}.`
            : transactions.length === 0
              ? 'Add transactions to track spending.'
              : savingsRate >= 20
                ? 'Healthy; savings on track.'
                : savingsRate >= 10
                  ? 'OK; consider boosting savings.'
                  : monthlyIncome > 0
                    ? 'Low savings rate; review expenses.'
                    : 'No income logged this month.';

    return [
      {
        key: 'finance',
        title: 'Finance',
        icon: Wallet,
        path: '/finance',
        tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
        primary: `₹${totalBalance.toFixed(2)}`,
        pulseText: financePulse,
      },
      {
        key: 'events',
        title: 'Events',
        icon: Calendar,
        path: '/events',
        tone: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30',
        primary: '4 upcoming',
        pulseText: '4 upcoming events, 2 recurring occasions.',
      },
      {
        key: 'assets',
        title: 'Assets',
        icon: Package,
        path: '/assets',
        tone: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
        primary: '6 tracked',
        pulseText: '6 assets tracked; 1 expiry in 30 days.',
      },
      {
        key: 'health',
        title: 'Health',
        icon: Heart,
        path: '/health',
        tone: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
        primary: '2 appointments',
        pulseText: '2 appointments; 1 vaccine due.',
      },
      {
        key: 'contacts',
        title: 'Contacts',
        icon: ContactRound,
        path: '/contacts',
        tone: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
        primary: '18 contacts',
        pulseText: '18 contacts; 3 emergency entries.',
      },
      {
        key: 'organizer',
        title: 'Organizer',
        icon: ListTodo,
        path: '/organizer',
        tone: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
        primary: '5 pending tasks',
        pulseText: '5 pending tasks; 3 reminders this week.',
      },
      {
        key: 'messages',
        title: 'Messages',
        icon: MessageSquare,
        path: '/messages',
        tone: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
        primary: '4 unread',
        pulseText: '4 unread; 1 critical alert.',
      },
    ];
  }, [
    overdueBills,
    billsDueThisWeek,
    pendingBills,
    transactions.length,
    savingsRate,
    monthlyIncome,
    totalBalance,
  ]);

  const risks = useMemo(() => {
    const items: string[] = [];
    if (overdueBills > 0) items.push(`${overdueBills} bill${overdueBills > 1 ? 's are' : ' is'} overdue`);
    if (savingsRate < 10 && monthlyIncome > 0) items.push('Monthly savings rate is below 10%');
    if (transactions.length === 0) items.push('No finance transactions logged yet');
    if (households.length === 0) items.push('Create your first family to activate modules');
    const aiRisks = (aiRiskSuggestions || []).filter((s) => s.trim().length > 0);
    const seen = new Set(items.map((s) => s.toLowerCase()));
    for (const r of aiRisks) {
      const key = r.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        items.push(r.trim());
      }
    }
    return items;
  }, [overdueBills, savingsRate, monthlyIncome, transactions.length, households.length, aiRiskSuggestions]);

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleRefetchAiInsights = async () => {
    if (households.length === 0) return;
    await loadAiInsights(households[0].id, true);
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
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <section className="relative overflow-hidden rounded-2xl hero-ai-card p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full premium-panel text-xs font-medium text-[var(--app-fg)] border border-[var(--panel-border)]">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Command Center
                    </div>
                    <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[var(--app-fg)]">
                      Household Overview
                    </h2>
                    {aiInsightsLoading && (
                      <p className="mt-1 text-sm text-[var(--app-fg-muted)]">Loading AI summary…</p>
                    )}
                    {!aiInsightsLoading && aiInsights && (
                      <p className="mt-2 text-sm text-[var(--app-fg)] leading-relaxed">
                        {aiInsights}
                      </p>
                    )}
                    {!aiInsightsLoading && !aiInsights && (
                      <p className="mt-1 text-sm text-[var(--app-fg-muted)]">
                        AI-enhanced summary of family, finance and key module signals in one place.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => void handleRefetchAiInsights()}
                      disabled={aiInsightsLoading || households.length === 0}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)] text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${aiInsightsLoading ? 'animate-spin' : ''}`} />
                      Refetch AI
                    </button>
                    <button
                      onClick={() => navigate('/finance')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg ai-gradient-button text-white text-sm font-medium shrink-0"
                    >
                      Open Finance Center
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <article className="rounded-xl p-4 glass-black-surface border border-[var(--panel-border)]">
                  <p className="text-xs text-[var(--app-fg-muted)]">Families</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--app-fg)]">{households.length}</p>
                </article>
                <article className="rounded-xl p-4 glass-black-surface border border-[var(--panel-border)]">
                  <p className="text-xs text-[var(--app-fg-muted)]">Members</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--app-fg)]">{membersCount}</p>
                </article>
                <article className="rounded-xl p-4 glass-black-surface border border-[var(--panel-border)]">
                  <p className="text-xs text-[var(--app-fg-muted)]">Monthly Savings Rate</p>
                  <p className={`mt-2 text-2xl font-bold ${savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {monthlyIncome > 0 ? `${Math.max(savingsRate, -100).toFixed(1)}%` : 'No income'}
                  </p>
                </article>
                <article className="rounded-xl p-4 glass-black-surface border border-[var(--panel-border)]">
                  <p className="text-xs text-[var(--app-fg-muted)]">Pending Bills</p>
                  <p className={`mt-2 text-2xl font-bold ${overdueBills > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--app-fg)]'}`}>
                    {pendingBills}
                  </p>
                </article>
                <article className="rounded-xl p-4 glass-black-surface border border-[var(--panel-border)]">
                  <p className="text-xs text-[var(--app-fg-muted)]">Cards + Accounts</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--app-fg)]">{cards.length + accounts.length}</p>
                </article>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-xl p-5 glass-black-surface border border-[var(--panel-border)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--app-fg)]">Module Pulse</h3>
                    <span className="text-xs text-[var(--app-fg-muted)]">
                      {isDashboardLoading ? 'Refreshing...' : 'Live finance + module signals'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {moduleCards.map((module) => {
                      const Icon = module.icon;
                      return (
                        <button
                          key={module.key}
                          onClick={() => navigate(module.path)}
                          className="text-left border border-[var(--panel-border)] rounded-xl p-3.5 hover:shadow-sm hover:border-indigo-400/30 glass-black-soft transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${module.tone}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-[var(--app-fg-muted)]" />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-[var(--app-fg)]">{module.title}</p>
                          <p className="mt-1 text-sm font-medium text-[var(--app-fg)]">{module.primary}</p>
                          <p className="mt-0.5 text-xs text-[var(--app-fg-muted)]">{module.pulseText}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl p-5 glass-black-surface border border-[var(--panel-border)]">
                  <h3 className="text-lg font-semibold text-[var(--app-fg)]">Risk Radar</h3>
                  <p className="text-xs text-[var(--app-fg-muted)] mt-1">
                    Actionable alerts: fixed rules + AI suggestions (spending vs last month, bills vs balance).
                  </p>
                  {aiRiskSuggestionsLoading && (
                    <p className="mt-2 text-xs text-[var(--app-fg-muted)]">Loading AI risk suggestions…</p>
                  )}
                  <div className="mt-4 space-y-2">
                    {risks.length > 0 ? (
                      risks.map((risk, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-2.5"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-800 dark:text-amber-200">{risk}</p>
                        </div>
                      ))
                    ) : !aiRiskSuggestionsLoading ? (
                      <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 p-2.5">
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">No major operational risks detected.</p>
                      </div>
                    ) : null}
                    {!aiInsightsLoading && aiInsights && (
                      <div className="flex items-start gap-2 rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/20 p-2.5">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-indigo-800 dark:text-indigo-200">AI summary and recommendations are in the Household Overview above.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {canAccessModule(user, 'family') && (
                  <button
                    onClick={() => navigate('/family')}
                    className="text-left rounded-xl p-4 hover:shadow-sm glass-black-surface border border-[var(--panel-border)] transition"
                  >
                    <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    <p className="mt-2 text-sm font-semibold text-[var(--app-fg)]">Family Management</p>
                    <p className="text-xs text-[var(--app-fg-muted)]">Create families and manage members.</p>
                  </button>
                )}
                <button
                  onClick={() => navigate('/finance/cards')}
                  className="text-left rounded-xl p-4 hover:shadow-sm glass-black-surface border border-[var(--panel-border)] transition"
                >
                  <CreditCard className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  <p className="mt-2 text-sm font-semibold text-[var(--app-fg)]">Card Command</p>
                  <p className="text-xs text-[var(--app-fg-muted)]">Track cards, limits and statuses.</p>
                </button>
                <button
                  onClick={() => navigate('/messages')}
                  className="text-left rounded-xl p-4 hover:shadow-sm glass-black-surface border border-[var(--panel-border)] transition"
                >
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <p className="mt-2 text-sm font-semibold text-[var(--app-fg)]">Message Center</p>
                  <p className="text-xs text-[var(--app-fg-muted)]">Review alerts and internal updates.</p>
                </button>
              </section>
              <p className="text-[11px] text-[var(--app-fg-muted)]">
                Note: Finance and Family metrics are live. Other module cards currently show module-level operational snapshot values.
              </p>
            </div>
          )}

          {activeTab === 'family' && canAccessModule(user, 'family') && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--app-fg)]">My Family</h2>
                  <p className="text-[var(--app-fg-muted)] mt-1">Manage your family</p>
                </div>
                {households.length === 0 && hasPermission(user, 'family', 'create') && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 ai-gradient-button text-white px-4 py-2.5 rounded-lg font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Create Family
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {households.map((household) => (
                  <div
                    key={household.id} 
                    onClick={() => navigate(`/families/${household.id}`)}
                    className="rounded-xl shadow-sm border border-[var(--panel-border)] p-6 hover:shadow-md glass-black-surface transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-2">{household.name}</h3>
                    <p className="text-sm text-[var(--app-fg-muted)] mb-4 line-clamp-2">
                      {household.address || 'No address'}
                    </p>
                    <p className="text-xs text-[var(--app-fg-muted)]">
                      Created {new Date(household.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}

                {households.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Users className="w-16 h-16 text-[var(--app-fg-muted)] mx-auto mb-4" />
                    <p className="text-[var(--app-fg-muted)] mb-2">No family yet</p>
                    <p className="text-sm text-[var(--app-fg-muted)]">Create your first family to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab !== 'dashboard' && activeTab !== 'family' && activeTab !== 'finance' && (
            <div className="text-center py-12">
              <p className="text-[var(--app-fg)] text-lg">Coming soon...</p>
              <p className="text-sm text-[var(--app-fg-muted)] mt-2">This module will be available in Phase 2</p>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="text-center py-12">
              <p className="text-[var(--app-fg)] text-lg">Redirecting to Finance...</p>
            </div>
          )}
        </main>
      </div>

      {/* Create Family Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-xl max-w-md w-full p-6 glass-black-surface border border-[var(--panel-border)]">
            <h2 className="text-2xl font-bold text-[var(--app-fg)] mb-4">Create Family</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">
                  Family Name
                </label>
                <input
                  type="text"
                  placeholder="My Home"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="input-theme"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="123 Main St"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isLoading}
                  className="input-theme"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 ai-gradient-button text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
