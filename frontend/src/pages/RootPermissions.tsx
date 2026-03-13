import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Users, KeyRound } from 'lucide-react';

export default function RootPermissions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('root-permissions');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (user?.role !== 'root') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden app-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        isCollapsed={sidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={handleMenuToggle} />

        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--app-fg)]">Root Permissions</h2>
              <p className="text-sm text-[var(--app-fg-muted)] mt-1">
                Manage system-level access and permission policies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <Shield className="w-6 h-6 text-indigo-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Policy Sets</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">0 active</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <Users className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Managed Roles</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">Admin, Viewer</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <KeyRound className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Overrides</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">None</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-6">
              <p className="text-sm text-[var(--app-fg-muted)] mb-2">Coming next</p>
              <p className="text-base text-[var(--app-fg)]">
                Define granular permissions, assign policies to roles, and audit access changes.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
