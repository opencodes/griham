import { Home, Users, DollarSign, Calendar, Package, Heart, ContactRound, ListTodo, MessageSquare, LogOut, Shield, UserCog, UsersRound, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { canAccessModule } from '@/lib/permissions';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
  isCollapsed?: boolean;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/', module: 'dashboard' },
  { id: 'assistant', label: 'Ask Griham', icon: Sparkles, path: '/assistant', module: 'dashboard' },
  { id: 'family', label: 'Family', icon: Users, path: '/family', module: 'family' },
  { id: 'finance', label: 'Finance', icon: DollarSign, path: '/finance', module: 'finance' },
  { id: 'events', label: 'Events', icon: Calendar, path: '/events', module: 'events' },
  { id: 'assets', label: 'Assets', icon: Package, path: '/assets', module: 'assets' },
  { id: 'health', label: 'Health', icon: Heart, path: '/health', module: 'health' },
  { id: 'contacts', label: 'Contacts', icon: ContactRound, path: '/contacts', module: 'contacts' },
  { id: 'organizer', label: 'Organizer', icon: ListTodo, path: '/organizer', module: 'organizer' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages', module: 'messages' },
];

export function Sidebar({ activeTab, onTabChange, mobileOpen, onMobileToggle, isCollapsed = false }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const rootNavItems = [
    { id: 'root-permissions', label: 'Permissions', icon: Shield, path: '/root/permissions' },
    { id: 'root-roles', label: 'Roles', icon: UserCog, path: '/root/roles' },
    { id: 'root-groups', label: 'Groups', icon: UsersRound, path: '/root/groups' },
  ];
  const items = user?.role === 'root'
    ? rootNavItems
    : navItems.filter((item) => item.module === 'dashboard' || canAccessModule(user, item.module));

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
        w-64 ${isCollapsed ? 'md:w-20' : 'md:w-64'} border-r border-[var(--panel-border)] glass-black-surface
        transform transition-transform duration-200 ease-in-out
        md:transition-[width] md:duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className={`border-b border-[var(--panel-border)] h-[73px] flex items-center justify-between ${isCollapsed ? 'px-3 py-3' : 'px-6 py-4'}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center md:w-full' : ''}`}>
            <div className="w-10 h-10 min-w-10 min-h-10 rounded-xl ai-gradient-icon flex items-center justify-center shadow-ai-soft">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div className={`${isCollapsed ? 'md:hidden' : ''}`}>
              <p className="text-lg font-bold text-[var(--app-fg)]">Griham</p>
              <p className="text-xs text-[var(--app-fg-muted)]">Home Automation</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((item) => {
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
                } ${isCollapsed ? 'md:justify-center md:px-2' : ''}`}
                aria-label={item.label}
              >
                <Icon className="w-5 h-5" />
                <span className={`${isCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className={`absolute bottom-0 left-0 right-0 border-t border-[var(--panel-border)] bg-transparent ${isCollapsed ? 'p-3' : 'p-4'}`}>
          <div className={`flex items-center gap-3 p-3  rounded-xl mb-2  border-0 ${isCollapsed ? 'md:justify-center md:gap-0 md:p-2' : ''}`}>
            <div className={`rounded-full ai-gradient-icon flex items-center justify-center text-white font-bold text-sm ${isCollapsed ? 'md:w-9 md:h-9' : 'w-10 h-10'} shrink-0`}>
              {user?.full_name ? getInitials(user.full_name) : 'U'}
            </div>
            <div className={`flex-1 min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
              <p className="text-sm font-semibold text-[var(--app-fg)] truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-[var(--app-fg-muted)] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--app-fg)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${isCollapsed ? 'md:justify-center md:px-2' : ''}`}
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className={`${isCollapsed ? 'md:hidden' : ''}`}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
