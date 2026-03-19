import { useState } from 'react';
import { MessageSquare, Sparkles, X } from 'lucide-react';
import api from '@/lib/api';

interface AISmsFillButtonProps<T> {
  familyId: string;
  endpoint: string;
  title: string;
  description: string;
  placeholder: string;
  onParsed: (data: Partial<T>) => void;
}

export default function AISmsFillButton<T>({
  familyId,
  endpoint,
  title,
  description,
  placeholder,
  onParsed,
}: AISmsFillButtonProps<T>) {
  const [showModal, setShowModal] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/finance/ai/${endpoint}/${familyId}`, { sms_text: smsText });
      onParsed((data.data ?? {}) as Partial<T>);
      setShowModal(false);
      setSmsText('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to parse SMS';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-4 py-2.5 text-sm font-medium text-[var(--app-fg)] hover:bg-black/5 dark:hover:bg-white/10"
      >
        <Sparkles className="w-4 h-4" />
        AI Insert
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="premium-panel rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--panel-border)]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[var(--app-fg)]" />
                <h2 className="text-2xl font-bold text-[var(--app-fg)]">{title}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[var(--app-fg-muted)] hover:text-[var(--app-fg)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[var(--app-fg-muted)] mb-4">{description}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-[var(--app-fg)] mb-1">SMS Text</span>
                <textarea
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  placeholder={placeholder}
                  required
                  rows={5}
                  disabled={isLoading}
                  className="input-theme resize-y min-h-[120px]"
                />
              </label>

              {error && (
                <div className="alert-error flex items-start gap-2">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-[var(--input-border)] text-[var(--app-fg)] rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 ai-gradient-button px-4 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Parsing...' : 'Parse & Fill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
