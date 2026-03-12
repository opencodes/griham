import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import api from '@/lib/api';

interface CardSMSParserProps {
  familyId: string;
  onParsed: (cardData: unknown) => void;
}

export default function CardSMSParser({ familyId, onParsed }: CardSMSParserProps) {
  const [smsText, setSmsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!smsText.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const { data } = await api.post(`/finance/ai/parse-sms-card/${familyId}`, {
        sms_text: smsText
      });

      onParsed(data.data);
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
    <div className="hero-ai-card rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-[var(--app-fg)]" />
        <h3 className="font-semibold text-[var(--app-fg)]">AI SMS Parser</h3>
      </div>

      <textarea
        placeholder="Paste card SMS here...&#10;&#10;Example: Your HDFC Bank Platinum Credit Card ending 1234 has been activated. Credit limit: Rs.100000"
        value={smsText}
        onChange={(e) => setSmsText(e.target.value)}
        rows={3}
        disabled={isLoading}
        className="input-theme text-sm mb-2 resize-y min-h-[80px]"
      />

      {error && (
        <div className="alert-error mb-2 flex items-start gap-2">
          <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      <button
        onClick={handleParse}
        disabled={isLoading || !smsText.trim()}
        className="w-full ai-gradient-button px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Parsing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Parse & Fill Form
          </>
        )}
      </button>
    </div>
  );
}
