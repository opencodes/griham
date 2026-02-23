import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import api from '@/lib/api';

interface CardSMSParserProps {
  familyId: string;
  onParsed: (cardData: any) => void;
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to parse SMS');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">AI SMS Parser</h3>
      </div>

      <textarea
        placeholder="Paste card SMS here...&#10;&#10;Example: Your HDFC Bank Platinum Credit Card ending 1234 has been activated. Credit limit: Rs.100000"
        value={smsText}
        onChange={(e) => setSmsText(e.target.value)}
        rows={3}
        disabled={isLoading}
        className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-100 text-sm mb-2"
      />

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg mb-2 flex items-start gap-2">
          <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <button
        onClick={handleParse}
        disabled={isLoading || !smsText.trim()}
        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
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
