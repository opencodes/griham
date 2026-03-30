import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, History, Sparkles } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { getSmsParseHistory, type SmsParseHistoryItem } from '@/lib/aiUsage';

export default function AIUsage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [smsParseHistory, setSmsParseHistory] = useState<SmsParseHistoryItem[]>([]);

  useEffect(() => {
    setSmsParseHistory(getSmsParseHistory());
  }, []);

  const successfulSmsParses = smsParseHistory.filter((item) => item.created).length;
  const pendingSmsParses = smsParseHistory.length - successfulSmsParses;

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen overflow-hidden app-shell">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        isCollapsed={sidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={handleMenuToggle} />

        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl hero-ai-card p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full premium-panel text-xs font-medium text-[var(--app-fg)] border border-[var(--panel-border)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    Admin Console
                  </div>
                  <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[var(--app-fg)]">AI Usage</h2>
                  <p className="mt-2 text-sm text-[var(--app-fg-muted)]">
                    Review recent SMS parsing activity and admin-visible AI usage captured on this device.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)] bg-black/10 dark:bg-white/5 px-4 py-3">
                  <p className="text-xs text-[var(--app-fg-muted)]">Signed in as</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--app-fg)]">{user?.full_name || user?.email || 'Admin user'}</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <article className="rounded-xl p-4 glass-black-surface border border-[var(--panel-border)]">
                <p className="text-xs text-[var(--app-fg-muted)]">Total Parses</p>
                <p className="mt-2 text-2xl font-bold text-[var(--app-fg)]">{smsParseHistory.length}</p>
              </article>
              <article className="rounded-xl p-4 glass-black-surface border border-[var(--panel-border)]">
                <p className="text-xs text-[var(--app-fg-muted)]">Transactions Added</p>
                <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{successfulSmsParses}</p>
              </article>
              <article className="rounded-xl p-4 glass-black-surface border border-[var(--panel-border)]">
                <p className="text-xs text-[var(--app-fg-muted)]">Pending Review</p>
                <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingSmsParses}</p>
              </article>
            </section>

            <section className="rounded-xl p-5 glass-black-surface border border-[var(--panel-border)]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[var(--app-fg)]" />
                <h3 className="text-lg font-bold text-[var(--app-fg)]">Parse SMS History</h3>
              </div>
              <p className="mt-1 text-sm text-[var(--app-fg-muted)]">
                Latest transaction SMS parse attempts, including whether they produced a saved transaction.
              </p>

              <div className="mt-5 space-y-3">
                {smsParseHistory.length > 0 ? (
                  smsParseHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 rounded-xl border border-[var(--panel-border)] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {item.created ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Clock3 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          )}
                          <p className="text-sm font-semibold text-[var(--app-fg)]">
                            {item.category || 'Uncategorized'}{item.amount ? ` • Rs.${item.amount}` : ''}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-[var(--app-fg-muted)] line-clamp-2">
                          {item.inputPreview || 'SMS preview unavailable'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1 text-[var(--app-fg-muted)]">
                          {item.type || 'unknown'}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 ${item.created ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                          {item.created ? 'Transaction added' : 'Pending review'}
                        </span>
                        <span className="text-[var(--app-fg-muted)]">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--panel-border)] px-4 py-6 text-center">
                    <p className="text-sm font-medium text-[var(--app-fg)]">No parse history yet</p>
                    <p className="mt-1 text-xs text-[var(--app-fg-muted)]">
                      Use the finance SMS parser and recent admin AI usage will show up here.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
