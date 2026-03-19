import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, type Investment } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import AISmsFillButton from '@/components/AISmsFillButton';
import { ArrowLeft, Plus, TrendingUp, Pencil, Trash2 } from 'lucide-react';

const INVESTMENT_TYPES: Investment['type'][] = ['mutual_fund', 'stock', 'fd', 'other'];
const STATUS_OPTIONS: Investment['status'][] = ['active', 'paused', 'closed'];

export default function InvestmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState('');
  const [userRole, setUserRole] = useState('viewer');
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [summary, setSummary] = useState({ totalCurrentValue: 0, totalInvested: 0, totalGain: 0, totalCount: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Investment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'mutual_fund' as Investment['type'],
    name: '',
    folioNumber: '',
    sipAmount: '',
    sipDay: '',
    startDate: '',
    currentValue: '',
    investedAmount: '',
    units: '',
    nav: '',
    platform: '',
    status: 'active' as Investment['status'],
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
        financeAPI.listInvestments(familyId),
        financeAPI.getInvestmentSummary(familyId),
      ]);
      setInvestments(list);
      setSummary(metrics);
    } catch (error) {
      console.error('Failed to load investments', error);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'mutual_fund',
      name: '',
      folioNumber: '',
      sipAmount: '',
      sipDay: '',
      startDate: '',
      currentValue: '',
      investedAmount: '',
      units: '',
      nav: '',
      platform: '',
      status: 'active',
    });
  };

  const openAddModal = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: Investment) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      name: item.name,
      folioNumber: item.folioNumber,
      sipAmount: String(item.sipAmount ?? ''),
      sipDay: String(item.sipDay ?? ''),
      startDate: item.startDate ?? '',
      currentValue: String(item.currentValue ?? ''),
      investedAmount: String(item.investedAmount ?? ''),
      units: String(item.units ?? ''),
      nav: String(item.nav ?? ''),
      platform: item.platform ?? '',
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
        type: formData.type,
        name: formData.name,
        folioNumber: formData.folioNumber,
        sipAmount: parseFloat(formData.sipAmount || '0'),
        sipDay: parseInt(formData.sipDay || '1'),
        startDate: formData.startDate || undefined,
        currentValue: parseFloat(formData.currentValue || '0'),
        investedAmount: parseFloat(formData.investedAmount || '0'),
        units: parseFloat(formData.units || '0'),
        nav: parseFloat(formData.nav || '0'),
        platform: formData.platform || undefined,
        status: formData.status,
      };
      if (editingItem) {
        await financeAPI.updateInvestment(familyId, editingItem.id, payload);
      } else {
        await financeAPI.createInvestment(familyId, payload);
      }
      closeModal();
      await reload();
    } catch (error) {
      console.error('Failed to save investment', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this investment?')) return;
    try {
      await financeAPI.deleteInvestment(familyId, id);
      await reload();
    } catch (error) {
      console.error('Failed to delete investment', error);
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Investments</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Track portfolio value, SIPs and returns</p>
              </div>
              {userRole === 'admin' && (
                <div className="flex items-center gap-2">
                  <AISmsFillButton<Investment>
                    familyId={familyId}
                    endpoint="parse-sms-investment"
                    title="AI Investment Insert"
                    description="Paste an investment SMS and AI will extract portfolio details into the form."
                    placeholder="Example: SIP of Rs 5000 for Axis Growth Fund folio AX1234 processed on 2026-03-10 via Groww. Units 12.45 NAV 40.16."
                    onParsed={(parsed) => {
                      setEditingItem(null);
                      setFormData({
                        type: parsed.type ?? 'mutual_fund',
                        name: parsed.name ?? '',
                        folioNumber: parsed.folioNumber ?? '',
                        sipAmount: parsed.sipAmount != null ? String(parsed.sipAmount) : '',
                        sipDay: parsed.sipDay != null ? String(parsed.sipDay) : '',
                        startDate: parsed.startDate ?? '',
                        currentValue: parsed.currentValue != null ? String(parsed.currentValue) : '',
                        investedAmount: parsed.investedAmount != null ? String(parsed.investedAmount) : '',
                        units: parsed.units != null ? String(parsed.units) : '',
                        nav: parsed.nav != null ? String(parsed.nav) : '',
                        platform: parsed.platform ?? '',
                        status: parsed.status ?? 'active',
                      });
                      setShowModal(true);
                    }}
                  />
                  <button onClick={openAddModal} className="flex items-center gap-2 ai-gradient-button text-white px-4 py-2.5 rounded-lg font-medium">
                    <Plus className="w-5 h-5" />
                    Add Investment
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-gray-500 dark:text-gray-400">Current Value</p><p className="text-lg font-semibold text-gray-800 dark:text-gray-100">₹{summary.totalCurrentValue.toLocaleString()}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Invested</p><p className="text-lg font-semibold text-gray-800 dark:text-gray-100">₹{summary.totalInvested.toLocaleString()}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Gain / Loss</p><p className={`text-lg font-semibold ${summary.totalGain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>₹{summary.totalGain.toLocaleString()}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Holdings</p><p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{summary.totalCount}</p></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {investments.map((item) => (
                <div key={item.id} className="rounded-xl shadow-sm border border-[var(--panel-border)] p-5 glass-black-surface">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-green-600 dark:text-green-300">{item.type.replace('_', ' ')}</p>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-1">{item.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.platform || 'Direct'}</p>
                    </div>
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="mt-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <p>Folio: {item.folioNumber}</p>
                    <p>Current Value: ₹{item.currentValue.toLocaleString()}</p>
                    <p>Invested: ₹{item.investedAmount.toLocaleString()}</p>
                    <p>SIP: ₹{item.sipAmount.toLocaleString()} on day {item.sipDay}</p>
                    <p>Units / NAV: {item.units} / ₹{item.nav}</p>
                  </div>
                  {userRole === 'admin' && (
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => openEditModal(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--panel-border)] hover:bg-black/5 dark:hover:bg-white/10">
                        <Pencil className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                      </button>
                      <button onClick={() => void handleDelete(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {investments.length === 0 && <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">No investments yet</div>}
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-xl max-w-3xl w-full p-6 glass-black-surface border border-[var(--panel-border)]">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">{editingItem ? 'Edit Investment' : 'Add Investment'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</span><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Investment['type'] })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg">{INVESTMENT_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</span><input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Folio Number</span><input value={formData.folioNumber} onChange={(e) => setFormData({ ...formData, folioNumber: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</span><input value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SIP Amount</span><input type="number" min="0" value={formData.sipAmount} onChange={(e) => setFormData({ ...formData, sipAmount: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SIP Day</span><input type="number" min="1" max="31" value={formData.sipDay} onChange={(e) => setFormData({ ...formData, sipDay: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</span><input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Value</span><input type="number" min="0" value={formData.currentValue} onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invested Amount</span><input type="number" min="0" value={formData.investedAmount} onChange={(e) => setFormData({ ...formData, investedAmount: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Units</span><input type="number" min="0" step="any" value={formData.units} onChange={(e) => setFormData({ ...formData, units: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NAV</span><input type="number" min="0" step="any" value={formData.nav} onChange={(e) => setFormData({ ...formData, nav: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</span><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Investment['status'] })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg">{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg ai-gradient-button text-white disabled:opacity-60">{isLoading ? 'Saving...' : editingItem ? 'Update Investment' : 'Save Investment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
