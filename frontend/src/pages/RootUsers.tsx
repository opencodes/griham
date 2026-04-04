import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { adminAPI, rbacAPI, type User, type Role } from '@/lib/api';
import { Users, UserPlus } from 'lucide-react';

export default function RootUsers() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('root-users');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRoleModal, setUserRoleModal] = useState<User | null>(null);
  const [userRoleSelectedIds, setUserRoleSelectedIds] = useState<string[]>([]);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState('');
  const [createUserModal, setCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    rbac_role_id: ''
  });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersData, rolesData] = await Promise.all([
        adminAPI.listUsers(),
        rbacAPI.listRoles(),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(rolesData);
    } catch (e) {
      console.error(e);
      setError('Failed to load users or roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openUserRoleModal = async (u: User) => {
    try {
      const roleList = await rbacAPI.getUserRoles(u.id);
      setUserRoleSelectedIds(roleList.slice(0, 1).map((r: Role) => r.id));
      setUserRoleModal(u);
    } catch (e) {
      setError('Failed to load user roles.');
    }
  };

  const saveUserRoles = async () => {
    if (!userRoleModal) return;
    try {
      await rbacAPI.setUserRoles(userRoleModal.id, userRoleSelectedIds);
      setUserRoleModal(null);
      load();
    } catch (e) {
      setError((e as Error).message || 'Failed to update user roles.');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    setResetPasswordError('');
    setResetPasswordSuccess('');
    if (!resetPasswordValue) {
      setResetPasswordError('New password is required.');
      return;
    }
    if (resetPasswordValue.length < 6) {
      setResetPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (resetPasswordValue !== resetPasswordConfirm) {
      setResetPasswordError('Passwords do not match.');
      return;
    }
    setResetPasswordLoading(true);
    try {
      await adminAPI.resetUserPassword(resetPasswordUser.id, resetPasswordValue);
      setResetPasswordSuccess('Password reset successfully.');
      setResetPasswordValue('');
      setResetPasswordConfirm('');
    } catch (e: any) {
      setResetPasswordError(e?.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleCreateUser = async () => {
    setCreateUserError('');
    if (!createUserForm.email || !createUserForm.password || !createUserForm.full_name) {
      setCreateUserError('Email, password, and full name are required.');
      return;
    }
    if (createUserForm.password.length < 6) {
      setCreateUserError('Password must be at least 6 characters.');
      return;
    }
    if (createUserForm.password !== createUserForm.confirmPassword) {
      setCreateUserError('Passwords do not match.');
      return;
    }
    if (!createUserForm.rbac_role_id) {
      setCreateUserError('Please select a role.');
      return;
    }

    setCreateUserLoading(true);
    try {
      await adminAPI.createUser({
        email: createUserForm.email,
        password: createUserForm.password,
        full_name: createUserForm.full_name,
        phone: createUserForm.phone || undefined,
        rbac_role_id: createUserForm.rbac_role_id
      });
      setCreateUserModal(false);
      setCreateUserForm({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        phone: '',
        rbac_role_id: ''
      });
      load();
    } catch (e: any) {
      setCreateUserError(e?.response?.data?.message || 'Failed to create user.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const toggleUserRole = (roleId: string) => {
    setUserRoleSelectedIds((prev) => (prev[0] === roleId ? [] : [roleId]));
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
        <Header onMobileMenuToggle={() => { setMobileMenuOpen(!mobileMenuOpen); setSidebarCollapsed(!sidebarCollapsed); }} />
        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[var(--app-fg)]">Users</h2>
                <p className="text-sm text-[var(--app-fg-muted)] mt-1">
                  Manage users and assign roles.
                </p>
              </div>
              <button
                onClick={() => setCreateUserModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                <UserPlus className="w-4 h-4" /> Add user
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <Users className="w-6 h-6 text-indigo-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Total Users</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{users.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <UserPlus className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Active Users</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{users.filter(u => u.is_active).length}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-6">
              <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-4">Users & role assignment</h3>
              {loading && <p className="text-sm text-[var(--app-fg-muted)]">Loading...</p>}
              {!loading && users.length === 0 && <p className="text-sm text-[var(--app-fg-muted)]">No users found.</p>}
              {!loading && users.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--app-fg-muted)]">
                        <th className="py-2 pr-4 font-medium">Name</th>
                        <th className="py-2 pr-4 font-medium">Email</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 pr-4 font-medium">RBAC role</th>
                        <th className="py-2 pr-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-[var(--panel-border)]">
                          <td className="py-2 pr-4 text-[var(--app-fg)] font-medium">{u.full_name || '—'}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg)]">{u.email}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg)]">{u.is_active ? 'Active' : 'Inactive'}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg)]">{u?.rbac_role?.name || 'root'}</td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <button
                                onClick={() => openUserRoleModal(u)}
                                className="px-2 py-1 rounded border border-[var(--panel-border)] text-[var(--app-fg)] text-xs hover:bg-black/5"
                              >
                                Assign role
                              </button>
                              <button
                                onClick={() => { setResetPasswordUser(u); setResetPasswordError(''); setResetPasswordSuccess(''); }}
                                className="px-2 py-1 rounded border border-[var(--panel-border)] text-[var(--app-fg)] text-xs hover:bg-black/5"
                              >
                                Reset password
                              </button>
                            </div>
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

      {/* Create user modal */}
      {createUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCreateUserModal(false)}>
          <div className="rounded-xl glass-black-surface border border-[var(--panel-border)] w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-4">Create New User</h3>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--app-fg)]">Email *</label>
              <input
                type="email"
                value={createUserForm.email}
                onChange={(e) => setCreateUserForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="user@example.com"
              />
              <label className="block text-sm font-medium text-[var(--app-fg)]">Full Name *</label>
              <input
                type="text"
                value={createUserForm.full_name}
                onChange={(e) => setCreateUserForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="John Doe"
              />
              <label className="block text-sm font-medium text-[var(--app-fg)]">Phone</label>
              <input
                type="tel"
                value={createUserForm.phone}
                onChange={(e) => setCreateUserForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="+1234567890"
              />
              <label className="block text-sm font-medium text-[var(--app-fg)]">Password *</label>
              <input
                type="password"
                value={createUserForm.password}
                onChange={(e) => setCreateUserForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="Minimum 6 characters"
              />
              <label className="block text-sm font-medium text-[var(--app-fg)]">Confirm Password *</label>
              <input
                type="password"
                value={createUserForm.confirmPassword}
                onChange={(e) => setCreateUserForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="Confirm password"
              />
              <label className="block text-sm font-medium text-[var(--app-fg)]">Role *</label>
              <select
                value={createUserForm.rbac_role_id}
                onChange={(e) => setCreateUserForm((f) => ({ ...f, rbac_role_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
              >
                <option value="">Select a role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {createUserError && <p className="text-sm text-red-500">{createUserError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setCreateUserModal(false)} className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)]">Cancel</button>
              <button onClick={handleCreateUser} disabled={createUserLoading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50">
                {createUserLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User roles modal */}
      {userRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setUserRoleModal(null)}>
          <div className="rounded-xl glass-black-surface border border-[var(--panel-border)] w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--panel-border)]">
              <h3 className="text-lg font-semibold text-[var(--app-fg)]">Role for: {userRoleModal.full_name || userRoleModal.email}</h3>
              <p className="text-sm text-[var(--app-fg-muted)] mt-1">Select a single role for this user.</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`user-role-${userRoleModal.id}`}
                      checked={userRoleSelectedIds[0] === r.id}
                      onChange={() => toggleUserRole(r.id)}
                      className="rounded border-[var(--panel-border)]"
                    />
                    <span className="text-sm text-[var(--app-fg)]">{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-[var(--panel-border)] flex justify-end gap-2">
              <button onClick={() => setUserRoleModal(null)} className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)]">Cancel</button>
              <button onClick={saveUserRoles} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setResetPasswordUser(null)}>
          <div className="rounded-xl glass-black-surface border border-[var(--panel-border)] w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-4">
              Reset password for: {resetPasswordUser.full_name || resetPasswordUser.email}
            </h3>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--app-fg)]">New Password</label>
              <input
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
              />
              <label className="block text-sm font-medium text-[var(--app-fg)]">Confirm New Password</label>
              <input
                type="password"
                value={resetPasswordConfirm}
                onChange={(e) => setResetPasswordConfirm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
              />
              {resetPasswordError && <p className="text-sm text-red-500">{resetPasswordError}</p>}
              {resetPasswordSuccess && <p className="text-sm text-emerald-500">{resetPasswordSuccess}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setResetPasswordUser(null)} className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)]">Close</button>
              <button onClick={handleResetPassword} disabled={resetPasswordLoading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">
                {resetPasswordLoading ? 'Saving...' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}