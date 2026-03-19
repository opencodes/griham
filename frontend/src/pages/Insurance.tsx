import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, type Insurance } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import AISmsFillButton from '@/components/AISmsFillButton';
import { ArrowLeft, Plus, Shield, Pencil, Trash2, CalendarDays, Wallet, Users } from 'lucide-react';

const INSURANCE_TYPES: Insurance['type'][] = ['life', 'health', 'vehicle', 'term', 'other'];
const PREMIUM_FREQUENCIES: Insurance['premiumFrequency'][] = ['monthly', 'quarterly', 'yearly'];
const STATUS_OPTIONS: Insurance['status'][] = ['active', 'expired'];

type FamilyMemberOption = {
  id: string;
  user_id?: string;
  role?: string;
  full_name?: string;
  relation?: string | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value?: string | null) => {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getDaysUntil = (value?: string | null) => {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(value);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export default function InsurancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState('');
  const [userRole, setUserRole] = useState('viewer');
  const [insurance, setInsurance] = useState<Insurance[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberOption[]>([]);
  const [summary, setSummary] = useState({ totalCoverage: 0, activeCount: 0, premiumTotal: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Insurance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'health' as Insurance['type'],
    provider: '',
    policyName: '',
    policyNumber: '',
    premiumAmount: '',
    premiumFrequency: 'yearly' as Insurance['premiumFrequency'],
    nextDueDate: '',
    coverageAmount: '',
    insuredMembers: [] as string[],
    status: 'active' as Insurance['status'],
  });

  useEffect(() => {
    void loadFamily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!familyId) return;
    void loadInsurance();
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  const loadFamily = async () => {
    try {
      const families = await householdAPI.list();
      if (families.length > 0) {
        setFamilyId(families[0].id);
        const members = await householdAPI.listMembers(families[0].id);
        setFamilyMembers(members);
        const currentMember = members.find((m: { user_id?: string; role?: string }) => m.user_id === user?.id);
        if (currentMember?.role) setUserRole(currentMember.role);
      }
    } catch (error) {
      console.error('Failed to load family', error);
    }
  };

  const loadInsurance = async () => {
    try {
      const data = await financeAPI.listInsurance(familyId);
      setInsurance(data);
    } catch (error) {
      console.error('Failed to load insurance', error);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await financeAPI.getInsuranceSummary(familyId);
      setSummary(data);
    } catch (error) {
      console.error('Failed to load insurance summary', error);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'health',
      provider: '',
      policyName: '',
      policyNumber: '',
      premiumAmount: '',
      premiumFrequency: 'yearly',
      nextDueDate: '',
      coverageAmount: '',
      insuredMembers: [],
      status: 'active',
    });
  };

  const openAddModal = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: Insurance) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      provider: item.provider,
      policyName: item.policyName,
      policyNumber: item.policyNumber,
      premiumAmount: String(item.premiumAmount ?? ''),
      premiumFrequency: item.premiumFrequency,
      nextDueDate: item.nextDueDate ?? '',
      coverageAmount: String(item.coverageAmount ?? ''),
      insuredMembers: item.insuredMembers,
      status: item.status,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    resetForm();
  };

  const reload = async () => {
    await Promise.all([loadInsurance(), loadSummary()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        type: formData.type,
        provider: formData.provider,
        policyName: formData.policyName,
        policyNumber: formData.policyNumber,
        premiumAmount: parseFloat(formData.premiumAmount || '0'),
        premiumFrequency: formData.premiumFrequency,
        nextDueDate: formData.nextDueDate || undefined,
        coverageAmount: parseFloat(formData.coverageAmount || '0'),
        insuredMembers: formData.insuredMembers,
        status: formData.status,
      };
      if (editingItem) {
        await financeAPI.updateInsurance(familyId, editingItem.id, payload);
      } else {
        await financeAPI.createInsurance(familyId, payload);
      }
      closeModal();
      await reload();
    } catch (error) {
      console.error('Failed to save insurance', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this policy?')) return;
    try {
      await financeAPI.deleteInsurance(familyId, id);
      await reload();
    } catch (error) {
      console.error('Failed to delete insurance', error);
    }
  };

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const availableMemberNames = familyMembers
    .map((member) => member.full_name?.trim())
    .filter((name): name is string => Boolean(name));

  const selectedMemberSet = new Set(formData.insuredMembers);

  const addInsuredMember = (name: string) => {
    if (!name || selectedMemberSet.has(name)) return;
    setFormData((prev) => ({ ...prev, insuredMembers: [...prev.insuredMembers, name] }));
  };

  const removeInsuredMember = (name: string) => {
    setFormData((prev) => ({ ...prev, insuredMembers: prev.insuredMembers.filter((value) => value !== name) }));
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Insurance</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Track policies, premium dues and coverage</p>
              </div>
              {userRole === 'admin' && (
                <div className="flex items-center gap-2">
                  <AISmsFillButton<Insurance>
                    familyId={familyId}
                    endpoint="parse-sms-insurance"
                    title="AI Insurance Insert"
                    description="Paste an insurance SMS and AI will extract policy details into the form."
                    placeholder="Example: LIC premium due for policy 123456789. Amount Rs 18500 due on 2026-04-10. Sum assured Rs 1000000."
                    onParsed={(parsed) => {
                      setEditingItem(null);
                      setFormData({
                        type: parsed.type ?? 'health',
                        provider: parsed.provider ?? '',
                        policyName: parsed.policyName ?? '',
                        policyNumber: parsed.policyNumber ?? '',
                        premiumAmount: parsed.premiumAmount != null ? String(parsed.premiumAmount) : '',
                        premiumFrequency: parsed.premiumFrequency ?? 'yearly',
                        nextDueDate: parsed.nextDueDate ?? '',
                        coverageAmount: parsed.coverageAmount != null ? String(parsed.coverageAmount) : '',
                        insuredMembers: (parsed.insuredMembers ?? []).filter((name) =>
                          availableMemberNames.some((memberName) => memberName.toLowerCase() === name.toLowerCase())
                        ),
                        status: parsed.status ?? 'active',
                      });
                      setShowModal(true);
                    }}
                  />
                  <button onClick={openAddModal} className="flex items-center gap-2 ai-gradient-button text-white px-4 py-2.5 rounded-lg font-medium">
                    <Plus className="w-5 h-5" />
                    Add Policy
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Total Coverage</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">₹{summary.totalCoverage.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Active Policies</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{summary.activeCount}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Premium Outflow</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">₹{summary.premiumTotal.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {insurance.map((item) => {
                const dueInDays = getDaysUntil(item.nextDueDate);
                const dueTone =
                  item.status === 'expired'
                    ? 'text-red-600 dark:text-red-400'
                    : dueInDays !== null && dueInDays <= 7
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400';

                return (
                  <div
                    key={item.id}
                    className="relative overflow-hidden rounded-xl border border-[var(--panel-border)] bg-white p-4 shadow-sm dark:bg-slate-950"
                  >
                    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-indigo-500/8 blur-2xl" />

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {item.type.replace('_', ' ')}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              item.status === 'active'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {item.policyName}
                        </h3>
                        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                          {item.provider} • {item.policyNumber}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
                        <Shield className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="relative mt-4 grid grid-cols-2 gap-2.5">
                      <div className="rounded-lg border border-white/60 bg-white/70 p-2.5 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          <Wallet className="h-3.5 w-3.5" />
                          Coverage
                        </div>
                        <p className="mt-1.5 text-base font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(item.coverageAmount)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/60 bg-white/70 p-2.5 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Premium
                        </div>
                        <p className="mt-1.5 text-base font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(item.premiumAmount)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 capitalize">{item.premiumFrequency}</p>
                      </div>
                    </div>

                    <div className="relative mt-3 rounded-lg border border-white/60 bg-white/70 p-2.5 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Next Due</p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatDate(item.nextDueDate)}</p>
                        </div>
                        <div className={`text-right text-sm font-semibold ${dueTone}`}>
                          {item.status === 'expired'
                            ? 'Expired'
                            : dueInDays === null
                              ? 'No due date'
                              : dueInDays < 0
                                ? `${Math.abs(dueInDays)} day(s) ago`
                                : dueInDays === 0
                                  ? 'Due today'
                                  : `${dueInDays} day(s) left`}
                        </div>
                      </div>
                    </div>

                    <div className="relative mt-3 rounded-lg border border-white/60 bg-white/70 p-2.5 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex items-center gap-2 whitespace-nowrap text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          <Users className="h-3.5 w-3.5" />
                          Insured Members
                        </div>
                        <div className="flex flex-1 flex-wrap gap-1.5">
                          {item.insuredMembers.length > 0 ? (
                            item.insuredMembers.map((member) => (
                              <span
                                key={member}
                                className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-slate-900"
                              >
                                {member}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">No insured members selected</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {userRole === 'admin' && (
                      <div className="relative mt-3 flex items-center justify-end gap-1">
                        <button onClick={() => openEditModal(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                          <Pencil className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                        </button>
                        <button onClick={() => void handleDelete(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {insurance.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">No insurance policies yet</div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-xl max-w-2xl w-full p-6 glass-black-surface border border-[var(--panel-border)]">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">{editingItem ? 'Edit Policy' : 'Add Policy'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</span>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Insurance['type'] })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg">
                  {INSURANCE_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</span>
                <input value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Policy Name</span>
                <input value={formData.policyName} onChange={(e) => setFormData({ ...formData, policyName: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Policy Number</span>
                <input value={formData.policyNumber} onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Premium Amount</span>
                <input type="number" min="0" value={formData.premiumAmount} onChange={(e) => setFormData({ ...formData, premiumAmount: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Premium Frequency</span>
                <select value={formData.premiumFrequency} onChange={(e) => setFormData({ ...formData, premiumFrequency: e.target.value as Insurance['premiumFrequency'] })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg">
                  {PREMIUM_FREQUENCIES.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Due Date</span>
                <input type="date" value={formData.nextDueDate} onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coverage Amount</span>
                <input type="number" min="0" value={formData.coverageAmount} onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg" />
              </label>
              <label className="block md:col-span-2">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Insured Members</span>
                <select
                  value=""
                  onChange={(e) => {
                    addInsuredMember(e.target.value);
                    e.target.value = '';
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                >
                  <option value="">Select family member</option>
                  {availableMemberNames
                    .filter((name) => !selectedMemberSet.has(name))
                    .map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                </select>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.insuredMembers.length === 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">No family members selected</span>
                  )}
                  {formData.insuredMembers.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => removeInsuredMember(name)}
                      className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                      {name}
                      <span className="text-xs">x</span>
                    </button>
                  ))}
                </div>
              </label>
              <label className="block md:col-span-2">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</span>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Insurance['status'] })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg">
                  {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg ai-gradient-button text-white disabled:opacity-60">
                  {isLoading ? 'Saving...' : editingItem ? 'Update Policy' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
