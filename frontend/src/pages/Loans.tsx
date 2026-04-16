import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, type Loan, type LoanPaydownForecast } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import LoanSMSParser from '@/components/LoanSMSParser';
import { ArrowLeft, Plus, Landmark, Pencil, Trash2, TrendingDown } from 'lucide-react';

const LOAN_TYPES: Loan['type'][] = ['home', 'car', 'personal', 'education', 'other'];
const STATUS_OPTIONS: Loan['status'][] = ['active', 'closed'];
const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const fullCurrencyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const LOAN_LINE_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899'];

function formatCompactCurrency(value: number) {
  return `₹${compactCurrencyFormatter.format(Math.max(value, 0))}`;
}

function formatCurrency(value: number) {
  return `₹${fullCurrencyFormatter.format(Math.max(Math.round(value), 0))}`;
}

function LoanPaydownForecastCard({ forecast }: { forecast: LoanPaydownForecast | null }) {
  if (!forecast || forecast.schedule.length === 0) return null;

  const chartWidth = 720;
  const chartHeight = 240;
  const padding = 28;
  const maxOutstanding = Math.max(...forecast.schedule.map((point) => point.totalOutstanding), 1);
  const graphWidth = chartWidth - padding * 2;
  const graphHeight = chartHeight - padding * 2;
  const stepX = forecast.schedule.length > 1 ? graphWidth / (forecast.schedule.length - 1) : 0;

  const points = forecast.schedule.map((point, index) => {
    const x = padding + (forecast.schedule.length > 1 ? stepX * index : graphWidth / 2);
    const y = padding + graphHeight - (point.totalOutstanding / maxOutstanding) * graphHeight;
    return { ...point, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;
  const tickIndexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));
  const [highlightedLoanId, setHighlightedLoanId] = useState<string | null>(forecast.loans[0]?.loanId ?? null);
  const highlightedLoan = forecast.loans.find((loan) => loan.loanId === highlightedLoanId) ?? forecast.loans[0] ?? null;
  const highlightedPoint = highlightedLoan
    ? points[Math.max(Math.min(highlightedLoan.projectedPayoffMonths - 1, points.length - 1), 0)]
    : null;
  const loanLines = forecast.loans.map((loan, loanIndex) => {
    const color = LOAN_LINE_COLORS[loanIndex % LOAN_LINE_COLORS.length];
    const loanPoints = points.map((point, monthIndex) => {
      const schedulePoint = loan.schedule[monthIndex];
      const endingBalance = schedulePoint?.endingBalance ?? 0;
      const y = padding + graphHeight - (endingBalance / maxOutstanding) * graphHeight;
      return {
        x: point.x,
        y,
        monthLabel: point.monthLabel,
        endingBalance,
      };
    });

    return {
      ...loan,
      color,
      points: loanPoints,
      linePath: loanPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '),
    };
  });
  const highlightedLoanLine = loanLines.find((loan) => loan.loanId === highlightedLoan?.loanId) ?? null;

  return (
    <section className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-200">
            <TrendingDown className="h-3.5 w-3.5" />
            Loan reduction forecast
          </div>
          <h3 className="mt-2 text-lg font-semibold text-gray-800 dark:text-gray-100">Month-by-month payoff view</h3>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Projected outstanding balance based on current EMI, rate, and tenure values saved for each active loan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0 lg:min-w-[390px]">
          <div className="rounded-xl border border-[var(--panel-border)] bg-white/5 p-2.5">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Outstanding now</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white">{formatCurrency(forecast.overview.totalOutstanding)}</p>
          </div>
          <div className="rounded-xl border border-[var(--panel-border)] bg-white/5 p-2.5">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Projected payoff</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white">{forecast.overview.projectedPayoffMonth || 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-[var(--panel-border)] bg-white/5 p-2.5">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Interest left</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white">{formatCurrency(forecast.overview.totalInterestRemaining)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] gap-4">
        <div className="rounded-xl border border-[var(--panel-border)] bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-3">
          <div className="mb-2.5 flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
            <span>{forecast.overview.projectedPayoffMonths} months to close current active loans</span>
            <span>Total EMI {formatCurrency(forecast.overview.totalMonthlyEmi)}/mo</span>
          </div>

          <div className="relative">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-56 w-full">
              <defs>
                <linearGradient id="loanForecastArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.04" />
                </linearGradient>
              </defs>

              {[0, 0.5, 1].map((ratio) => {
                const y = padding + graphHeight * ratio;
                return (
                  <g key={ratio}>
                    <line x1={padding} x2={chartWidth - padding} y1={y} y2={y} stroke="rgba(148,163,184,0.18)" strokeDasharray="4 6" />
                    <text x={8} y={y + 4} fill="currentColor" className="text-[11px] text-gray-500 dark:text-gray-400">
                      {formatCompactCurrency(maxOutstanding * (1 - ratio))}
                    </text>
                  </g>
                );
              })}

              <path d={areaPath} fill="url(#loanForecastArea)" />
              <path d={linePath} fill="none" stroke="rgba(245,158,11,0.35)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {loanLines.map((loan) => (
                <path
                  key={loan.loanId}
                  d={loan.linePath}
                  fill="none"
                  stroke={loan.color}
                  strokeWidth={highlightedLoan?.loanId === loan.loanId ? 3.5 : 2}
                  strokeOpacity={highlightedLoan?.loanId === loan.loanId ? 1 : 0.65}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {highlightedPoint && highlightedLoan && (
                <>
                  <line
                    x1={highlightedPoint.x}
                    x2={highlightedPoint.x}
                    y1={padding}
                    y2={chartHeight - padding}
                    stroke="rgba(245,158,11,0.55)"
                    strokeDasharray="6 6"
                    strokeWidth="2"
                  />
                  <circle
                    cx={highlightedPoint.x}
                    cy={highlightedPoint.y}
                    r={8}
                    fill="rgba(245,158,11,0.18)"
                    stroke={highlightedLoanLine?.color || '#f59e0b'}
                    strokeWidth="2"
                  />
                  <circle
                    cx={highlightedPoint.x}
                    cy={highlightedPoint.y}
                    r={4.5}
                    fill={highlightedLoanLine?.color || '#f59e0b'}
                    stroke="rgba(255,255,255,0.95)"
                    strokeWidth="2"
                  />
                  <text
                    x={Math.min(highlightedPoint.x + 10, chartWidth - 120)}
                    y={Math.max(highlightedPoint.y - 12, padding + 12)}
                    fill="currentColor"
                    className="text-[11px] text-amber-700 dark:text-amber-200"
                  >
                    {`${highlightedLoan.name} closes ${highlightedPoint.monthLabel}`}
                  </text>
                </>
              )}

              {points.map((point, index) => (
                <circle
                  key={`${point.monthLabel}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={index === points.length - 1 ? 4.5 : 3}
                  fill="rgba(245,158,11,0.9)"
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth="2"
                />
              ))}

              {loanLines.map((loan) => {
                const payoffPoint = loan.points[Math.max(Math.min(loan.projectedPayoffMonths - 1, loan.points.length - 1), 0)];
                if (!payoffPoint) return null;
                return (
                  <circle
                    key={`${loan.loanId}-payoff`}
                    cx={payoffPoint.x}
                    cy={payoffPoint.y}
                    r={highlightedLoan?.loanId === loan.loanId ? 4.5 : 3}
                    fill={loan.color}
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth="1.5"
                  />
                );
              })}

              {tickIndexes.map((index) => (
                <text
                  key={`${points[index].monthLabel}-${index}`}
                  x={points[index].x}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-[11px] text-gray-500 dark:text-gray-400"
                >
                  {points[index].monthLabel}
                </text>
              ))}
            </svg>
          </div>
        </div>

        <div className="space-y-2.5">
          {forecast.loans.map((loan) => (
            <button
              key={loan.loanId}
              type="button"
              onClick={() => setHighlightedLoanId(loan.loanId)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                highlightedLoan?.loanId === loan.loanId
                  ? 'border-amber-500/60 bg-amber-500/10 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]'
                  : 'border-[var(--panel-border)] bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: loanLines.find((line) => line.loanId === loan.loanId)?.color || LOAN_LINE_COLORS[0] }}
                    />
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{loan.name}</p>
                  </div>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{loan.lender}</p>
                </div>
                <div className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-200">
                  {loan.projectedPayoffMonths} mo left
                </div>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">EMI</p>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(loan.emiAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tenure</p>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{loan.tenureMonths} mo</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rate</p>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{loan.interestRate}%</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

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
  const [paydownForecast, setPaydownForecast] = useState<LoanPaydownForecast | null>(null);
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
      const [list, metrics, forecast] = await Promise.all([
        financeAPI.listLoans(familyId),
        financeAPI.getLoanSummary(familyId),
        financeAPI.getLoanPaydownForecast(familyId),
      ]);
      setLoans(list);
      setSummary(metrics);
      setPaydownForecast(forecast);
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

  const applyParsedLoan = (parsed: Partial<Loan>) => {
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
      type: parsed.type ?? 'other',
      status: parsed.status ?? 'active',
    });
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
        <main className="flex-1 px-3 md:px-4 py-3 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/finance')} className="icon-button glass-black-surface">
                <ArrowLeft className="w-4 h-4 text-gray-800 dark:text-gray-200" />
              </button>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Loans</h2>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">Track EMI commitments and outstanding balances</p>
              </div>
              {userRole === 'admin' && (
                <div className="flex items-center gap-2">
                  <button onClick={openAddModal} className="flex items-center gap-2 ai-gradient-button text-white px-3.5 py-2 rounded-lg font-medium text-sm">
                    <Plus className="w-4 h-4" />
                    Add Loan
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-3 glass-black-surface">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p><p className="text-base font-semibold text-gray-800 dark:text-gray-100">₹{summary.totalOutstanding.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Monthly EMI</p><p className="text-base font-semibold text-gray-800 dark:text-gray-100">₹{summary.totalEmi.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Active Loans</p><p className="text-base font-semibold text-gray-800 dark:text-gray-100">{summary.activeCount}</p></div>
              </div>
            </div>

            <LoanPaydownForecastCard forecast={paydownForecast} />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {loans.map((item) => (
                <div key={item.id} className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-300">{item.type}</p>
                      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mt-1">{item.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.lender}</p>
                    </div>
                    <Landmark className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <p>Principal: ₹{item.principalAmount.toLocaleString()}</p>
                    <p>Outstanding: ₹{item.outstandingPrincipal.toLocaleString()}</p>
                    <p>EMI: ₹{item.emiAmount.toLocaleString()}</p>
                    <p>Interest: {item.interestRate}%</p>
                    <p>Next Due: {item.nextDueDate || 'N/A'}</p>
                  </div>
                  {userRole === 'admin' && (
                    <div className="mt-3 flex justify-end gap-2">
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
          <div className="rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-5 glass-black-surface border border-[var(--panel-border)]">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">{editingItem ? 'Edit Loan' : 'Add Loan'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="md:col-span-2 lg:col-span-3">
                <LoanSMSParser
                  familyId={familyId}
                  onParsed={(data) => {
                    applyParsedLoan(data as Partial<Loan>);
                  }}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 border-t border-[var(--panel-border)] pt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Or fill manually:</p>
              </div>

              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Loan Name</span><input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="input-theme" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lender</span><input value={formData.lender} onChange={(e) => setFormData({ ...formData, lender: e.target.value })} required className="input-theme" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Principal Amount</span><input type="number" min="0" value={formData.principalAmount} onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })} className="input-theme" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outstanding Principal</span><input type="number" min="0" value={formData.outstandingPrincipal} onChange={(e) => setFormData({ ...formData, outstandingPrincipal: e.target.value })} className="input-theme" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interest Rate (%)</span><input type="number" min="0" step="0.01" value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })} className="input-theme" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tenure (Months)</span><input type="number" min="0" value={formData.tenureMonths} onChange={(e) => setFormData({ ...formData, tenureMonths: e.target.value })} className="input-theme" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">EMI Amount</span><input type="number" min="0" value={formData.emiAmount} onChange={(e) => setFormData({ ...formData, emiAmount: e.target.value })} className="input-theme" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</span><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Loan['type'] })} className="input-theme">{LOAN_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</span><input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="input-theme" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Due Date</span><input type="date" value={formData.nextDueDate} onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })} className="input-theme" /></label>
              <label className="block"><span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</span><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Loan['status'] })} className="input-theme">{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2 mt-2">
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
