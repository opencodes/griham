import { CreditCard, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Card, Transaction } from '@/lib/api';
import { getCardSurfaceProps } from '@/lib/cardAppearance';

const formatCurrency = (value?: number) =>
  value == null ? '-' : `₹${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

interface CardDetailsPanelProps {
  card: Card | null;
  transactions: Transaction[];
  isLoading: boolean;
  onRefresh: () => void | Promise<void>;
  onEdit?: (card: Card) => void;
  onDelete?: (cardId: string) => void;
}

export function CardDetailsPanel({
  card,
  transactions,
  isLoading,
  onRefresh,
  onEdit,
  onDelete,
}: CardDetailsPanelProps) {
  if (!card) {
    return (
      <div className="premium-panel rounded-xl border border-[var(--panel-border)] p-5 text-[var(--app-fg-muted)]">
        {isLoading ? 'Loading card...' : 'Card not found.'}
      </div>
    );
  }

  const cardSurface = getCardSurfaceProps(card);
  const totalSpend = transactions.reduce((sum, tx) => {
    if (tx.type === 'expense') return sum + (tx.amount || 0);
    return sum;
  }, 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
      <div className="space-y-4">
        <div
          className={`relative overflow-hidden rounded-2xl text-white shadow-xl ${cardSurface.className || ''}`}
          style={{ ...cardSurface.style, aspectRatio: '1.586', minHeight: '220px' }}
        >
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
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase bg-white/20 px-2 py-1 rounded">{card.card_type}</span>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(card)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 text-white hover:bg-white/20"
                    aria-label="Edit card"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(card.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200/70 text-red-100 hover:bg-red-500/20 hover:text-white"
                    aria-label="Delete card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
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

        <div className="premium-panel rounded-xl border border-[var(--panel-border)] p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Bank</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">{card.bank_name}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Card Name</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">{card.card_name}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Type</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1 capitalize">{card.card_type}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Status</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1 capitalize">{card.status}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Last 4 Digits</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">•••• {card.last_four_digits}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Billing Date</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">{card.billing_date ? `${card.billing_date} / month` : '-'}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Credit Limit</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">{formatCurrency(card.card_limit)}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Created</p>
              <p className="text-[13px] text-[var(--app-fg)] font-semibold mt-1">{formatDate(card.created_at)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-lg border border-[var(--panel-border)] p-3 bg-[var(--surface-muted)]">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Total Spend</p>
              <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">{formatCurrency(totalSpend)}</p>
            </div>
            <div className="rounded-lg border border-[var(--panel-border)] p-3 bg-[var(--surface-muted)]">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--app-fg-muted)]">Transactions</p>
              <p className="text-[1.125rem] font-semibold text-[var(--app-fg)] mt-1">{transactions.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-panel rounded-xl border border-[var(--panel-border)] p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--app-fg)]">Transactions</h3>
            <p className="text-xs text-[var(--app-fg-muted)]">
              Showing transactions linked to this card.
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
  )
}
