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
      const { data } = await api.post(`/finance/ai/parse-sms/${familyId}`, {
        sms_text: smsText
      });

      setShowModal(false);
      setSmsText('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to parse SMS');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 font-medium"
      >
        <MessageSquare className="w-5 h-5" />
        Add from SMS
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Parse SMS</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Paste your bank SMS and AI will automatically extract transaction details.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SMS Text
                </label>
                <textarea
                  placeholder="e.g., Your A/c XX1234 debited with Rs.5000 on 23-Feb-26. Spent at Amazon. Avl Bal: Rs.45000"
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  required
                  rows={4}
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                <p className="text-xs text-purple-700 dark:text-purple-200">
                  <strong>Tip:</strong> Works best with bank transaction SMS containing amount, date, and merchant/category info.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
