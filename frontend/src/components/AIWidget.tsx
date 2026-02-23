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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to parse SMS');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl shadow-lg p-6 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-purple-600 p-2 rounded-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">AI SMS Parser</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Paste bank SMS to auto-add transactions</p>
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
            className="w-full px-4 py-3 border border-purple-300 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600 font-medium">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !smsText.trim()}
          className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
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

      <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg">
        <p className="text-xs text-purple-800 dark:text-purple-200">
          <strong>💡 Tip:</strong> Works with most bank SMS formats. AI extracts amount, date, category, and description automatically.
        </p>
      </div>
    </div>
  );
}
