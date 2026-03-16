import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, Card } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import CardSMSParser from '@/components/CardSMSParser';
import { CreditCard, Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react';

type CardFormState = {
  card_type: 'credit' | 'debit';
  bank_name: string;
  card_name: string;
  last_four_digits: string;
  card_limit: string;
  billing_date: string;
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
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      const data = await financeAPI.listCards(familyId);
      setCards(data);
    } catch (error) {
      console.error('Failed to load cards', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const cardData: Partial<Card> = {
        ...formData,
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
      status: 'active'
    });
    setEditingCard(null);
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
                <ArrowLeft className="w-5 h-5 text-[var(--app-fg)]" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[var(--app-fg)]">My Cards</h2>
                <p className="text-[var(--app-fg-muted)] mt-1">{cards.length} cards</p>
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
                  Add Card
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={`p-6 rounded-xl text-white relative ${getCardGradient(
                    card.bank_name,
                    card.card_type
                  )}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <CreditCard className="w-10 h-10 opacity-80" />
                    <span className="text-xs uppercase bg-white/20 px-2 py-1 rounded">
                      {card.card_type}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm opacity-90">{card.bank_name}</p>
                    <p className="text-lg font-semibold">{card.card_name}</p>
                    <p className="text-2xl font-mono tracking-wider">•••• {card.last_four_digits}</p>
                  </div>

                  {card.card_limit && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <p className="text-xs opacity-75">Credit Limit</p>
                      <p className="text-lg font-bold">₹{parseFloat(card.card_limit.toString()).toFixed(2)}</p>
                    </div>
                  )}

                  {card.billing_date && (
                    <div className="mt-2">
                      <p className="text-xs opacity-75">Billing Date: {card.billing_date} of every month</p>
                    </div>
                  )}

                  {userRole === 'admin' && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleEdit(card)}
                        className="flex-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="flex-1 bg-red-500/80 hover:bg-red-600 px-3 py-2 rounded-lg flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
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
