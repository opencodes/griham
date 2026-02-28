import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, BankAccount, Transaction, Bill } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import AIWidget from '@/components/AIWidget';
import { Menu, Bell, Flame, Wallet, TrendingUp, TrendingDown, AlertCircle, Plus, CreditCard, Moon, Sun } from 'lucide-react';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [familyId, setFamilyId] = useState<string>('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0 });

  useEffect(() => {
    loadFamily();
  }, []);

  useEffect(() => {
    if (familyId) {
      loadAccounts();
      loadTransactions();
      loadUpcomingBills();
      loadSummary();
    }
  }, [familyId]);

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
      const data = await financeAPI.listTransactions(familyId);
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
      const data = await financeAPI.getSummary(familyId);
      setSummary(data);
    } catch (error) {
      console.error('Failed to load summary', error);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance.toString()), 0);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Finance Overview</h2>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">₹{totalBalance.toFixed(2)}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Balance</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">₹{parseFloat(summary.total_income || 0).toFixed(2)}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Income (This Month)</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">₹{parseFloat(summary.total_expense || 0).toFixed(2)}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Expenses (This Month)</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">{upcomingBills.length}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Upcoming Bills</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/finance/accounts')}
                className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 hover:shadow-md transition text-left"
              >
                <Wallet className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2" />
                <p className="font-semibold text-gray-800 dark:text-gray-100">Accounts</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manage bank accounts</p>
              </button>
              <button
                onClick={() => navigate('/finance/cards')}
                className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 hover:shadow-md transition text-left"
              >
                <CreditCard className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
                <p className="font-semibold text-gray-800 dark:text-gray-100">Cards</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Credit & debit cards</p>
              </button>
              <button
                onClick={() => navigate('/finance/transactions')}
                className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 hover:shadow-md transition text-left"
              >
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
                <p className="font-semibold text-gray-800 dark:text-gray-100">Transactions</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">View all transactions</p>
              </button>
              <button
                onClick={() => navigate('/finance/bills')}
                className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 hover:shadow-md transition text-left"
              >
                <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-2" />
                <p className="font-semibold text-gray-800 dark:text-gray-100">Bills</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manage bills</p>
              </button>
            </div>





            {/* Recent Transactions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Recent Transactions</h3>
                <button
                  onClick={() => navigate('/finance/transactions')}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="space-y-1.5">
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
                      className="bg-white/95 dark:bg-gray-800/95 rounded-lg border border-gray-100 dark:border-gray-700/80 px-3 py-2.5 transition hover:border-gray-200 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-gray-800"
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
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{title}</p>
                            </div>

                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>
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
