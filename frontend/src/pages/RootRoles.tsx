import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { adminAPI, rbacAPI, type User, type Role, type Permission } from '@/lib/api';
import { UserCog, Users, ShieldCheck, Plus, Pencil, Trash2 } from 'lucide-react';

function groupPermissionsByResource(perms: Permission[]) {
  const map = new Map<string, Permission[]>();
  perms.forEach((perm) => {
    const key = perm.resource || 'other';
    const list = map.get(key) ?? [];
    list.push(perm);
    map.set(key, list);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([resource, items]) => ({
      resource,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export default function RootRoles() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('root-roles');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleModal, setRoleModal] = useState<'create' | 'edit' | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [permModal, setPermModal] = useState<Role | null>(null);
  const [permModalSelectedIds, setPermModalSelectedIds] = useState<string[]>([]);
  const [userRoleModal, setUserRoleModal] = useState<User | null>(null);
  const [userRoleSelectedIds, setUserRoleSelectedIds] = useState<string[]>([]);
  const groupedPermissions = groupPermissionsByResource(permissions);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersData, rolesData, permsData] = await Promise.all([
        adminAPI.listUsers(),
        rbacAPI.listRoles(),
        rbacAPI.listPermissions(),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (e) {
      console.error(e);
      setError('Failed to load users, roles, or permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '' });
    setRoleModal('create');
  };

  const handleEditRole = (r: Role) => {
    setEditingRole(r);
    setRoleForm({ name: r.name, description: r.description ?? '' });
    setRoleModal('edit');
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      setError('Role name is required.');
      return;
    }
    try {
      setError('');
      if (editingRole) {
        await rbacAPI.updateRole(editingRole.id, roleForm);
      } else {
        await rbacAPI.createRole(roleForm);
      }
      setRoleModal(null);
      load();
    } catch (e) {
      setError((e as Error).message || 'Save failed.');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Delete this role? User assignments will be removed.')) return;
    try {
      await rbacAPI.deleteRole(id);
      load();
    } catch (e) {
      setError((e as Error).message || 'Delete failed.');
    }
  };

  const openPermModal = async (r: Role) => {
    try {
      const full = await rbacAPI.getRole(r.id);
      setPermModalSelectedIds((full.permissions ?? []).map((p: Permission) => p.id));
      setPermModal(r);
    } catch (e) {
      setError('Failed to load role permissions.');
    }
  };

  const saveRolePerms = async () => {
    if (!permModal) return;
    try {
      await rbacAPI.setRolePermissions(permModal.id, permModalSelectedIds);
      setPermModal(null);
      load();
    } catch (e) {
      setError((e as Error).message || 'Failed to update permissions.');
    }
  };

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

  const toggleUserRole = (roleId: string) => {
    setUserRoleSelectedIds((prev) => (prev[0] === roleId ? [] : [roleId]));
  };

  const togglePermForRole = (permId: string) => {
    setPermModalSelectedIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
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
                <h2 className="text-2xl font-bold text-[var(--app-fg)]">Roles</h2>
                <p className="text-sm text-[var(--app-fg-muted)] mt-1">
                  Create roles, assign permissions, and assign roles to users.
                </p>
              </div>
              <button
                onClick={handleCreateRole}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Add role
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <UserCog className="w-6 h-6 text-indigo-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Roles</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{roles.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <Users className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Users</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{users.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <ShieldCheck className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Permissions</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{permissions.length}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-6">
              <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-4">Roles</h3>
              {loading && <p className="text-sm text-[var(--app-fg-muted)]">Loading...</p>}
              {!loading && roles.length === 0 && (
                <p className="text-sm text-[var(--app-fg-muted)]">No RBAC roles yet. Create one to get started.</p>
              )}
              {!loading && roles.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--app-fg-muted)]">
                        <th className="py-2 pr-4 font-medium">Name</th>
                        <th className="py-2 pr-4 font-medium">Description</th>
                        <th className="py-2 pr-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((r) => (
                        <tr key={r.id} className="border-t border-[var(--panel-border)]">
                          <td className="py-2 pr-4 text-[var(--app-fg)] font-medium">{r.name}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg-muted)]">{r.description || '—'}</td>
                          <td className="py-2 pr-4 flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => openPermModal(r)}
                              className="px-2 py-1 rounded border border-[var(--panel-border)] text-[var(--app-fg)] text-xs hover:bg-black/5"
                            >
                              Permissions
                            </button>
                            <button onClick={() => handleEditRole(r)} className="p-1.5 rounded text-[var(--app-fg-muted)] hover:bg-black/5" aria-label="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteRole(r.id)} className="p-1.5 rounded text-red-600 hover:bg-red-500/10" aria-label="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-6">
              <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-4">Users & role assignment</h3>
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
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-[var(--panel-border)]">
                          <td className="py-2 pr-4 text-[var(--app-fg)]">{u.full_name || '—'}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg)]">{u.email}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg)]">{u.is_active ? 'Active' : 'Inactive'}</td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-3">
                              <span className="text-[var(--app-fg)]">{u.rbac_role_name || '—'}</span>
                              <button
                                onClick={() => openUserRoleModal(u)}
                                className="px-2 py-1 rounded border border-[var(--panel-border)] text-[var(--app-fg)] text-xs hover:bg-black/5"
                              >
                                Assign role
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

      {/* Create/Edit role modal */}
      {(roleModal === 'create' || roleModal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setRoleModal(null)}>
          <div className="rounded-xl glass-black-surface border border-[var(--panel-border)] w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-4">
              {editingRole ? 'Edit role' : 'New role'}
            </h3>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--app-fg)]">Name</label>
              <input
                type="text"
                value={roleForm.name}
                onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="e.g. finance_admin"
              />
              <label className="block text-sm font-medium text-[var(--app-fg)]">Description (optional)</label>
              <input
                type="text"
                value={roleForm.description}
                onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="Short description"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setRoleModal(null)} className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)]">Cancel</button>
              <button onClick={handleSaveRole} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Role permissions modal */}
      {permModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPermModal(null)}>
          <div className="rounded-xl glass-black-surface border border-[var(--panel-border)] w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--panel-border)]">
              <h3 className="text-lg font-semibold text-[var(--app-fg)]">Permissions for: {permModal.name}</h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {groupedPermissions.map((group) => (
                  <div key={group.resource} className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-[var(--app-fg-muted)]">{group.resource}</p>
                    {group.items.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permModalSelectedIds.includes(p.id)}
                          onChange={() => togglePermForRole(p.id)}
                          className="rounded border-[var(--panel-border)]"
                        />
                        <span className="text-sm text-[var(--app-fg)]">{p.name}</span>
                        <span className="text-xs text-[var(--app-fg-muted)]">({p.resource}:{p.action})</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-[var(--panel-border)] flex justify-end gap-2">
              <button onClick={() => setPermModal(null)} className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)]">Cancel</button>
              <button onClick={saveRolePerms} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Save</button>
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
    </div>
  );
}
