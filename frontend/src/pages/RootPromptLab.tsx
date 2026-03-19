import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { adminAPI, type PromptTemplate } from '@/lib/api';
import { Sparkles, Play, FileText } from 'lucide-react';

export default function RootPromptLab() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('root-prompts');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [input, setInput] = useState('');
  const [promptPreview, setPromptPreview] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  const selectedPrompt = prompts.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => {
      void loadPreview(selectedId, input);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [selectedId, input]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminAPI.listPrompts();
      setPrompts(data);
      if (data.length > 0) {
        setSelectedId(data[0].id);
        setInput('');
        const preview = await adminAPI.previewPrompt(data[0].id, '');
        setPromptPreview(preview.prompt);
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load prompt registry.');
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (promptId: string, value: string) => {
    try {
      setPreviewLoading(true);
      const preview = await adminAPI.previewPrompt(promptId, value);
      setPromptPreview(preview.prompt);
    } catch (e) {
      console.error(e);
      setError('Failed to generate prompt preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePromptChange = async (promptId: string) => {
    setSelectedId(promptId);
    setInput('');
    setResult('');
    try {
      setPreviewLoading(true);
      const preview = await adminAPI.previewPrompt(promptId, '');
      setPromptPreview(preview.prompt);
    } catch (e) {
      console.error(e);
      setError('Failed to generate prompt preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleTest = async () => {
    if (!selectedId || testing) return;
    try {
      setTesting(true);
      setError('');
      const data = await adminAPI.testPrompt(selectedId, input);
      setPromptPreview(data.prompt);
      setResult(data.result || 'No response returned.');
    } catch (e) {
      console.error(e);
      setError('Failed to test prompt.');
    } finally {
      setTesting(false);
    }
  };

  if (user?.role !== 'root') {
    return <Navigate to="/" replace />;
  }

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
        <Header onMobileMenuToggle={() => { setMobileMenuOpen(!mobileMenuOpen); setSidebarCollapsed(!sidebarCollapsed); }} />
        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--app-fg)]">Prompt Lab</h2>
              <p className="text-sm text-[var(--app-fg-muted)] mt-1">Preview centralized prompts, test them with custom input, and inspect model output.</p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <Sparkles className="w-6 h-6 text-indigo-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Total prompts</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{prompts.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <FileText className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Current module</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{selectedPrompt?.module || '—'}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <Play className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Prompt status</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{previewLoading ? 'Refreshing…' : 'Ready'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-6 space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-[var(--app-fg)] mb-2">Select Prompt</span>
                <select
                  value={selectedId}
                  onChange={(e) => void handlePromptChange(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-[var(--input-border)] bg-transparent px-3 py-2 text-[var(--app-fg)]"
                >
                  {prompts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.module} · {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-[var(--app-fg)] mb-2">{selectedPrompt?.inputLabel || 'Input'}</span>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={selectedPrompt?.inputPlaceholder || 'Enter input'}
                  rows={5}
                  className="w-full rounded-lg border border-[var(--input-border)] bg-transparent px-3 py-2 text-[var(--app-fg)]"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-[var(--app-fg)] mb-2">Prompt Preview</span>
                <textarea
                  value={promptPreview}
                  readOnly
                  rows={14}
                  className="w-full rounded-lg border border-[var(--input-border)] bg-black/5 dark:bg-white/5 px-3 py-2 text-[var(--app-fg)]"
                />
              </label>

              <div className="flex justify-end">
                <button
                  onClick={() => void handleTest()}
                  disabled={!selectedId || testing}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {testing ? 'Testing…' : 'Test Prompt'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-6">
              <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-3">Result</h3>
              <textarea
                value={result}
                readOnly
                rows={12}
                className="w-full rounded-lg border border-[var(--input-border)] bg-black/5 dark:bg-white/5 px-3 py-2 text-[var(--app-fg)]"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
