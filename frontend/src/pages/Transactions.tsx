import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, BankAccount, Transaction } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import SMSParser from '@/components/SMSParser';
import { Menu, Bell, Flame, Plus, Trash2, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';

const TRANSACTION_CATEGORIES = {
  income: ['Salary', 'Business', 'Rental', 'Investment', 'Other'],
  expense: ['Food', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Other']
};

export default function Transactions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [familyId, setFamilyId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('viewer');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    account_id: '',
    type: 'expense',
    category: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });

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
        const currentMember = members.find((m: any) => m.user_id === user?.id);
        if (currentMember) setUserRole(currentMember.role);
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
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await financeAPI.createTransaction(familyId, {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      setShowModal(false);
      setFormData({
        account_id: '',
        type: 'expense',
        category: '',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0]
      });
      loadTransactions();
      loadAccounts();
    } catch (error) {
      console.error('Failed to create transaction', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await financeAPI.deleteTransaction(familyId, id);
      loadTransactions();
      loadAccounts();
    } catch (error) {
      console.error('Failed to delete transaction', error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/finance')}
                className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Transactions</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Track your income and expenses</p>
              </div>
              {userRole === 'admin' && (
                <div className="flex gap-2">
                  <SMSParser familyId={familyId} onSuccess={() => { loadTransactions(); loadAccounts(); }} />
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Add Transaction
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                      {userRole === 'admin' && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(txn.transaction_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {txn.type === 'income' ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm text-gray-900 dark:text-gray-100">{txn.category}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {txn.account_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {txn.description || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${
                          txn.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {txn.type === 'income' ? '+' : '-'}₹{parseFloat(txn.amount.toString()).toFixed(2)}
                        </td>
                        {userRole === 'admin' && (
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDelete(txn.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Add Transaction</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, category: '' })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {TRANSACTION_CATEGORIES[formData.type as 'income' | 'expense'].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
                <select
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.account_name} - {acc.bank_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Add notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Adding...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
