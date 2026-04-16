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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="border-b border-[var(--panel-border)] px-3 md:px-4 h-[56px] flex items-center justify-between glass-black-surface shadow-nav">
      <div className="flex items-center gap-2">
        <button
          className="icon-button"
          onClick={onMobileMenuToggle}
          style={{ display: onMobileMenuToggle ? 'flex' : 'none' }}
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="font-semibold text-[var(--app-fg)] text-sm leading-tight tracking-[-0.02em]">
            {getGreeting()}, {user?.full_name || 'User'}
          </h1>
          <p className="text-[10px] text-[var(--app-fg-muted)] hidden sm:block leading-tight mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowChangePassword(true)}
          className="icon-button"
          title="Change password"
        >
          <KeyRound className="w-4 h-4" />
        </button>
        <button
          onClick={toggleDarkMode}
          className="icon-button"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <div
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border"
          style={{
            background: 'var(--primary-light)',
            color: 'var(--primary-text)',
            borderColor: 'rgba(16, 185, 129, 0.2)',
          }}
        >
          <Flame className="w-3 h-3" />
          <span>0-day streak</span>
        </div>
        <button className="icon-button relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[var(--panel-bg)]" />
        </button>
      </div>

      {showChangePassword && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-modal max-w-md w-full p-5 glass-black-surface border border-[var(--panel-border)]">
            <h2 className="text-lg font-bold text-[var(--app-fg)] mb-1">Change Password</h2>
            <p className="text-xs text-[var(--app-fg-muted)] mb-4">Enter your current password and choose a new one.</p>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--app-fg)] mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isSavingPassword}
                  className="input-theme"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--app-fg)] mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSavingPassword}
                  className="input-theme"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--app-fg)] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSavingPassword}
                  className="input-theme"
                />
              </div>
              {passwordError && (
                <div className="alert-error flex items-start gap-2">
                  <p className="text-sm">{passwordError}</p>
                </div>
              )}
              {passwordSuccess && (
                <div className="alert-success flex items-start gap-2">
                  <p className="text-sm">{passwordSuccess}</p>
                </div>
              )}
              <div className="flex gap-2 pt-1">
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
                  className="flex-1 ai-gradient-button text-white px-4 py-2 rounded-lg disabled:opacity-50 font-semibold text-sm"
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
