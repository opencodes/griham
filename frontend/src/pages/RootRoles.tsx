import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { adminAPI, User } from '@/lib/api';
import { UserCog, Users, ShieldCheck } from 'lucide-react';

export default function RootRoles() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('root-roles');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await adminAPI.listUsers();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load users', err);
        setError('Unable to load users right now.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

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
              <h2 className="text-2xl font-bold text-[var(--app-fg)]">Role Management</h2>
              <p className="text-sm text-[var(--app-fg-muted)] mt-1">
                Assign roles and manage access levels across households.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <UserCog className="w-6 h-6 text-indigo-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Role Editor</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">Draft</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <Users className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Assigned Users</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">0</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <ShieldCheck className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Role Health</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">No issues</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-6">
              <p className="text-sm text-[var(--app-fg-muted)] mb-2">Coming next</p>
              <p className="text-base text-[var(--app-fg)]">
                Create roles, assign users, and configure admin permissions per household.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--app-fg)]">Users</h3>
                <span className="text-xs text-[var(--app-fg-muted)]">
                  {isLoading ? 'Loading...' : `${users.length} total`}
                </span>
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</div>
              )}

              {!error && isLoading && (
                <div className="text-sm text-[var(--app-fg-muted)]">Fetching users...</div>
              )}

              {!error && !isLoading && users.length === 0 && (
                <div className="text-sm text-[var(--app-fg-muted)]">No users found.</div>
              )}

              {!error && !isLoading && users.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--app-fg-muted)]">
                        <th className="py-2 pr-4 font-medium">Name</th>
                        <th className="py-2 pr-4 font-medium">Email</th>
                        <th className="py-2 pr-4 font-medium">Role</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-[var(--panel-border)]">
                          <td className="py-2 pr-4 text-[var(--app-fg)]">{u.full_name || '—'}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg)]">{u.email}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg)]">{u.role}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg)]">
                            {u.is_active ? 'Active' : 'Inactive'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
