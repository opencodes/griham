import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, financeAPI, BankAccount, Transaction } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Plus, ArrowLeft, X, Wallet } from 'lucide-react';
import { AccountDetailsPanel } from '@/components/AccountDetailsPanel';

const ACCOUNT_TYPES = ['savings', 'current', 'credit'];
const formatCurrency = (value: number) =>
  `₹${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatAccountTabLabel = (account: BankAccount) => {
  const bank = (account.bank_name || 'Account').trim();
  const shortBank = bank.split(/\s+/)[0];
  const suffix = account.account_number
    ? `XXXX${account.account_number.slice(-4)}`
    : account.account_name;
  return `${shortBank} - ${suffix}`;
};
export default function BankAccounts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('finance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('viewer');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accountFilter, setAccountFilter] = useState<'all' | 'savings' | 'current' | 'credit'>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const emptyForm = {
    account_name: '',
    account_number: '',
    bank_name: '',
    account_type: 'savings',
    balance: '0'
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadFamily();
  }, []);

  useEffect(() => {
    if (familyId) {
      loadAccounts();
    }
  }, [familyId]);

  const loadFamily = async () => {
    try {
      const families = await householdAPI.list();
      if (families.length > 0) {
        setFamilyId(families[0].id);
        const members = await householdAPI.listMembers(families[0].id);
        const currentMember = members.find((m: any) => m.user_id === user?.id);
        if (currentMember) setUserRole(currentMember.role);
      }
    } catch (error) {
      console.error('Failed to load family', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await financeAPI.listAccounts(familyId);
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts', error);
    }
  };

  const loadSelectedAccountTransactions = async (accountId: string) => {
    setDetailsLoading(true);
    try {
      const tx = await financeAPI.listTransactions(familyId, { account_id: accountId });
      setSelectedTransactions(tx);
    } catch (error) {
      console.error('Failed to load account transactions', error);
      setSelectedTransactions([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        balance: parseFloat(formData.balance)
      };
      if (editingAccount) {
        await financeAPI.updateAccount(familyId, editingAccount.id, payload);
      } else {
        await financeAPI.createAccount(familyId, payload);
      }
      setShowModal(false);
      setEditingAccount(null);
      setFormData(emptyForm);
      loadAccounts();
    } catch (error) {
      console.error('Failed to save account', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      account_name: account.account_name,
      account_number: account.account_number || '',
      bank_name: account.bank_name,
      account_type: account.account_type || 'savings',
      balance: account.balance?.toString() || '0'
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account? All transactions will also be deleted.')) return;
    try {
      await financeAPI.deleteAccount(familyId, id);
      loadAccounts();
    } catch (error) {
      console.error('Failed to delete account', error);
    }
  };

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const summary = useMemo(() => {
    const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    const totalAccounts = accounts.length;
    const savingsCount = accounts.filter((a) => a.account_type === 'savings').length;
    const currentCount = accounts.filter((a) => a.account_type === 'current').length;
    const creditCount = accounts.filter((a) => a.account_type === 'credit').length;
    const avgBalance = totalAccounts > 0 ? totalBalance / totalAccounts : 0;
    return {
      totalBalance,
      totalAccounts,
      savingsCount,
      currentCount,
      creditCount,
      avgBalance
    };
  }, [accounts]);

  const visibleAccounts = accounts.filter((account) =>
    accountFilter === 'all' ? true : (account.account_type || 'savings') === accountFilter
  );

  const selectedAccount = visibleAccounts.find((account) => account.id === selectedAccountId) ?? null;

  const filterTabs: Array<{ key: 'all' | 'savings' | 'current' | 'credit'; label: string; count: number }> = [
    { key: 'all', label: 'All', count: accounts.length },
    { key: 'savings', label: 'Savings', count: summary.savingsCount },
    { key: 'current', label: 'Current', count: summary.currentCount },
    { key: 'credit', label: 'Credit', count: summary.creditCount },
  ];

  useEffect(() => {
    if (visibleAccounts.length === 0) {
      setSelectedAccountId('');
      setSelectedTransactions([]);
      return;
    }

    const selectedVisible = visibleAccounts.some((account) => account.id === selectedAccountId);
    if (!selectedVisible) {
      setSelectedAccountId(visibleAccounts[0].id);
    }
  }, [selectedAccountId, visibleAccounts]);

  useEffect(() => {
    if (familyId && selectedAccountId) {
      void loadSelectedAccountTransactions(selectedAccountId);
    }
  }, [familyId, selectedAccountId]);

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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => navigate('/finance')}
                className="icon-button glass-black-surface shrink-0"
                aria-label="Back to finance overview"
              >
                <ArrowLeft className="w-4.5 h-4.5 text-[var(--app-fg)]" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-[1.375rem] font-bold text-[var(--app-fg)] tracking-tight">Bank Accounts</h2>
                <p className="text-xs text-[var(--app-fg-muted)] mt-0.5">Manage linked accounts and opening balances.</p>
              </div>
              {userRole === 'admin' && (
                <button
                  onClick={() => {
                    setEditingAccount(null);
                    setFormData(emptyForm);
                    setShowModal(true);
                  }}
                  className="inline-flex w-full sm:w-auto justify-center items-center gap-2 ai-gradient-button text-white px-4 rounded-lg font-medium"
                >
                  <Plus className="w-4.5 h-4.5" />
                  Add Account
                </button>
              )}
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] p-3 glass-black-surface">
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 text-sm">
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Total Balance</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">
                    {formatCurrency(summary.totalBalance)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Total Accounts</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">{summary.totalAccounts}</p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Savings</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">{summary.savingsCount}</p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Current</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">{summary.currentCount}</p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Credit</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">{summary.creditCount}</p>
                </div>
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Avg Balance</p>
                  <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">
                    {formatCurrency(summary.avgBalance)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] p-3 glass-black-surface">
              <div className="flex flex-col gap-3 mb-3">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--app-fg)]">Account Tabs</h3>
                    <p className="text-[11px] text-[var(--app-fg-muted)] mt-0.5">
                      Pick an account tab to view details and transactions below.
                    </p>
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {filterTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setAccountFilter(tab.key)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                          accountFilter === tab.key
                            ? 'ai-gradient-icon text-white shadow-sm'
                            : 'border border-[var(--panel-border)] bg-[var(--surface-muted)] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)]'
                        }`}
                      >
                        {tab.label} ({tab.count})
                      </button>
                    ))}
                  </div>
                </div>

                {visibleAccounts.length > 0 && (
                  <div className="border-b border-[var(--panel-border)]">
                    <div className="flex gap-1.5 overflow-x-auto pb-0">
                    {visibleAccounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => setSelectedAccountId(account.id)}
                        className={`shrink-0 rounded-t-lg border border-b-0 px-3 py-2 text-sm font-medium transition-colors ${
                          selectedAccountId === account.id
                            ? 'bg-[var(--panel-bg)] text-[var(--primary-text)] border-[var(--panel-border)] shadow-sm relative'
                            : 'bg-[var(--surface-muted)] text-[var(--app-fg-muted)] border-transparent hover:text-[var(--app-fg)] hover:bg-[var(--surface-subtle)]'
                        }`}
                        style={selectedAccountId === account.id ? {
                          boxShadow: 'inset 0 2px 0 var(--primary), 0 -1px 0 var(--panel-bg)',
                        } : undefined}
                      >
                        <span className="whitespace-nowrap">{formatAccountTabLabel(account)}</span>
                      </button>
                    ))}
                    </div>
                  </div>
                )}
              </div>

              <AccountDetailsPanel
                account={selectedAccount}
                transactions={selectedTransactions}
                isLoading={detailsLoading}
                onRefresh={() => selectedAccountId ? loadSelectedAccountTransactions(selectedAccountId) : undefined}
                onEdit={userRole === 'admin' ? handleEdit : undefined}
                onDelete={userRole === 'admin' ? handleDelete : undefined}
              />

              {accounts.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--panel-border)] p-10 text-center bg-[var(--surface-subtle)]">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--surface-muted)] mx-auto mb-4 flex items-center justify-center">
                    <Wallet className="w-7 h-7 text-[var(--app-fg-subtle)]" />
                  </div>
                  <p className="text-[15px] font-semibold text-[var(--app-fg)] mb-1">No accounts yet</p>
                  <p className="text-sm text-[var(--app-fg-muted)]">Add your first bank account to start tracking balances and transactions.</p>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => {
                        setEditingAccount(null);
                        setFormData(emptyForm);
                        setShowModal(true);
                      }}
                      className="mt-4 inline-flex items-center gap-2 ai-gradient-button px-4 text-white rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                      Add Account
                    </button>
                  )}
                </div>
              )}

              {accounts.length > 0 && visibleAccounts.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--panel-border)] p-8 text-center bg-[var(--surface-subtle)]">
                  <p className="text-sm font-medium text-[var(--app-fg)]">No accounts match this filter</p>
                  <p className="text-[12px] text-[var(--app-fg-muted)] mt-1">Switch to another type to view more accounts.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 glass-black-surface border border-[var(--panel-border)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--app-fg)]">
                  {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
                </h2>
                <p className="text-sm text-[var(--app-fg-muted)] mt-1">
                  {editingAccount ? 'Update account details and opening balance.' : 'Enter the basic details for this account.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingAccount(null);
                  setFormData(emptyForm);
                }}
                className="icon-button"
                aria-label="Close account form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label>Account Name</label>
                  <input
                    type="text"
                    placeholder="My Savings Account"
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    required
                    className="input-theme"
                  />
                </div>
                <div>
                  <label>Bank Name</label>
                  <input
                    type="text"
                    placeholder="HDFC Bank"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    required
                    className="input-theme"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label>Account Type</label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    required
                    className="input-theme"
                  >
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Initial Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    required
                    className="input-theme"
                  />
                </div>
              </div>

              <div>
                <label>Account Number</label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="input-theme"
                />
                <p className="text-[11px] text-[var(--app-fg-muted)] mt-1">Optional. Only the last 4 digits are shown on cards.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingAccount(null);
                    setFormData(emptyForm);
                  }}
                  disabled={isLoading}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 ai-gradient-button text-white px-4 rounded-lg disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : editingAccount ? 'Update Account' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
