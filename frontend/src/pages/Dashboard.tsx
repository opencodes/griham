import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { householdAPI, financeAPI, Household, Transaction, Bill, Card, BankAccount } from '@/lib/api';
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
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'finance') navigate('/finance');
  }, [activeTab, navigate]);

  const loadDashboardData = async () => {
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
        return;
      }

      const familyId = data[0].id;
      const [members, accountData, transactionData, billData, cardData, summaryData] = await Promise.all([
        householdAPI.listMembers(familyId).catch(() => []),
        financeAPI.listAccounts(familyId).catch(() => []),
        financeAPI.listTransactions(familyId).catch(() => []),
        financeAPI.listBills(familyId).catch(() => []),
        financeAPI.listCards(familyId).catch(() => []),
        financeAPI.getSummary(familyId).catch(() => ({ total_income: 0, total_expense: 0, balance: 0 })),
      ]);

      setMembersCount(Array.isArray(members) ? members.length : 0);
      setAccounts(accountData);
      setTransactions(transactionData);
      setBills(billData);
      setCards(cardData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setIsDashboardLoading(false);
    }
  };

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

  const moduleCards = [
    {
      key: 'finance',
      title: 'Finance',
      icon: Wallet,
      path: '/finance',
      tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
      primary: `₹${totalBalance.toFixed(2)}`,
      secondary: `${transactions.length} transactions, ${pendingBills} pending bills`,
    },
    {
      key: 'events',
      title: 'Events',
      icon: Calendar,
      path: '/events',
      tone: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30',
      primary: '4 upcoming',
      secondary: '2 recurring occasions',
    },
    {
      key: 'assets',
      title: 'Assets',
      icon: Package,
      path: '/assets',
      tone: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
      primary: '6 tracked',
      secondary: '1 expiry in 30 days',
    },
    {
      key: 'health',
      title: 'Health',
      icon: Heart,
      path: '/health',
      tone: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
      primary: '2 appointments',
      secondary: '1 vaccine due',
    },
    {
      key: 'contacts',
      title: 'Contacts',
      icon: ContactRound,
      path: '/contacts',
      tone: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
      primary: '18 contacts',
      secondary: '3 emergency entries',
    },
    {
      key: 'organizer',
      title: 'Organizer',
      icon: ListTodo,
      path: '/organizer',
      tone: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
      primary: '5 pending tasks',
      secondary: '3 reminders this week',
    },
    {
      key: 'messages',
      title: 'Messages',
      icon: MessageSquare,
      path: '/messages',
      tone: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
      primary: '4 unread',
      secondary: '1 critical alert',
    },
  ];

  const risks = useMemo(() => {
    const items: string[] = [];
    if (overdueBills > 0) items.push(`${overdueBills} bill${overdueBills > 1 ? 's are' : ' is'} overdue`);
    if (savingsRate < 10 && monthlyIncome > 0) items.push('Monthly savings rate is below 10%');
    if (transactions.length === 0) items.push('No finance transactions logged yet');
    if (households.length === 0) items.push('Create your first family to activate modules');
    return items;
  }, [overdueBills, savingsRate, monthlyIncome, transactions.length, households.length]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-transparent">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto bg-gray-50 dark:bg-transparent">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <section className="relative overflow-hidden rounded-2xl hero-ai-card p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/80 dark:bg-gray-900/55 border border-gray-300 dark:border-gray-600/45 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Command Center
                    </div>
                    <h2 className="mt-3 text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                      Household Overview
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      AI-enhanced summary of family, finance and key module signals in one place.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/finance')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Open Finance Center
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <article className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/30 rounded-xl p-4 glass-black-surface">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Families</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{households.length}</p>
                </article>
                <article className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/30 rounded-xl p-4 glass-black-surface">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Members</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{membersCount}</p>
                </article>
                <article className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/30 rounded-xl p-4 glass-black-surface">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Savings Rate</p>
                  <p className={`mt-2 text-2xl font-bold ${savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {monthlyIncome > 0 ? `${Math.max(savingsRate, -100).toFixed(1)}%` : 'No income'}
                  </p>
                </article>
                <article className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/30 rounded-xl p-4 glass-black-surface">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pending Bills</p>
                  <p className={`mt-2 text-2xl font-bold ${overdueBills > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {pendingBills}
                  </p>
                </article>
                <article className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/30 rounded-xl p-4 glass-black-surface">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cards + Accounts</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{cards.length + accounts.length}</p>
                </article>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/30 rounded-xl p-5 glass-black-surface">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Module Pulse</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
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
                          className="text-left border border-gray-200 dark:border-gray-700/35 rounded-xl p-3.5 hover:shadow-sm hover:border-gray-300 dark:hover:border-indigo-400/30 glass-black-soft transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${module.tone}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-gray-400" />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{module.title}</p>
                          <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-200">{module.primary}</p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{module.secondary}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/30 rounded-xl p-5 glass-black-surface">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Risk Radar</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Actionable alerts across household operations.
                  </p>
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
                    ) : (
                      <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 p-2.5">
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">No major operational risks detected.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('family')}
                  className="text-left bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/30 rounded-xl p-4 hover:shadow-sm glass-black-surface transition"
                >
                  <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Family Management</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Create families and manage members.</p>
                </button>
                <button
                  onClick={() => navigate('/finance/cards')}
                  className="text-left bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/30 rounded-xl p-4 hover:shadow-sm glass-black-surface transition"
                >
                  <CreditCard className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Card Command</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Track cards, limits and statuses.</p>
                </button>
                <button
                  onClick={() => navigate('/messages')}
                  className="text-left bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/30 rounded-xl p-4 hover:shadow-sm glass-black-surface transition"
                >
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Message Center</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Review alerts and internal updates.</p>
                </button>
              </section>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Note: Finance and Family metrics are live. Other module cards currently show module-level operational snapshot values.
              </p>
            </div>
          )}

          {activeTab === 'family' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">My Family</h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your family</p>
                </div>
                {households.length === 0 && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
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
                    className="bg-white dark:bg-transparent rounded-xl shadow-sm border dark:border-gray-700/30 p-6 hover:shadow-md glass-black-surface transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{household.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {household.address || 'No address'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Created {new Date(household.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}

                {households.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-2">No family yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Create your first family to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab !== 'dashboard' && activeTab !== 'family' && activeTab !== 'finance' && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-300 text-lg">Coming soon...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This module will be available in Phase 2</p>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-300 text-lg">Redirecting to Finance...</p>
            </div>
          )}
        </main>
      </div>

      {/* Create Family Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-transparent rounded-2xl shadow-xl max-w-md w-full p-6 glass-black-surface">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Create Family</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Family Name
                </label>
                <input
                  type="text"
                  placeholder="My Home"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600/50 dark:bg-gray-800/55 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="123 Main St"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600/50 dark:bg-gray-800/55 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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
