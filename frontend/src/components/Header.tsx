import { Menu, Bell, Flame, Moon, Sun, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useState } from 'react';
import { authAPI } from '@/lib/api';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (!currentPassword || !newPassword) {
      setPasswordError('Current and new password are required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setIsSavingPassword(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPasswordError(e?.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <header className="border-b border-[var(--panel-border)] px-4 md:px-8 h-[73px] flex items-center justify-between transition-colors glass-black-surface">
      <div className="flex items-center gap-3">
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          onClick={onMobileMenuToggle}
          style={{ display: onMobileMenuToggle ? 'flex' : 'none' }}
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-[var(--app-fg)]" />
        </button>
        <div>
          <h1 className="font-bold text-[var(--app-fg)] text-lg">
            Good morning, {user?.full_name || 'User'} 👋
          </h1>
          <p className="text-xs text-[var(--app-fg-muted)] hidden sm:block">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowChangePassword(true)}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-[var(--app-fg-muted)] transition-colors"
          title="Change password"
        >
          <KeyRound className="w-5 h-5" />
        </button>
        <button
          onClick={toggleDarkMode}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-[var(--app-fg-muted)] transition-colors"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-1.5 bg-orange-500/15 dark:bg-orange-400/20 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-full text-sm font-bold border border-orange-300/50 dark:border-orange-400/30">
          <Flame className="w-4 h-4" />
          <span className="hidden sm:inline">0-day streak</span>
          <span className="sm:hidden">0d</span>
        </div>
        <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 relative transition-colors">
          <Bell className="w-5 h-5 text-[var(--app-fg-muted)]" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>

      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-xl max-w-md w-full p-6 glass-black-surface border border-[var(--panel-border)]">
            <h2 className="text-2xl font-bold text-[var(--app-fg)] mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isSavingPassword}
                  className="w-full px-4 py-2 border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSavingPassword}
                  className="w-full px-4 py-2 border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSavingPassword}
                  className="w-full px-4 py-2 border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm text-emerald-500">{passwordSuccess}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowChangePassword(false); setPasswordError(''); setPasswordSuccess(''); }}
                  disabled={isSavingPassword}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="flex-1 ai-gradient-button text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {isSavingPassword ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
