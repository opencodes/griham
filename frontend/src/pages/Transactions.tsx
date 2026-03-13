import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { financeAPI, householdAPI, Transaction, BankAccount } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import SMSParser from '@/components/SMSParser';
import { Search, ArrowDownUp, TrendingUp, TrendingDown, RotateCcw, Plus } from 'lucide-react';

type TypeFilter = 'all' | 'income' | 'expense';
type SortBy = 'newest' | 'oldest' | 'amount_high' | 'amount_low';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDateLabel = (dateKey: string) => {
  const date = new Date(dateKey);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDateKey = (rawDate: string) => {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return rawDate;
  }
  return date.toISOString().slice(0, 10);
};

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

export default function TransactionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [familyId, setFamilyId] = useState('');
  const [userRole, setUserRole] = useState('viewer');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    account_id: '',
    type: 'expense',
    category: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    loadFamily();
  }, []);

  useEffect(() => {
    if (familyId) {
      loadAccounts();
      loadTransactions();
    }
  }, [familyId]);

  const loadFamily = async () => {
    try {
      const families = await householdAPI.list();
      if (families.length > 0) {
        setFamilyId(families[0].id);
        const members = await householdAPI.listMembers(families[0].id);
        const currentMember = (members as Array<{ user_id?: string; role?: string }>).find(
          (member) => member.user_id === user?.id
        );
        if (currentMember?.role) {
          setUserRole(currentMember.role);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load family', err);
      setError('Unable to load household details.');
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await financeAPI.listTransactions(familyId);
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions', err);
      setError('Unable to load transactions right now.');
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await financeAPI.listAccounts(familyId);
      setAccounts(data);
      if (data.length > 0 && !formData.account_id) {
        setFormData((prev) => ({ ...prev, account_id: data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load accounts', err);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_id || !formData.category || !formData.amount || !formData.transaction_date) {
      return;
    }

    try {
      setSubmitting(true);
      await financeAPI.createTransaction(familyId, {
        account_id: formData.account_id,
        type: formData.type,
        category: formData.category,
        amount: Number(formData.amount),
        description: formData.description,
        transaction_date: formData.transaction_date,
      });

      setShowModal(false);
      setFormData({
        account_id: accounts[0]?.id || '',
        type: 'expense',
        category: '',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
      });
      await Promise.all([loadTransactions(), loadAccounts()]);
    } catch (err) {
      console.error('Failed to create transaction', err);
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.category) {
        unique.add(tx.category);
      }
    });
    return ['all', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    const filtered = transactions.filter((tx) => {
      const matchesSearch =
        !searchTerm ||
        tx.category?.toLowerCase().includes(searchTerm) ||
        tx.description?.toLowerCase().includes(searchTerm) ||
        tx.account_name?.toLowerCase().includes(searchTerm) ||
        tx.bank_name?.toLowerCase().includes(searchTerm);

      const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;
      const matchesType = typeFilter === 'all' || tx.type === typeFilter;

      return matchesSearch && matchesCategory && matchesType;
    });

    filtered.sort((a, b) => {
      const aAmount = Number(a.amount || 0);
      const bAmount = Number(b.amount || 0);
      const aDate = new Date(a.transaction_date).getTime() || 0;
      const bDate = new Date(b.transaction_date).getTime() || 0;

      switch (sortBy) {
        case 'oldest':
          return aDate - bDate;
        case 'amount_high':
          return bAmount - aAmount;
        case 'amount_low':
          return aAmount - bAmount;
        case 'newest':
        default:
          return bDate - aDate;
      }
    });

    return filtered;
  }, [transactions, search, categoryFilter, typeFilter, sortBy]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    filteredTransactions.forEach((tx) => {
      const key = getDateKey(tx.transaction_date);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(tx);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTransactions]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, tx) => {
        const amount = Number(tx.amount || 0);
        if (tx.type === 'income') {
          acc.income += amount;
        } else {
          acc.expense += amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [filteredTransactions]);

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setTypeFilter('all');
    setSortBy('newest');
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
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Transactions</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {filteredTransactions.length} of {transactions.length} records shown
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 flex-wrap md:flex-nowrap">
                <button
                  onClick={clearFilters}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition whitespace-nowrap"
                  type="button"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset filters
                </button>

                {familyId && (
                  <SMSParser familyId={familyId} onSuccess={() => { loadTransactions(); loadAccounts(); }} />
                )}

                {userRole === 'admin' && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex h-11 items-center gap-2 ai-gradient-button text-white px-4 rounded-lg text-sm font-medium whitespace-nowrap"
                    type="button"
                  >
                    <Plus className="w-4 h-4" />
                    Add Transaction
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Income</p>
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-2">{formatCurrency(summary.income)}</p>
              </div>

              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Expense</p>
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-2">{formatCurrency(summary.expense)}</p>
              </div>

              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Net</p>
                <p className={`text-xl font-bold mt-2 ${(summary.income - summary.expense) >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {formatCurrency(summary.income - summary.expense)}
                </p>
              </div>
            </div>

            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-4 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="relative lg:col-span-5">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search category, note, account, bank..."
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-9 pr-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="lg:col-span-3">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All categories' : category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="amount_high">Amount high to low</option>
                    <option value="amount_low">Amount low to high</option>
                  </select>
                </div>

                <div className="lg:col-span-2 flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                  {(['all', 'income', 'expense'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTypeFilter(type)}
                      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                        typeFilter === type
                          ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      {type === 'all' ? 'All' : type === 'income' ? 'Income' : 'Expense'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <ArrowDownUp className="w-3.5 h-3.5" />
                <span>Use filters to narrow records and compare inflow vs outflow.</span>
              </div>
            </div>

            {loading && (
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-6 text-sm text-gray-500 dark:text-gray-400">
                Loading transactions...
              </div>
            )}

            {!loading && error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {!loading && !error && filteredTransactions.length === 0 && (
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-10 text-center">
                <p className="text-4xl mb-2">🔍</p>
                <p className="text-gray-600 dark:text-gray-300">No transactions match your filters.</p>
              </div>
            )}

            {!loading && !error && filteredTransactions.length > 0 && (
              <div className="space-y-5">
                {groupedTransactions.map(([date, txs]) => (
                  <section key={date} className="space-y-2">
                    <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 py-1.5 backdrop-blur-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {formatDateLabel(date)}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      {txs.map((tx) => {
                        const isIncome = tx.type === 'income';
                        const amount = Number(tx.amount || 0);
                        const enrichedTx = tx as Transaction & {
                          merchant_name?: string | null;
                          payment_method?: string | null;
                        };
                        const title = enrichedTx.merchant_name || tx.description || tx.category || 'Uncategorized';
                        const txDate = new Date(tx.transaction_date);
                        const dateLabel = Number.isNaN(txDate.getTime())
                          ? tx.transaction_date
                          : txDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                        const subtitle = [
                          tx.account_name || 'Unknown account',
                          tx.bank_name || '',
                          enrichedTx.payment_method || '',
                          dateLabel,
                        ].filter(Boolean).join(' • ');
                        return (
                          <article
                            key={tx.id}
                            className="rounded-lg border border-[var(--panel-border)] px-3 py-2.5 transition hover:bg-black/5 dark:hover:bg-white/10 glass-black-soft"
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="min-w-0 flex items-start gap-2.5">
                                <div className="w-8 h-8 flex items-center justify-center text-sm shrink-0">
                                  {getCategoryIcon(tx.category)}
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
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{title}</p>
                                  </div>

                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className={`font-semibold text-sm ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {isIncome ? '+' : '-'}{formatCurrency(amount)}
                                </p>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={handleCreateTransaction} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add Transaction</h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>

                <input
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Category"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="Amount"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />

                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, transaction_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <select
                value={formData.account_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, account_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} ({acc.bank_name})
                  </option>
                ))}
              </select>

              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optional)"
                rows={3}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg ai-gradient-button text-white disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
