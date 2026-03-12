import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import api from '@/lib/api';

interface AIWidgetProps {
  familyId: string;
  onTransactionAdded: () => void;
}

export default function AIWidget({ familyId, onTransactionAdded }: AIWidgetProps) {
  const [smsText, setSmsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/finance/ai/parse-sms/${familyId}`, {
        sms_text: smsText
      });

      setSuccess('Transaction added successfully!');
      setSmsText('');
      onTransactionAdded();
      
      setTimeout(() => setSuccess(''), 3000);
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
    <div className="hero-ai-card rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="ai-gradient-icon p-2 rounded-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--app-fg)]">AI SMS Parser</h2>
          <p className="text-sm text-[var(--app-fg-muted)]">Paste bank SMS to auto-add transactions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            placeholder="Paste your bank SMS here...&#10;&#10;Example: Your A/c XX1234 debited with Rs.5000 on 23-Feb-26. Spent at Amazon. Avl Bal: Rs.45000"
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            required
            rows={5}
            disabled={isLoading}
            className="input-theme py-3 resize-y min-h-[120px]"
          />
        </div>

        {error && (
          <div className="alert-error flex items-start gap-2">
            <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="alert-success">
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !smsText.trim()}
          className="w-full ai-gradient-button px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Parse & Add Transaction
            </>
          )}
        </button>
      </form>

      <div className="mt-4 p-3 ai-gradient-note rounded-lg">
        <p className="text-xs text-[var(--app-fg)]">
          <strong>💡 Tip:</strong> Works with most bank SMS formats. AI extracts amount, date, category, and description automatically.
        </p>
      </div>
    </div>
  );
}
