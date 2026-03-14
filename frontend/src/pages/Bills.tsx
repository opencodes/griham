import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, Bill } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Plus, Trash2, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

const BILL_CATEGORIES = ['Electricity', 'Water', 'Gas', 'Internet', 'Phone', 'Rent', 'Insurance', 'Subscription', 'Pocket Money', 'Other'];

export default function Bills() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('viewer');
  const [bills, setBills] = useState<Bill[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    bill_name: '',
    category: '',
    amount: '',
    due_date: '',
    is_recurring: false,
    recurrence_pattern: 'monthly'
  });

  useEffect(() => {
    loadFamily();
  }, []);

  useEffect(() => {
    if (familyId) {
      loadBills();
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

  const loadBills = async () => {
    try {
      const data = await financeAPI.listBills(familyId);
      setBills(data);
    } catch (error) {
      console.error('Failed to load bills', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await financeAPI.createBill(familyId, {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      setShowModal(false);
      setFormData({
        bill_name: '',
        category: '',
        amount: '',
        due_date: '',
        is_recurring: false,
        recurrence_pattern: 'monthly'
      });
      loadBills();
    } catch (error) {
      console.error('Failed to create bill', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await financeAPI.updateBill(familyId, id, { status: 'paid' });
      loadBills();
    } catch (error) {
      console.error('Failed to update bill', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bill?')) return;
    try {
      await financeAPI.deleteBill(familyId, id);
      loadBills();
    } catch (error) {
      console.error('Failed to delete bill', error);
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && bills.find(b => b.due_date === dueDate)?.status === 'pending';
  };

  const isUpcoming = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
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
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/finance')}
                className="w-10 h-10 rounded-lg border border-[var(--panel-border)] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 shadow-sm glass-black-surface"
              >
                <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Bills</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your recurring bills and payments</p>
              </div>
              {userRole === 'admin' && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 ai-gradient-button text-white px-4 py-2.5 rounded-lg font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Bill
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bills.map((bill) => (
                <div key={bill.id} className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">{bill.bill_name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{bill.category}</p>
                    </div>
                    {bill.status === 'paid' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : isOverdue(bill.due_date) ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : isUpcoming(bill.due_date) ? (
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    ) : null}
                  </div>

                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">₹{parseFloat(bill.amount.toString()).toFixed(2)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Due: {new Date(bill.due_date).toLocaleDateString()}
                    </p>
                  </div>

                  {bill.is_recurring && (
                    <div className="mb-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        {bill.recurrence_pattern}
                      </span>
                    </div>
                  )}

                  <div className={`px-3 py-1.5 rounded-lg text-sm font-medium mb-4 ${
                    bill.status === 'paid' 
                      ? 'bg-green-100 text-green-700' 
                      : isOverdue(bill.due_date)
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {bill.status === 'paid' ? 'Paid' : isOverdue(bill.due_date) ? 'Overdue' : 'Pending'}
                  </div>

                  {userRole === 'admin' && (
                    <div className="flex gap-2">
                      {bill.status === 'pending' && (
                        <button
                          onClick={() => handleMarkPaid(bill.id)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(bill.id)}
                        className="px-3 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {bills.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <AlertCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 mb-2">No bills yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add your first bill to get started</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-xl max-w-md w-full p-6 glass-black-surface border border-[var(--panel-border)]">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Add Bill</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bill Name</label>
                <input
                  type="text"
                  placeholder="Electricity Bill"
                  value={formData.bill_name}
                  onChange={(e) => setFormData({ ...formData, bill_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
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
                  {BILL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="recurring" className="text-sm text-gray-700 dark:text-gray-300">Recurring bill</label>
              </div>

              {formData.is_recurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recurrence</label>
                  <select
                    value={formData.recurrence_pattern}
                    onChange={(e) => setFormData({ ...formData, recurrence_pattern: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}

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
                  {isLoading ? 'Adding...' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
