import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, type Loan } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import AISmsFillButton from '@/components/AISmsFillButton';
import { ArrowLeft, Plus, Landmark, Pencil, Trash2 } from 'lucide-react';

const LOAN_TYPES: Loan['type'][] = ['home', 'car', 'personal', 'education', 'other'];
const STATUS_OPTIONS: Loan['status'][] = ['active', 'closed'];

export default function LoansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState('');
  const [userRole, setUserRole] = useState('viewer');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState({ totalOutstanding: 0, totalEmi: 0, activeCount: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Loan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    lender: '',
    principalAmount: '',
    interestRate: '',
    tenureMonths: '',
    emiAmount: '',
    startDate: '',
    nextDueDate: '',
    outstandingPrincipal: '',
    type: 'home' as Loan['type'],
    status: 'active' as Loan['status'],
  });

  useEffect(() => {
    void loadFamily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!familyId) return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  const loadFamily = async () => {
    try {
      const families = await householdAPI.list();
      if (families.length > 0) {
        setFamilyId(families[0].id);
        const members = await householdAPI.listMembers(families[0].id);
        const currentMember = members.find((m: { user_id?: string; role?: string }) => m.user_id === user?.id);
        if (currentMember?.role) setUserRole(currentMember.role);
      }
    } catch (error) {
      console.error('Failed to load family', error);
    }
  };

  const reload = async () => {
    try {
      const [list, metrics] = await Promise.all([
        financeAPI.listLoans(familyId),
        financeAPI.getLoanSummary(familyId),
      ]);
      setLoans(list);
      setSummary(metrics);
    } catch (error) {
      console.error('Failed to load loans', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      lender: '',
      principalAmount: '',
      interestRate: '',
      tenureMonths: '',
      emiAmount: '',
      startDate: '',
      nextDueDate: '',
      outstandingPrincipal: '',
      type: 'home',
      status: 'active',
    });
  };

  const openAddModal = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: Loan) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      lender: item.lender,
      principalAmount: String(item.principalAmount ?? ''),
      interestRate: String(item.interestRate ?? ''),
      tenureMonths: String(item.tenureMonths ?? ''),
      emiAmount: String(item.emiAmount ?? ''),
      startDate: item.startDate ?? '',
      nextDueDate: item.nextDueDate ?? '',
      outstandingPrincipal: String(item.outstandingPrincipal ?? ''),
      type: item.type,
      status: item.status,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        lender: formData.lender,
        principalAmount: parseFloat(formData.principalAmount || '0'),
        interestRate: parseFloat(formData.interestRate || '0'),
        tenureMonths: parseInt(formData.tenureMonths || '0'),
        emiAmount: parseFloat(formData.emiAmount || '0'),
        startDate: formData.startDate || undefined,
        nextDueDate: formData.nextDueDate || undefined,
        outstandingPrincipal: parseFloat(formData.outstandingPrincipal || '0'),
        type: formData.type,
        status: formData.status,
      };
      if (editingItem) {
        await financeAPI.updateLoan(familyId, editingItem.id, payload);
      } else {
        await financeAPI.createLoan(familyId, payload);
      }
      closeModal();
      await reload();
    } catch (error) {
      console.error('Failed to save loan', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this loan?')) return;
    try {
      await financeAPI.deleteLoan(familyId, id);
      await reload();
    } catch (error) {
      console.error('Failed to delete loan', error);
    }
  };

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen overflow-hidden app-shell">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} mobileOpen={mobileMenuOpen} onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)} isCollapsed={sidebarCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={handleMenuToggle} />
        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/finance')} className="w-10 h-10 rounded-lg border border-[var(--panel-border)] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 shadow-sm glass-black-surface">
                <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Loans</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Track EMI commitments and outstanding balances</p>
              </div>
              {userRole === 'admin' && (
                <div className="flex items-center gap-2">
                  <AISmsFillButton<Loan>
                    familyId={familyId}
                    endpoint="parse-sms-loan"
                    title="AI Loan Insert"
                    description="Paste a loan SMS and AI will extract EMI and lender details into the form."
                    placeholder="Example: Your SBI Home Loan EMI of Rs 24500 is due on 2026-04-05. Outstanding principal Rs 2450000. ROI 8.65%."
                    onParsed={(parsed) => {
                      setEditingItem(null);
                      setFormData({
                        name: parsed.name ?? '',
                        lender: parsed.lender ?? '',
                        principalAmount: parsed.principalAmount != null ? String(parsed.principalAmount) : '',
                        interestRate: parsed.interestRate != null ? String(parsed.interestRate) : '',
                        tenureMonths: parsed.tenureMonths != null ? String(parsed.tenureMonths) : '',
                        emiAmount: parsed.emiAmount != null ? String(parsed.emiAmount) : '',
                        startDate: parsed.startDate ?? '',
                        nextDueDate: parsed.nextDueDate ?? '',
                        outstandingPrincipal: parsed.outstandingPrincipal != null ? String(parsed.outstandingPrincipal) : '',
                        type: parsed.type ?? 'home',
                        status: parsed.status ?? 'active',
                      });
                      setShowModal(true);
                    }}
                  />
                  <button onClick={openAddModal} className="flex items-center gap-2 ai-gradient-button text-white px-4 py-2.5 rounded-lg font-medium">
                    <Plus className="w-5 h-5" />
                    Add Loan
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><p className="text-gray-500 dark:text-gray-400">Outstanding</p><p className="text-lg font-semibold text-gray-800 dark:text-gray-100">₹{summary.totalOutstanding.toLocaleString()}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Monthly EMI</p><p className="text-lg font-semibold text-gray-800 dark:text-gray-100">₹{summary.totalEmi.toLocaleString()}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Active Loans</p><p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{summary.activeCount}</p></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {loans.map((item) => (
                <div key={item.id} className="rounded-xl shadow-sm border border-[var(--panel-border)] p-5 glass-black-surface">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-300">{item.type}</p>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-1">{item.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.lender}</p>
                    </div>
                    <Landmark className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="mt-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <p>Principal: ₹{item.principalAmount.toLocaleString()}</p>
                    <p>Outstanding: ₹{item.outstandingPrincipal.toLocaleString()}</p>
                    <p>EMI: ₹{item.emiAmount.toLocaleString()}</p>
                    <p>Interest: {item.interestRate}%</p>
                    <p>Next Due: {item.nextDueDate || 'N/A'}</p>
                  </div>
                  {userRole === 'admin' && (
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => openEditModal(item)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => void handleDelete(item.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {loans.length === 0 && <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">No loans added yet</div>}
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-xl max-w-3xl w-full p-6 glass-black-surface border border-[var(--panel-border)]">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">{editingItem ? 'Edit Loan' : 'Add Loan'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Loan Name</span><input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lender</span><input value={formData.lender} onChange={(e) => setFormData({ ...formData, lender: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Principal Amount</span><input type="number" min="0" value={formData.principalAmount} onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outstanding Principal</span><input type="number" min="0" value={formData.outstandingPrincipal} onChange={(e) => setFormData({ ...formData, outstandingPrincipal: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interest Rate (%)</span><input type="number" min="0" step="0.01" value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tenure (Months)</span><input type="number" min="0" value={formData.tenureMonths} onChange={(e) => setFormData({ ...formData, tenureMonths: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">EMI Amount</span><input type="number" min="0" value={formData.emiAmount} onChange={(e) => setFormData({ ...formData, emiAmount: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</span><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Loan['type'] })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg">{LOAN_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</span><input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Due Date</span><input type="date" value={formData.nextDueDate} onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</span><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Loan['status'] })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg">{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg ai-gradient-button text-white disabled:opacity-60">{isLoading ? 'Saving...' : editingItem ? 'Update Loan' : 'Save Loan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
