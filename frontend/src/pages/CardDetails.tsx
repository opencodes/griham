import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, Card, Transaction } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

const bankGradientMap: Record<string, string> = {
  hdfc: 'bg-gradient-to-br from-blue-600 to-indigo-700',
  icici: 'bg-gradient-to-br from-orange-500 to-rose-700',
  sbi: 'bg-gradient-to-br from-sky-600 to-cyan-500',
  axis: 'bg-gradient-to-br from-red-600 to-rose-700',
  kotak: 'bg-gradient-to-br from-emerald-600 to-teal-700',
  yes: 'bg-gradient-to-br from-lime-600 to-green-700',
  pnb: 'bg-gradient-to-br from-amber-500 to-orange-700',
  indusind: 'bg-gradient-to-br from-purple-600 to-fuchsia-700',
  baroda: 'bg-gradient-to-br from-red-600 to-orange-600',
  canara: 'bg-gradient-to-br from-blue-500 to-sky-700',
  idfc: 'bg-gradient-to-br from-rose-600 to-pink-700',
  federal: 'bg-gradient-to-br from-slate-600 to-zinc-700',
  rbl: 'bg-gradient-to-br from-fuchsia-600 to-purple-700',
  hsbc: 'bg-gradient-to-br from-red-600 to-pink-700',
  citi: 'bg-gradient-to-br from-sky-600 to-blue-700',
  amex: 'bg-gradient-to-br from-emerald-600 to-green-700'
};

const cardGradients = [
  'bg-gradient-to-br from-blue-600 to-cyan-700',
  'bg-gradient-to-br from-emerald-600 to-teal-700',
  'bg-gradient-to-br from-amber-500 to-orange-700',
  'bg-gradient-to-br from-rose-600 to-pink-700',
  'bg-gradient-to-br from-indigo-600 to-sky-700',
  'bg-gradient-to-br from-lime-600 to-green-700',
  'bg-gradient-to-br from-fuchsia-600 to-purple-700',
  'bg-gradient-to-br from-slate-600 to-zinc-700'
];

const normalizeBankName = (value: string) =>
  value
    .toLowerCase()
    .replace(/bank/g, '')
    .replace(/[^a-z0-9]/g, '');

const getCardGradient = (bankName: string | undefined, cardType: Card['card_type']) => {
  const name = bankName?.trim();
  if (!name) {
    return cardType === 'credit'
      ? 'bg-gradient-to-br from-purple-600 to-indigo-700'
      : 'bg-gradient-to-br from-blue-600 to-cyan-700';
  }

  const normalized = normalizeBankName(name);
  for (const [key, gradient] of Object.entries(bankGradientMap)) {
    if (normalized.includes(key)) return gradient;
  }

  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % cardGradients.length;
  }
  return cardGradients[hash];
};

