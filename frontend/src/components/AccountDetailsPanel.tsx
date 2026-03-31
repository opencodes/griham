import { RefreshCw, Wallet, Pencil, Trash2 } from 'lucide-react';
import { BankAccount, Transaction } from '@/lib/api';

const formatCurrency = (value?: number) =>
  value == null ? '-' : `₹${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatAccountType = (value?: string) => {
  if (!value) return 'Savings';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const accountTypeTone: Record<string, string> = {
  savings: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  current: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  credit: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

interface AccountDetailsPanelProps {
  account: BankAccount | null;
  transactions: Transaction[];
  isLoading: boolean;
  onRefresh: () => void | Promise<void>;
  onEdit?: (account: BankAccount) => void;
  onDelete?: (accountId: string) => void;
}

export function AccountDetailsPanel({
  account,
  transactions,
  isLoading,
  onRefresh,
  onEdit,
  onDelete,
}: AccountDetailsPanelProps) {
  if (!account) {
    return (
      <div className="premium-panel rounded-xl border border-[var(--panel-border)] p-5 text-[var(--app-fg-muted)]">
        {isLoading ? 'Loading account...' : 'Account not found.'}
      </div>
    );
  }

  const summary = transactions.reduce(
    (acc, tx) => {
      if (tx.type === 'income') acc.income += tx.amount || 0;
      if (tx.type === 'expense') acc.expense += tx.amount || 0;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--panel-border)] p-4 glass-black-surface relative overflow-hidden min-h-[184px]">
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-[0.08] -mr-14 -mt-14 ai-gradient-icon" />
          <div className="relative h-full flex flex-col justify-between">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[var(--primary-text)]" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${accountTypeTone[account.account_type || 'savings'] || accountTypeTone.savings}`}>
                  {formatAccountType(account.account_type)}
                </span>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(account)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--panel-border)] text-[var(--app-fg-muted)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--app-fg)]"
                    aria-label="Edit account"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(account.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-200/70 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                    aria-label="Delete account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--app-fg-muted)] mb-1">{account.bank_name}</p>
              <p className="text-[1.25rem] font-semibold text-[var(--app-fg)] mb-3">{account.account_name}</p>
              <p className="text-[1.75rem] font-bold text-[var(--app-fg)] mb-2">{formatCurrency(account.balance)}</p>
              {account.account_number && (
                <p className="text-xs text-[var(--app-fg-muted)]">•••• {account.account_number.slice(-4)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="premium-panel rounded-xl border border-[var(--panel-border)] p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Bank</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">{account.bank_name}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Account Name</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">{account.account_name}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Account Type</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">{formatAccountType(account.account_type)}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Account Number</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">
                {account.account_number ? `•••• ${account.account_number.slice(-4)}` : '-'}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Current Balance</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">{formatCurrency(account.balance)}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Currency</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">{account.currency}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-lg border border-[var(--panel-border)] p-3 bg-[var(--surface-muted)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Income</p>
                <p className="text-[1.125rem] font-semibold text-emerald-500 mt-1">{formatCurrency(summary.income)}</p>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] p-3 bg-[var(--surface-muted)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Expense</p>
                <p className="text-[1.125rem] font-semibold text-red-500 mt-1">{formatCurrency(summary.expense)}</p>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] p-3 bg-[var(--surface-muted)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Transactions</p>
                <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">{transactions.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-panel rounded-xl border border-[var(--panel-border)] p-4">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--app-fg)]">Transactions</h3>
            <p className="text-xs text-[var(--app-fg-muted)]">
              Showing transactions linked to this account.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs font-medium text-[var(--app-fg)] hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="space-y-2 md:hidden">
          {transactions.length === 0 && (
            <div className="rounded-lg border border-dashed border-[var(--panel-border)] p-6 text-center text-sm text-[var(--app-fg-muted)]">
              No transactions to show.
            </div>
          )}
          {transactions.map((tx) => (
            <article key={tx.id} className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--app-fg)] truncate">{tx.description || '-'}</p>
                  <p className="text-[11px] text-[var(--app-fg-muted)] mt-0.5">
                    {formatDate(tx.transaction_date)} · {tx.category || 'Uncategorized'}
                  </p>
                </div>
                <p className={`text-[13px] font-semibold shrink-0 ${tx.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {formatCurrency(tx.amount)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--app-fg-muted)]">
                <span className="capitalize">{tx.type}</span>
                <span>{tx.bank_name || tx.account_name || ''}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Category</th>
                <th className="text-right">Amount</th>
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
                <tr key={tx.id}>
                  <td>{formatDate(tx.transaction_date)}</td>
                  <td>
                    <div className="font-medium text-[var(--app-fg)]">{tx.description || '-'}</div>
                    <div className="text-xs text-[var(--app-fg-muted)]">{tx.bank_name || tx.account_name || ''}</div>
                  </td>
                  <td className="capitalize">{tx.type}</td>
                  <td>{tx.category}</td>
                  <td className={`text-right font-semibold ${tx.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                    {formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
