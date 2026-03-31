import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, BankAccount, Transaction } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { AccountDetailsPanel } from '@/components/AccountDetailsPanel';

export default function AccountDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { accountId } = useParams();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState<string>('');
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadFamily();
  }, []);

  useEffect(() => {
    if (familyId && accountId) {
      void loadAccountAndTransactions();
    }
  }, [familyId, accountId]);

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

  const loadAccountAndTransactions = async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const [accounts, tx] = await Promise.all([
        financeAPI.listAccounts(familyId),
        financeAPI.listTransactions(familyId, { account_id: accountId }),
      ]);
      const target = accounts.find((item: BankAccount) => item.id === accountId) || null;
      setAccount(target);
      setTransactions(tx);
    } catch (error) {
      console.error('Failed to load account details', error);
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

        <main className="flex-1 px-3 md:px-5 py-3 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => navigate('/finance/accounts')}
                className="icon-button glass-black-surface"
                aria-label="Back to bank accounts"
              >
                <ArrowLeft className="w-4.5 h-4.5 text-[var(--app-fg)]" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-[1.375rem] font-bold text-[var(--app-fg)] tracking-tight">Account Details</h2>
                <p className="text-xs text-[var(--app-fg-muted)] mt-0.5 truncate">
                  {account ? `${account.bank_name} ${account.account_name}` : 'Loading account...'}
                </p>
              </div>
            </div>

            <AccountDetailsPanel
              account={account}
              transactions={transactions}
              isLoading={isLoading}
              onRefresh={() => void loadAccountAndTransactions()}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
