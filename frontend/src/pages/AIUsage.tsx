import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, History, Sparkles, X } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { financeAPI, householdAPI, type Household, type SmsParseHistoryRecord, type SmsParsePromptResponse } from '@/lib/api';

function getSmsPreview(text: string): string {
  const normalized = (text || '').trim();
  if (normalized.length <= 50) return normalized || 'SMS preview unavailable';
  return `${normalized.slice(0, 50)}...`;
}

export default function AIUsage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [smsParseHistory, setSmsParseHistory] = useState<SmsParseHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SmsParseHistoryRecord | null>(null);
  const [promptPreview, setPromptPreview] = useState<SmsParsePromptResponse | null>(null);
  const [isPromptLoading, setIsPromptLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const families = await householdAPI.list();
        if (!active) return;
        setHouseholds(families);
        if (families.length === 0) {
          setSmsParseHistory([]);
          return;
        }
        const history = await financeAPI.getSmsParseHistory(families[0].id, 50);
        if (!active) return;
        setSmsParseHistory(history);
      } catch (error) {
        console.error('Failed to load AI usage history', error);
        if (active) setSmsParseHistory([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const successfulSmsParses = smsParseHistory.filter((item) => item.status === 'transaction_created').length;
  const pendingSmsParses = smsParseHistory.length - successfulSmsParses;

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleOpenPrompt = async () => {
    const familyId = households[0]?.id;
    if (!familyId) return;
    setIsPromptLoading(true);
    try {
      const prompt = await financeAPI.getSmsParsePrompt(familyId, smsParseHistory[0]?.input_text);
      setPromptPreview(prompt);
    } catch (error) {
      console.error('Failed to load SMS parse prompt', error);
    } finally {
      setIsPromptLoading(false);
    }
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
                    Review recent SMS parsing activity and AI usage pulled directly from saved database records.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)] bg-black/10 dark:bg-white/5 px-4 py-3">
                  <p className="text-xs text-[var(--app-fg-muted)]">Household Scope</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--app-fg)]">
                    {households[0]?.name || user?.full_name || user?.email || 'Admin user'}
                  </p>
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
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[var(--app-fg)]" />
                  <h3 className="text-lg font-bold text-[var(--app-fg)]">Parse SMS History</h3>
                </div>
                <button
                  type="button"
                  onClick={() => void handleOpenPrompt()}
                  disabled={isPromptLoading || !households[0]?.id}
                  className="rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--app-fg)] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
                >
                  {isPromptLoading ? 'Loading Prompt...' : 'View Prompt'}
                </button>
              </div>
              <p className="mt-1 text-sm text-[var(--app-fg-muted)]">
                Latest transaction SMS parse attempts, including whether they produced a saved transaction.
              </p>

              <div className="mt-5 space-y-3">
                {isLoading ? (
                  <div className="rounded-xl border border-dashed border-[var(--panel-border)] px-4 py-6 text-center">
                    <p className="text-sm font-medium text-[var(--app-fg)]">Loading AI usage…</p>
                  </div>
                ) : smsParseHistory.length > 0 ? (
                  smsParseHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 rounded-xl border border-[var(--panel-border)] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {item.status === 'transaction_created' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Clock3 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          )}
                          <p className="text-sm font-semibold text-[var(--app-fg)]">
                            {item.category || 'Uncategorized'}{item.amount ? ` • Rs.${item.amount}` : ''}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-[var(--app-fg-muted)] line-clamp-2">
                          {getSmsPreview(item.input_text)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1 text-[var(--app-fg-muted)]">
                          {item.model_used || 'unknown'}
                        </span>
                        <span className="rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1 text-[var(--app-fg-muted)]">
                          {item.type || 'unknown'}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 ${item.status === 'transaction_created' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                          {item.status === 'transaction_created' ? 'Transaction added' : item.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[var(--app-fg-muted)]">
                          {new Date(item.date).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(item)}
                          className="rounded-full border border-[var(--panel-border)] px-3 py-1 font-medium text-[var(--app-fg)] hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--panel-border)] px-4 py-6 text-center">
                    <p className="text-sm font-medium text-[var(--app-fg)]">No parse history yet</p>
                    <p className="mt-1 text-xs text-[var(--app-fg-muted)]">
                      No saved `AiModel` SMS parse records were found for this household yet.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-[var(--panel-border)] glass-black-surface shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)] px-6 py-5">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-fg-muted)]">Parse SMS History</p>
                <h3 className="mt-2 text-xl font-bold text-[var(--app-fg)]">
                  {selectedRecord.category || 'Uncategorized'}{selectedRecord.amount ? ` • Rs.${selectedRecord.amount}` : ''}
                </h3>
                <p className="mt-1 text-sm text-[var(--app-fg-muted)]">
                  {new Date(selectedRecord.date).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg border border-[var(--panel-border)] p-2 text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-6 py-5">
              <section className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-[var(--panel-border)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-fg-muted)]">Input SMS</p>
                  <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-[var(--app-fg)] font-sans">
                    {selectedRecord.input_text}
                  </pre>
                </div>

                <div className="rounded-xl border border-[var(--panel-border)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-fg-muted)]">Parsed Output JSON</p>
                  <pre className="mt-3 max-h-[360px] overflow-auto rounded-lg bg-black/10 dark:bg-white/5 p-4 text-xs text-[var(--app-fg)]">
                    {JSON.stringify(selectedRecord.output ?? {}, null, 2)}
                  </pre>
                </div>
              </section>

              <aside className="space-y-4">
                <div className="rounded-xl border border-[var(--panel-border)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-fg-muted)]">Record Meta</p>
                  <div className="mt-3 space-y-3 text-sm">
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Model</p>
                      <p className="font-medium text-[var(--app-fg)] break-all">{selectedRecord.model_used || 'unknown'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Status</p>
                      <p className="font-medium text-[var(--app-fg)]">{selectedRecord.status.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Accuracy</p>
                      <p className="font-medium text-[var(--app-fg)]">
                        {typeof selectedRecord.accuracy === 'number' ? selectedRecord.accuracy : 'Not available'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Transaction ID</p>
                      <p className="font-medium text-[var(--app-fg)] break-all">{selectedRecord.transaction_id || 'Not linked'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Created By</p>
                      <p className="font-medium text-[var(--app-fg)] break-all">{selectedRecord.created_by || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--panel-border)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-fg-muted)]">Quick Parse Summary</p>
                  <div className="mt-3 space-y-3 text-sm">
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Type</p>
                      <p className="font-medium text-[var(--app-fg)]">{selectedRecord.type || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Category</p>
                      <p className="font-medium text-[var(--app-fg)]">{selectedRecord.category || 'Uncategorized'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--app-fg-muted)]">Description</p>
                      <p className="font-medium text-[var(--app-fg)]">{selectedRecord.description || 'Not available'}</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {promptPreview && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-[var(--panel-border)] glass-black-surface shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)] px-6 py-5">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-fg-muted)]">Prompt Preview</p>
                <h3 className="mt-2 text-xl font-bold text-[var(--app-fg)]">{promptPreview.label}</h3>
                <p className="mt-1 text-sm text-[var(--app-fg-muted)]">{promptPreview.prompt_id}</p>
              </div>
              <button
                type="button"
                onClick={() => setPromptPreview(null)}
                className="rounded-lg border border-[var(--panel-border)] p-2 text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Close prompt preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-[var(--panel-border)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-fg-muted)]">Sample Input</p>
                <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-[var(--app-fg)] font-sans">
                  {promptPreview.sample_input}
                </pre>
              </div>

              <div className="rounded-xl border border-[var(--panel-border)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-fg-muted)]">Prompt</p>
                <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg bg-black/10 dark:bg-white/5 p-4 text-xs text-[var(--app-fg)] whitespace-pre-wrap break-words">
                  {promptPreview.prompt}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
