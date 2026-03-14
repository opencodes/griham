import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email || !newPassword) {
      setError('Email and new password are required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.resetPassword(email, newPassword);
      setSuccess('Password reset successfully. You can now sign in.');
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-ai-wallpaper flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl ai-gradient-icon flex items-center justify-center shadow-lg">
            <Home className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--app-fg)]">Griham</p>
            <p className="text-sm text-[var(--app-fg-muted)]">Home Automation</p>
          </div>
        </div>

        <div className="premium-panel rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-[var(--app-fg)] mb-2">Reset Password</h2>
          <p className="text-[var(--app-fg-muted)] mb-6">Set a new password for your account.</p>

          {(error || success) && (
            <div className={`mb-4 ${error ? 'alert-error' : 'alert-success'} flex items-start gap-2`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error || success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="input-theme"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                className="input-theme"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="input-theme"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full ai-gradient-button text-white py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
