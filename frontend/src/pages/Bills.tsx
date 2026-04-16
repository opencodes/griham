import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, Bill } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Plus, Trash2, ArrowLeft, AlertCircle, CheckCircle, Sparkles, Pencil } from 'lucide-react';

const DEFAULT_RECURRING_EXPENSE_CATEGORIES = ['Electricity', 'Water', 'Gas', 'Internet', 'Phone', 'Rent', 'Insurance', 'Subscription', 'Pocket Money', 'Other'];

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
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestCategoryLoading, setSuggestCategoryLoading] = useState(false);
  const [cashflowTips, setCashflowTips] = useState<string[]>([]);
  const [cashflowTipsLoading, setCashflowTipsLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(DEFAULT_RECURRING_EXPENSE_CATEGORIES);
  const [formData, setFormData] = useState({
    bill_name: '',
    category: '',
    amount: '',
    due_date: '',
    is_recurring: false,
    recurrence_pattern: 'monthly'
  });

  const resetForm = () => {
    setEditingBill(null);
    setFormData({
      bill_name: '',
      category: '',
      amount: '',
      due_date: '',
      is_recurring: false,
      recurrence_pattern: 'monthly'
    });
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  useEffect(() => {
    loadFamily();
  }, []);

  useEffect(() => {
    if (familyId) {
      loadBills();
      loadRecurringExpenseCategories();
    }
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    let cancelled = false;
    setCashflowTipsLoading(true);
    setCashflowTips([]);
    financeAPI.getCashflowTips(familyId).then((res) => {
      if (!cancelled && Array.isArray(res?.tips)) setCashflowTips(res.tips);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setCashflowTipsLoading(false);
    });
    return () => { cancelled = true; };
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

  const loadRecurringExpenseCategories = async () => {
    try {
      const data = await financeAPI.getRecurringExpenseCategories(familyId);
      setCategoryOptions(data?.categories?.length ? data.categories : DEFAULT_RECURRING_EXPENSE_CATEGORIES);
    } catch (error) {
      console.error('Failed to load recurring expense categories', error);
      setCategoryOptions(DEFAULT_RECURRING_EXPENSE_CATEGORIES);
    }
  };

  const handleSuggestCategory = async () => {
    const name = (formData.bill_name || '').trim();
    if (!name || !familyId) return;
    try {
      setSuggestCategoryLoading(true);
      const result = await financeAPI.suggestBillCategory(familyId, { bill_name: name });
      if (result?.category) {
        setFormData((prev) => ({ ...prev, category: result.category }));
      }
    } catch {
      // Ignore; user can select manually
    } finally {
      setSuggestCategoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount)
      };
      if (editingBill) {
        await financeAPI.updateBill(familyId, editingBill.id, payload);
      } else {
        await financeAPI.createBill(familyId, payload);
      }
      closeModal();
      await loadBills();
    } catch (error) {
      console.error(`Failed to ${editingBill ? 'update' : 'create'} bill`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setFormData({
      bill_name: bill.bill_name || '',
      category: bill.category || '',
      amount: bill.amount?.toString() || '',
      due_date: bill.due_date || '',
      is_recurring: Boolean(bill.is_recurring),
      recurrence_pattern: bill.recurrence_pattern || 'monthly'
    });
    setShowModal(true);
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
    if (!confirm('Delete this recurring expense?')) return;
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

  const summary = (() => {
    const now = new Date();
    const pendingBills = bills.filter((b) => b.status === 'pending');
    const paidBills = bills.filter((b) => b.status === 'paid');
    const pendingTotal = pendingBills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const paidTotal = paidBills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const overdueCount = pendingBills.filter((b) => new Date(b.due_date) < now).length;
    const upcomingCount = pendingBills.filter((b) => {
      const due = new Date(b.due_date);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }).length;
    const recurringCount = bills.filter((b) => b.is_recurring).length;
    return {
      pendingTotal,
      paidTotal,
      overdueCount,
      upcomingCount,
      recurringCount,
      pendingCount: pendingBills.length
    };
  })();

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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Recurring Expenses</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your recurring expenses and payments</p>
              </div>
              {userRole === 'admin' && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 ai-gradient-button text-white px-4 py-2.5 rounded-lg font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Recurring Expense
                </button>
              )}
            </div>

            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Pending Amount</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    ₹{summary.pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Paid Amount</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    ₹{summary.paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Pending Recurring Expenses</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{summary.pendingCount}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Overdue</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{summary.overdueCount}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Due in 7 Days</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{summary.upcomingCount}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Recurring Expenses</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{summary.recurringCount}</p>
                </div>
              </div>
            </div>

            {/* Due-date / cash-flow tips */}
            {familyId && (cashflowTipsLoading || cashflowTips.length > 0) && (
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-semibold text-[var(--app-fg)]">Cash-flow tips</h3>
                  {cashflowTipsLoading && (
                    <span className="text-xs text-[var(--app-fg-muted)]">Loading…</span>
                  )}
                </div>
                {cashflowTips.length > 0 && (
                  <ul className="space-y-1.5">
                    {cashflowTips.map((tip, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/20 px-2.5 py-1.5 text-sm text-amber-800 dark:text-amber-200"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

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
                      <button
                        onClick={() => handleEdit(bill)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-indigo-200 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                        aria-label="Edit recurring expense"
                        title="Edit recurring expense"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
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
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
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
                  <p className="text-gray-600 dark:text-gray-300 mb-2">No recurring expenses yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add your first recurring expense to get started</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-xl max-w-md w-full p-6 glass-black-surface border border-[var(--panel-border)]">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              {editingBill ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recurring Expense Name</label>
                <input
                  type="text"
                  placeholder="Electricity Expense"
                  value={formData.bill_name}
                  onChange={(e) => setFormData({ ...formData, bill_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleSuggestCategory}
                    disabled={suggestCategoryLoading || !formData.bill_name?.trim()}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:pointer-events-none"
                    title="Suggest category from recurring expense name"
                  >
                    <Sparkles className="w-4 h-4" />
                    {suggestCategoryLoading ? '…' : 'Suggest'}
                  </button>
                </div>
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
                <label htmlFor="recurring" className="text-sm text-gray-700 dark:text-gray-300">Recurring expense</label>
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
                  onClick={closeModal}
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
                  {isLoading ? (editingBill ? 'Saving...' : 'Adding...') : (editingBill ? 'Save Changes' : 'Add Recurring Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
