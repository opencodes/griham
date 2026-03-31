import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, Card, Transaction } from '@/lib/api';
import { CARD_COLOR_PRESETS } from '@/lib/cardAppearance';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import CardSMSParser from '@/components/CardSMSParser';
import { CreditCard, Plus, X, ArrowLeft } from 'lucide-react';
import { CardDetailsPanel } from '@/components/CardDetailsPanel';

type CardFormState = {
  card_type: 'credit' | 'debit';
  bank_name: string;
  card_name: string;
  last_four_digits: string;
  card_limit: string;
  billing_date: string;
  background_color: string;
  status: 'active' | 'inactive' | 'blocked';
};

export default function Cards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isValidHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value.trim());
  const getSafeBackgroundColor = (value?: string | null) =>
    value && isValidHexColor(value) ? value : CARD_COLOR_PRESETS[0];

  const formatCardTabLabel = (card: Card) => {
    const bank = (card.bank_name || 'Card').trim().split(/\s+/)[0];
    return `${bank} - XXXX${card.last_four_digits}`;
  };

  const summary = useMemo(() => {
    const totalSpending = transactions.reduce((sum, tx) => {
      if (tx.type === 'expense') return sum + (tx.amount || 0);
      return sum;
    }, 0);
    const totalPayments = transactions.reduce((sum, tx) => {
      if (tx.type === 'income') return sum + (tx.amount || 0);
      return sum;
    }, 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const statementDue = transactions.reduce((sum, tx) => {
      if (tx.type !== 'expense') return sum;
      const d = new Date(tx.transaction_date);
      if (Number.isNaN(d.getTime())) return sum;
      if (d < monthStart) return sum;
      return sum + (tx.amount || 0);
    }, 0);
    const activeCards = cards.filter((c) => c.status === 'active').length;
    const totalLimit = cards.reduce((sum, c) => sum + (c.card_limit || 0), 0);
    const avgSpend = cards.length > 0 ? totalSpending / cards.length : 0;
    return {
      totalSpending,
      totalPayments,
      statementDue,
      activeCards,
      totalLimit,
      avgSpend
    };
  }, [cards, transactions]);

  const suggestedBankNames = (() => {
    const map = new Map<string, string>();
    for (const card of cards) {
      const name = card.bank_name?.trim();
      if (!name || name.toLowerCase() === 'bank') continue;
      const key = name.toLowerCase();
      if (!map.has(key)) map.set(key, name);
    }
    return Array.from(map.values());
  })();

  const lastSuggestedBankName = (() => {
    const candidates = cards.filter((card) => {
      const name = card.bank_name?.trim();
      return name && name.toLowerCase() !== 'bank';
    });
    if (candidates.length === 0) return '';
    const sorted = candidates.sort((a, b) => {
      const aTime = Date.parse(a.created_at || '') || 0;
      const bTime = Date.parse(b.created_at || '') || 0;
      return bTime - aTime;
    });
    return sorted[0]?.bank_name?.trim() || '';
  })();

  const [formData, setFormData] = useState<CardFormState>({
    card_type: 'credit',
    bank_name: '',
    card_name: '',
    last_four_digits: '',
    card_limit: '',
    billing_date: '',
    background_color: CARD_COLOR_PRESETS[0],
    status: 'active'
  });

  useEffect(() => {
    loadFamily();
  }, []);

  useEffect(() => {
    if (familyId) {
      loadCards();
    }
  }, [familyId]);

  useEffect(() => {
    if (cards.length === 0) {
      setSelectedCardId('');
      setSelectedTransactions([]);
      return;
    }

    const selectedExists = cards.some((card) => card.id === selectedCardId);
    if (!selectedExists) {
      setSelectedCardId(cards[0].id);
    }
  }, [cards, selectedCardId]);

  useEffect(() => {
    if (familyId && selectedCardId) {
      void loadSelectedCardTransactions(selectedCardId);
    }
  }, [familyId, selectedCardId]);

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

  const loadCards = async () => {
    try {
      const [data, tx] = await Promise.all([
        financeAPI.listCards(familyId),
        financeAPI.listTransactions(familyId)
      ]);
      setCards(data);
      setTransactions(tx);
    } catch (error) {
      console.error('Failed to load cards', error);
    }
  };

  const loadSelectedCardTransactions = async (cardId: string) => {
    setDetailsLoading(true);
    try {
      const tx = await financeAPI.listTransactions(familyId, { card_id: cardId });
      setSelectedTransactions(tx);
    } catch (error) {
      console.error('Failed to load card transactions', error);
      setSelectedTransactions([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const cardData: Partial<Card> = {
        ...formData,
        background_color: isValidHexColor(formData.background_color) ? formData.background_color : null,
        card_limit: formData.card_limit ? parseFloat(formData.card_limit) : undefined,
        billing_date: formData.billing_date ? parseInt(formData.billing_date) : undefined
      };

      if (editingCard) {
        await financeAPI.updateCard(familyId, editingCard.id, cardData);
      } else {
        await financeAPI.createCard(familyId, cardData);
      }

      setShowModal(false);
      resetForm();
      loadCards();
    } catch (error) {
      console.error('Failed to save card', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (card: Card) => {
    setEditingCard(card);
    setFormData({
      card_type: card.card_type,
      bank_name: card.bank_name,
      card_name: card.card_name,
      last_four_digits: card.last_four_digits,
      card_limit: card.card_limit?.toString() || '',
      billing_date: card.billing_date?.toString() || '',
      background_color: getSafeBackgroundColor(card.background_color),
      status: card.status
    });
    setShowModal(true);
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      await financeAPI.deleteCard(familyId, cardId);
      loadCards();
    } catch (error) {
      console.error('Failed to delete card', error);
    }
  };

  const resetForm = () => {
    setFormData({
      card_type: 'credit',
      bank_name: lastSuggestedBankName,
      card_name: '',
      last_four_digits: '',
      card_limit: '',
      billing_date: '',
      background_color: CARD_COLOR_PRESETS[0],
      status: 'active'
    });
    setEditingCard(null);
  };

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;

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

        <main className="flex-1 px-3 md:px-5 py-3 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigate('/finance')}
                className="icon-button glass-black-surface"
              >
                <ArrowLeft className="w-4.5 h-4.5 text-[var(--app-fg)]" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-[1.375rem] font-bold text-[var(--app-fg)] tracking-tight">My Cards</h2>
                <p className="text-xs text-[var(--app-fg-muted)] mt-0.5">{cards.length} cards</p>
              </div>
              {userRole === 'admin' && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="inline-flex w-full sm:w-auto justify-center items-center gap-2 ai-gradient-button text-white px-4 rounded-lg font-medium"
                >
                  <Plus className="w-4.5 h-4.5" />
                  Add Card
                </button>
              )}
            </div>

            <div className="premium-panel rounded-xl border border-[var(--panel-border)] p-3">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-sm">
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Total Spending</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">
                    ₹{summary.totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Total Payments</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">
                    ₹{summary.totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Statement Due</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">
                    ₹{summary.statementDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Active Cards</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">{summary.activeCards}</p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Total Credit Limit</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">
                    ₹{summary.totalLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Avg Spend / Card</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">
                    ₹{summary.avgSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] p-3 glass-black-surface">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-[var(--app-fg)]">Card Tabs</h3>
                <p className="text-[11px] text-[var(--app-fg-muted)] mt-0.5">Choose a card tab to view details and transactions below.</p>
              </div>

              {cards.length > 0 && (
                <div className="border-b border-[var(--panel-border)] mb-3">
                  <div className="flex gap-1.5 overflow-x-auto pb-0">
                    {cards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setSelectedCardId(card.id)}
                        className={`shrink-0 rounded-t-lg border border-b-0 px-3 py-2 text-sm font-medium transition-colors ${
                          selectedCardId === card.id
                            ? 'bg-[var(--panel-bg)] text-[var(--primary-text)] border-[var(--panel-border)] shadow-sm relative'
                            : 'bg-[var(--surface-muted)] text-[var(--app-fg-muted)] border-transparent hover:text-[var(--app-fg)] hover:bg-[var(--surface-subtle)]'
                        }`}
                        style={selectedCardId === card.id ? {
                          boxShadow: 'inset 0 2px 0 var(--primary), 0 -1px 0 var(--panel-bg)',
                        } : undefined}
                      >
                        <span className="whitespace-nowrap">{formatCardTabLabel(card)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <CardDetailsPanel
                card={selectedCard}
                transactions={selectedTransactions}
                isLoading={detailsLoading}
                onRefresh={() => selectedCardId ? loadSelectedCardTransactions(selectedCardId) : undefined}
                onEdit={userRole === 'admin' ? handleEdit : undefined}
                onDelete={userRole === 'admin' ? handleDelete : undefined}
              />
            </div>

            {cards.length === 0 && (
              <div className="text-center py-12 rounded-xl border border-[var(--panel-border)] glass-black-surface">
                <CreditCard className="w-16 h-16 text-[var(--app-fg-muted)] mx-auto mb-4" />
                <p className="text-[var(--app-fg-muted)] mb-2">No cards yet</p>
                <p className="text-sm text-[var(--app-fg-muted)]">Add your first card to get started</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="premium-panel rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--panel-border)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[var(--app-fg)]">
                {editingCard ? 'Edit Card' : 'Add Card'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--app-fg-muted)] hover:text-[var(--app-fg)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <CardSMSParser
                familyId={familyId}
                onParsed={(data) => {
                  const parsed = data as Partial<Card>;
                  const parsedCardType = parsed.card_type === 'debit' ? 'debit' : 'credit';
                  setFormData({
                    card_type: parsedCardType,
                    bank_name: parsed.bank_name || '',
                    card_name: parsed.card_name || '',
                    last_four_digits: parsed.last_four_digits || '',
                    card_limit: parsed.card_limit?.toString() || '',
                    billing_date: '',
                    background_color: getSafeBackgroundColor(formData.background_color),
                    status: 'active'
                  });
                }}
              />

              <div className="border-t border-[var(--panel-border)] pt-4">
                <p className="text-sm text-[var(--app-fg-muted)] mb-3">Or fill manually:</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Card Type</label>
                <select
                  value={formData.card_type}
                  onChange={(e) => setFormData({ ...formData, card_type: e.target.value === 'debit' ? 'debit' : 'credit' })}
                  required
                  className="input-theme"
                >
                  <option value="credit">Credit Card</option>
                  <option value="debit">Debit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  required
                  placeholder="HDFC Bank"
                  className="input-theme"
                  list="card-bank-name-suggestions"
                />
                {suggestedBankNames.length > 0 && (
                  <datalist id="card-bank-name-suggestions">
                    {suggestedBankNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Card Name</label>
                <input
                  type="text"
                  value={formData.card_name}
                  onChange={(e) => setFormData({ ...formData, card_name: e.target.value })}
                  required
                  placeholder="Platinum Credit Card"
                  className="input-theme"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Last 4 Digits</label>
                <input
                  type="text"
                  value={formData.last_four_digits}
                  onChange={(e) => setFormData({ ...formData, last_four_digits: e.target.value.slice(0, 4) })}
                  required
                  maxLength={4}
                  placeholder="1234"
                  className="input-theme"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Card Background</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={getSafeBackgroundColor(formData.background_color)}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="h-11 w-14 cursor-pointer rounded-md border border-[var(--panel-border)] bg-transparent p-1"
                    aria-label="Choose card background color"
                  />
                  <input
                    type="text"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    placeholder="#1d4ed8"
                    className="input-theme"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {CARD_COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, background_color: color })}
                      className={`h-8 w-8 rounded-full border-2 ${formData.background_color === color ? 'border-white ring-2 ring-[var(--brand-primary)]' : 'border-white/40'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Use ${color} for card background`}
                    />
                  ))}
                </div>
              </div>

              {formData.card_type === 'credit' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Credit Limit (Optional)</label>
                    <input
                      type="number"
                      value={formData.card_limit}
                      onChange={(e) => setFormData({ ...formData, card_limit: e.target.value })}
                      placeholder="100000"
                      className="input-theme"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Billing Date (Optional)</label>
                    <input
                      type="number"
                      value={formData.billing_date}
                      onChange={(e) => setFormData({ ...formData, billing_date: e.target.value })}
                      min="1"
                      max="31"
                      placeholder="15"
                      className="input-theme"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CardFormState['status'] })}
                  required
                  className="input-theme"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

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
                  {isLoading ? 'Saving...' : editingCard ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
