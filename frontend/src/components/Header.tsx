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
    <header className="bg-white dark:bg-transparent border-b border-gray-200 dark:border-gray-700/30 px-4 md:px-8 h-[73px] flex items-center justify-between transition-colors glass-black-surface">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100/70 dark:hover:bg-gray-700/40 transition-colors"
          onClick={onMobileMenuToggle}
          style={{ display: onMobileMenuToggle ? 'flex' : 'none' }}
        >
          <Menu className="w-5 h-5 text-gray-800 dark:text-gray-200" />
        </button>
        <div>
          <h1 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
            Good morning, {user?.full_name || 'User'} 👋
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
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
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100/70 dark:hover:bg-gray-700/40 text-gray-600 dark:text-gray-300 transition-colors"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-full text-sm font-bold border border-orange-200/70 dark:border-orange-700/40">
          <Flame className="w-4 h-4" />
          <span className="hidden sm:inline">0-day streak</span>
          <span className="sm:hidden">0d</span>
        </div>
        <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100/70 dark:hover:bg-gray-700/40 relative transition-colors">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
