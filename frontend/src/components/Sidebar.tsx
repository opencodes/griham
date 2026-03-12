import { Home, Users, DollarSign, Calendar, Package, Heart, ContactRound, ListTodo, MessageSquare, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
  { id: 'family', label: 'Family', icon: Users, path: '/' },
  { id: 'finance', label: 'Finance', icon: DollarSign, path: '/finance' },
  { id: 'events', label: 'Events', icon: Calendar, path: '/events' },
  { id: 'assets', label: 'Assets', icon: Package, path: '/assets' },
  { id: 'health', label: 'Health', icon: Heart, path: '/health' },
  { id: 'contacts', label: 'Contacts', icon: ContactRound, path: '/contacts' },
  { id: 'organizer', label: 'Organizer', icon: ListTodo, path: '/organizer' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages' },
];

export function Sidebar({ activeTab, onTabChange, mobileOpen, onMobileToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-[100]
        w-64 border-r border-[var(--panel-border)] glass-black-surface
        transform transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-6 py-4 border-b border-[var(--panel-border)] h-[73px] flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl ai-gradient-icon flex items-center justify-center shadow-ai-soft">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--app-fg)]">Griham</p>
              <p className="text-xs text-[var(--app-fg-muted)]">Home Automation</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.path !== location.pathname) {
                    navigate(item.path);
                  }
                  onTabChange(item.id);
                  if (mobileOpen) onMobileToggle();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-transparent ${
                  isActive
                    ? 'bg-indigo-500/15 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-200 border-indigo-300/50 dark:border-indigo-400/30'
                    : 'text-[var(--app-fg)] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--panel-border)] bg-transparent">
          <div className="flex items-center gap-3 p-3 rounded-xl mb-2 border border-[var(--panel-border)] premium-panel">
            <div className="w-10 h-10 rounded-full ai-gradient-icon flex items-center justify-center text-white font-bold text-sm">
              {user?.full_name ? getInitials(user.full_name) : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--app-fg)] truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-[var(--app-fg-muted)] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--app-fg)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
