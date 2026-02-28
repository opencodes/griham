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
        w-64 bg-white dark:bg-transparent border-r border-gray-200 dark:border-gray-700/30 glass-black-surface
        transform transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-6 py-4 border-b border-gray-200/80 dark:border-gray-700/40 h-[73px] flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-ai-soft">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">Griham</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Home Automation</p>
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-500/20 dark:to-fuchsia-500/10 text-indigo-700 dark:text-indigo-200 border border-indigo-200/70 dark:border-indigo-400/35'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-700/40'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/80 dark:border-gray-700/80 bg-transparent">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-700/40 mb-2 border border-gray-200/80 dark:border-gray-600/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.full_name ? getInitials(user.full_name) : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
