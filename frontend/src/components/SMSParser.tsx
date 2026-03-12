import { useState } from 'react';
import { MessageSquare, Sparkles, X } from 'lucide-react';
import api from '@/lib/api';

interface SMSParserProps {
  familyId: string;
  onSuccess: () => void;
}

export default function SMSParser({ familyId, onSuccess }: SMSParserProps) {
  const [showModal, setShowModal] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post(`/finance/ai/parse-sms/${familyId}`, {
        sms_text: smsText
      });

      setShowModal(false);
      setSmsText('');
      onSuccess();
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
        onClick={() => setShowModal(true)}
        className="inline-flex h-11 items-center gap-2 ai-gradient-button px-4 rounded-lg text-sm font-medium whitespace-nowrap"
      >
        <MessageSquare className="w-4 h-4" />
        Add from SMS
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="premium-panel rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--panel-border)]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[var(--app-fg)]" />
                <h2 className="text-2xl font-bold text-[var(--app-fg)]">Parse SMS</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--app-fg-muted)] hover:text-[var(--app-fg)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[var(--app-fg-muted)] mb-4">
              Paste your bank SMS and AI will automatically extract transaction details.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">
                  SMS Text
                </label>
                <textarea
                  placeholder="e.g., Your A/c XX1234 debited with Rs.5000 on 23-Feb-26. Spent at Amazon. Avl Bal: Rs.45000"
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  required
                  rows={4}
                  disabled={isLoading}
                  className="input-theme resize-y min-h-[100px]"
                />
              </div>

              {error && (
                <div className="alert-error flex items-start gap-2">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="ai-gradient-note rounded-lg p-3">
                <p className="text-xs text-[var(--app-fg)]">
                  <strong>Tip:</strong> Works best with bank transaction SMS containing amount, date, and merchant/category info.
                </p>
              </div>

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
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Parse & Add
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
