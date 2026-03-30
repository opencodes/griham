import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Wallet } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, BankAccount, Transaction } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

const formatCurrency = (value?: number) =>
  value == null ? '-' : `₹${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

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

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        if (tx.type === 'income') acc.income += tx.amount || 0;
        if (tx.type === 'expense') acc.expense += tx.amount || 0;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [transactions]);

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
                onClick={() => navigate('/finance/accounts')}
                className="w-10 h-10 rounded-lg border border-[var(--panel-border)] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 shadow-sm glass-black-surface"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--app-fg)]" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[var(--app-fg)]">Account Details</h2>
                <p className="text-[var(--app-fg-muted)] mt-1">
                  {account ? `${account.bank_name} ${account.account_name}` : 'Loading account...'}
                </p>
              </div>
            </div>

            {account ? (
              <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden min-h-[220px]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                  <div className="relative h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <Wallet className="w-8 h-8" />
                      <span className="text-[11px] uppercase bg-white/20 px-2 py-1 rounded">{account.account_type}</span>
                    </div>
                    <div>
                      <p className="text-sm opacity-90 mb-1">{account.bank_name}</p>
                      <p className="text-2xl font-semibold mb-4">{account.account_name}</p>
                      <p className="text-3xl font-bold mb-2">{formatCurrency(account.balance)}</p>
                      {account.account_number && (
                        <p className="text-sm opacity-80">•••• {account.account_number.slice(-4)}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="premium-panel rounded-2xl border border-[var(--panel-border)] p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Bank</p>
                      <p className="text-[var(--app-fg)] font-semibold">{account.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Account Name</p>
                      <p className="text-[var(--app-fg)] font-semibold">{account.account_name}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Account Type</p>
                      <p className="text-[var(--app-fg)] font-semibold capitalize">{account.account_type}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Account Number</p>
                      <p className="text-[var(--app-fg)] font-semibold">
                        {account.account_number ? `•••• ${account.account_number.slice(-4)}` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Current Balance</p>
                      <p className="text-[var(--app-fg)] font-semibold">{formatCurrency(account.balance)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Currency</p>
                      <p className="text-[var(--app-fg)] font-semibold">{account.currency}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] p-4 bg-black/5 dark:bg-white/5">
                      <div>
                        <p className="text-xs uppercase text-[var(--app-fg-muted)]">Income</p>
                        <p className="text-xl font-semibold text-emerald-500">{formatCurrency(summary.income)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] p-4 bg-black/5 dark:bg-white/5">
                      <div>
                        <p className="text-xs uppercase text-[var(--app-fg-muted)]">Expense</p>
                        <p className="text-xl font-semibold text-red-500">{formatCurrency(summary.expense)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] p-4 bg-black/5 dark:bg-white/5">
                      <div>
                        <p className="text-xs uppercase text-[var(--app-fg-muted)]">Transactions</p>
                        <p className="text-xl font-semibold text-[var(--app-fg)]">{transactions.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="premium-panel rounded-2xl border border-[var(--panel-border)] p-6 text-[var(--app-fg-muted)]">
                {isLoading ? 'Loading account...' : 'Account not found.'}
              </div>
            )}

            <div className="premium-panel rounded-2xl border border-[var(--panel-border)] p-6">
              <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                <h3 className="text-lg font-semibold text-[var(--app-fg)]">Transactions</h3>
                <p className="text-sm text-[var(--app-fg-muted)]">
                  Showing transactions linked to this account.
                </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadAccountAndTransactions()}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 self-start rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-medium text-[var(--app-fg)] hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-white/10"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
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
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[var(--app-fg-muted)]">
                          No transactions to show.
                        </td>
                      </tr>
                    )}
                    {transactions.map((tx) => (
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
          </div>
        </main>
      </div>
    </div>
  );
}