const formatCurrency = (value?: number) =>
  value == null ? '-' : `₹${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const matchesCard = (card: Card, tx: Transaction) => {
  const needle = [
    card.card_name,
    card.bank_name,
    card.last_four_digits
  ]
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  if (needle.length === 0) return false;
  const hay = [
    tx.description,
    tx.bank_name,
    tx.account_name
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return needle.some((n) => hay.includes(n));
};

export default function CardDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cardId } = useParams();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [card, setCard] = useState<Card | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [onlyMatches, setOnlyMatches] = useState(false);

  useEffect(() => {
    loadFamily();
  }, []);

  useEffect(() => {
    if (familyId) {
      loadCardAndTransactions();
    }
  }, [familyId, cardId]);

  const loadFamily = async () => {
    try {
      const families = await householdAPI.list();
      if (families.length > 0) {
        setFamilyId(families[0].id);
        const members = await householdAPI.listMembers(families[0].id);
        const currentMember = members.find((m: any) => m.user_id === user?.id);
        setUserRole(currentMember?.role || 'viewer');
      }
    } catch (error) {
      console.error('Failed to load family', error);
    }
  };

  const loadCardAndTransactions = async () => {
    if (!cardId) return;
    setIsLoading(true);
    try {
      const [cards, tx] = await Promise.all([
        financeAPI.listCards(familyId),
        financeAPI.listTransactions(familyId)
      ]);
      const target = cards.find((c: Card) => c.id === cardId) || null;
      setCard(target);
      setTransactions(tx);
    } catch (error) {
      console.error('Failed to load card details', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!card) return transactions;
    if (!onlyMatches) return transactions;
    return transactions.filter((tx) => matchesCard(card, tx));
  }, [transactions, card, onlyMatches]);

  const totalSpend = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => {
      if (tx.type === 'expense') return sum + (tx.amount || 0);
      return sum;
    }, 0);
  }, [filteredTransactions]);

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
                onClick={() => navigate('/finance/cards')}
                className="w-10 h-10 rounded-lg border border-[var(--panel-border)] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 shadow-sm glass-black-surface"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--app-fg)]" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[var(--app-fg)]">Card Details</h2>
                <p className="text-[var(--app-fg-muted)] mt-1">
                  {card ? `${card.bank_name} ${card.card_name}` : 'Loading card...'}
                </p>
              </div>
            </div>

            {card ? (
              <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
                <div className={`relative overflow-hidden rounded-2xl text-white shadow-xl ${getCardGradient(card.bank_name, card.card_type)}`} style={{ aspectRatio: '1.586', minHeight: '220px' }}>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-14 -right-10 h-36 w-36 rounded-full bg-white/20 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-black/20 blur-2xl" />
                  </div>
                  <div className="relative p-6 h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/80">{card.bank_name}</p>
                        <p className="text-lg font-semibold truncate">{card.card_name}</p>
                      </div>
                      <span className="text-[11px] uppercase bg-white/20 px-2 py-1 rounded">{card.card_type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-12 rounded-md bg-white/25 border border-white/30 shadow-inner">
                        <div className="h-full w-full rounded-md bg-gradient-to-br from-white/30 to-transparent" />
                      </div>
                      <CreditCard className="w-10 h-10 opacity-70" />
                    </div>
                    <p className="text-xl font-mono tracking-[0.3em]">•••• {card.last_four_digits}</p>
                  </div>
                </div>

                <div className="premium-panel rounded-2xl border border-[var(--panel-border)] p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Bank</p>
                      <p className="text-[var(--app-fg)] font-semibold">{card.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Card Name</p>
                      <p className="text-[var(--app-fg)] font-semibold">{card.card_name}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Type</p>
                      <p className="text-[var(--app-fg)] font-semibold capitalize">{card.card_type}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Status</p>
                      <p className="text-[var(--app-fg)] font-semibold capitalize">{card.status}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Last 4 Digits</p>
                      <p className="text-[var(--app-fg)] font-semibold">•••• {card.last_four_digits}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Billing Date</p>
                      <p className="text-[var(--app-fg)] font-semibold">{card.billing_date ? `${card.billing_date} / month` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Credit Limit</p>
                      <p className="text-[var(--app-fg)] font-semibold">{formatCurrency(card.card_limit)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Created</p>
                      <p className="text-[var(--app-fg)] font-semibold">{formatDate(card.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] p-4 bg-black/5 dark:bg-white/5">
                    <div>
                      <p className="text-xs uppercase text-[var(--app-fg-muted)]">Total Spend</p>
                      <p className="text-xl font-semibold text-[var(--app-fg)]">{formatCurrency(totalSpend)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--app-fg-muted)]">Transactions</p>
                      <p className="text-lg font-semibold text-[var(--app-fg)]">{filteredTransactions.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="premium-panel rounded-2xl border border-[var(--panel-border)] p-6 text-[var(--app-fg-muted)]">
                {isLoading ? 'Loading card...' : 'Card not found.'}
              </div>
            )}

            <div className="premium-panel rounded-2xl border border-[var(--panel-border)] p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--app-fg)]">Transactions</h3>
                  <p className="text-sm text-[var(--app-fg-muted)]">
                    {onlyMatches ? 'Showing likely card transactions.' : 'Showing all family transactions.'}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--app-fg)]">
                  <input
                    type="checkbox"
                    checked={onlyMatches}
                    onChange={(e) => setOnlyMatches(e.target.checked)}
                  />
                  Only show likely matches
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--app-fg-muted)] border-b border-[var(--panel-border)]">
                      <th className="py-3 pr-4">Date</th>
                      <th className="py-3 pr-4">Description</th>
                      <th className="py-3 pr-4">Type</th>
                      <th className="py-3 pr-4">Category</th>
                      <th className="py-3 pr-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[var(--app-fg-muted)]">
                          No transactions to show.
                        </td>
                      </tr>
                    )}
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-[var(--panel-border)] last:border-0">
                        <td className="py-3 pr-4">{formatDate(tx.transaction_date)}</td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-[var(--app-fg)]">{tx.description || '-'}</div>
                          <div className="text-xs text-[var(--app-fg-muted)]">{tx.bank_name || tx.account_name || ''}</div>
                        </td>
                        <td className="py-3 pr-4 capitalize">{tx.type}</td>
                        <td className="py-3 pr-4">{tx.category}</td>
                        <td className={`py-3 pr-4 text-right font-semibold ${tx.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!card && !isLoading && (
              <div className="text-center py-8 text-sm text-[var(--app-fg-muted)]">
                Check the card ID or return to the cards list.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
