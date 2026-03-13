import { Menu, Bell, Flame, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

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
    </header>
  );
}
