import { Home, Users, DollarSign, Calendar, Package, Heart, ContactRound, ListTodo, MessageSquare, LogOut, Shield, UserCog, UsersRound, Sparkles, FlaskConical, Settings, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { canAccessModule, isAdminUser } from '@/lib/permissions';
import { ThemeLogo } from '@/components/ThemeLogo';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
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
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', module: 'events' },
];

export function Sidebar({ mobileOpen, onMobileToggle, isCollapsed = false }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const rootNavItems = [
    { id: 'root-permissions', label: 'Permissions', icon: Shield, path: '/root/permissions' },
    { id: 'root-roles', label: 'Roles', icon: UserCog, path: '/root/roles' },
    { id: 'root-groups', label: 'Groups', icon: UsersRound, path: '/root/groups' },
    { id: 'root-prompts', label: 'Prompt Lab', icon: FlaskConical, path: '/root/prompts' },
  ];
  const items = user?.role === 'root'
    ? rootNavItems
    : navItems.filter((item) => item.module === 'dashboard' || canAccessModule(user, item.module));
  const finalItems = user?.role === 'root'
    ? items
    : isAdminUser(user)
      ? [...items, { id: 'ai-usage', label: 'AI Usage', icon: History, path: '/ai-usage', module: 'dashboard' }]
      : items;

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-[100]
        w-60 ${isCollapsed ? 'md:w-[72px]' : 'md:w-60'} border-r border-[var(--panel-border)] glass-black-surface
        transform transition-all duration-200 ease-in-out
        md:transition-[width] md:duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className={`border-b border-[var(--panel-border)] h-[64px] flex items-center justify-between ${isCollapsed ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center md:w-full' : ''}`}>
            <ThemeLogo className="w-9 h-9 min-w-9 min-h-9" />
            <div className={`${isCollapsed ? 'md:hidden' : ''}`}>
              <p className="text-[15px] font-bold text-[var(--app-fg)] leading-tight tracking-[-0.02em]">Griham</p>
              <p className="text-[10px] text-[var(--app-fg-muted)] leading-tight mt-0.5">Home Automation</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {finalItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  if (mobileOpen) onMobileToggle();
                }}
                className={`nav-item ${isActive ? 'nav-item-active' : ''} ${isCollapsed ? 'md:justify-center md:px-2' : ''}`}
                aria-label={item.label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className={`border-t border-[var(--panel-border)] ${isCollapsed ? 'p-2' : 'p-3'}`}>
          <div className={`flex items-center gap-2.5 p-2.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] ${isCollapsed ? 'md:justify-center md:gap-0 md:p-2' : ''}`}>
            <div className={`rounded-full ai-gradient-icon flex items-center justify-center text-white font-semibold text-[11px] ${isCollapsed ? 'md:w-8 md:h-8' : 'w-9 h-9'} shrink-0`}>
              {user?.full_name ? getInitials(user.full_name) : 'U'}
            </div>
            <div className={`flex-1 min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
              <p className="text-[13px] font-semibold text-[var(--app-fg)] truncate leading-tight">
                {user?.full_name || 'User'}
              </p>
              <p className="text-[11px] text-[var(--app-fg-muted)] truncate leading-tight mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-[var(--app-fg-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/15 transition-all duration-200 mt-2 ${isCollapsed ? 'md:justify-center md:px-2' : ''}`}
            aria-label="Logout"
          >
            <LogOut className="w-[15px] h-[15px]" />
            <span className={`${isCollapsed ? 'md:hidden' : ''}`}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
