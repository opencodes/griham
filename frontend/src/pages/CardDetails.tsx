import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, Card, Transaction } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { CardDetailsPanel } from '@/components/CardDetailsPanel';

export default function CardDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cardId } = useParams();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState<string>('');
  const [card, setCard] = useState<Card | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        void currentMember?.role;
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
        financeAPI.listTransactions(familyId, { card_id: cardId })
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

            <CardDetailsPanel
              card={card}
              transactions={transactions}
              isLoading={isLoading}
              onRefresh={() => void loadCardAndTransactions()}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
