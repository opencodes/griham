import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, BankAccount, Transaction, Bill } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Menu, Bell, Flame, Wallet, TrendingUp, TrendingDown, AlertCircle, Plus } from 'lucide-react';

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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 h-[73px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-gray-800 text-lg">
                Good morning, {user?.full_name || 'User'} 👋
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-sm font-bold">
              <Flame className="w-4 h-4" />
              <span>0-day streak</span>
            </div>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Finance Overview</h2>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">₹{totalBalance.toFixed(2)}</h3>
                <p className="text-sm text-gray-600">Total Balance</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-green-600">₹{parseFloat(summary.total_income || 0).toFixed(2)}</h3>
                <p className="text-sm text-gray-600">Income (This Month)</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-red-600">₹{parseFloat(summary.total_expense || 0).toFixed(2)}</h3>
                <p className="text-sm text-gray-600">Expenses (This Month)</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-2xl font-bold text-orange-600">{upcomingBills.length}</h3>
                <p className="text-sm text-gray-600">Upcoming Bills</p>
              </div>
            </div>

            {/* Bank Accounts */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Bank Accounts</h3>
                <button
                  onClick={() => navigate('/finance/accounts')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.slice(0, 4).map((account) => (
                  <div key={account.id} className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white">
                    <p className="text-sm opacity-90">{account.bank_name}</p>
                    <p className="text-lg font-semibold mt-1">{account.account_name}</p>
                    <p className="text-2xl font-bold mt-2">₹{parseFloat(account.balance.toString()).toFixed(2)}</p>
                    <p className="text-xs opacity-75 mt-1">{account.account_type}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
                <button
                  onClick={() => navigate('/finance/transactions')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{txn.category}</p>
                      <p className="text-sm text-gray-500">{new Date(txn.transaction_date).toLocaleDateString()}</p>
                    </div>
                    <p className={`font-bold ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.type === 'income' ? '+' : '-'}₹{parseFloat(txn.amount.toString()).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
