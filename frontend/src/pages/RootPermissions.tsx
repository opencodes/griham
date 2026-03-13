import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { rbacAPI, type Permission, type Role } from '@/lib/api';
import { Shield, Plus, Pencil, Trash2, KeyRound } from 'lucide-react';

export default function RootPermissions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('root-permissions');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [form, setForm] = useState({ name: '', resource: '', action: '', description: '' });
  const [rolePermModal, setRolePermModal] = useState<{ role: Role; permissionIds: string[] } | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [perms, rolesList] = await Promise.all([rbacAPI.listPermissions(), rbacAPI.listRoles()]);
      setPermissions(perms);
      setRoles(rolesList);
    } catch (e) {
      console.error(e);
      setError('Failed to load permissions or roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = () => {
    setEditingPermission(null);
    setForm({ name: '', resource: '', action: '', description: '' });
    setModal('create');
  };

  const handleEdit = (p: Permission) => {
    setEditingPermission(p);
    setForm({
      name: p.name,
      resource: p.resource,
      action: p.action,
      description: p.description ?? '',
    });
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.resource.trim() || !form.action.trim()) {
      setError('Name, resource, and action are required.');
      return;
    }
    try {
      setError('');
      if (editingPermission) {
        await rbacAPI.updatePermission(editingPermission.id, {
          name: form.name,
          resource: form.resource,
          action: form.action,
          description: form.description || undefined,
        });
      } else {
        await rbacAPI.createPermission({
          name: form.name,
          resource: form.resource,
          action: form.action,
          description: form.description || undefined,
        });
      }
      setModal(null);
      load();
    } catch (e) {
      setError((e as Error).message || 'Save failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this permission from all roles?')) return;
    try {
      await rbacAPI.deletePermission(id);
      load();
    } catch (e) {
      setError((e as Error).message || 'Delete failed.');
    }
  };

  const openRolePermModal = async (role: Role) => {
    try {
      const full = await rbacAPI.getRole(role.id);
      setRolePermModal({
        role,
        permissionIds: (full.permissions ?? []).map((p: Permission) => p.id),
      });
    } catch (e) {
      setError('Failed to load role permissions.');
    }
  };

  const saveRolePermissions = async () => {
    if (!rolePermModal) return;
    try {
      await rbacAPI.setRolePermissions(rolePermModal.role.id, rolePermModal.permissionIds);
      setRolePermModal(null);
      load();
    } catch (e) {
      setError((e as Error).message || 'Failed to update role permissions.');
    }
  };

  const togglePermissionForRole = (permId: string) => {
    if (!rolePermModal) return;
    const ids = rolePermModal.permissionIds.includes(permId)
      ? rolePermModal.permissionIds.filter((id) => id !== permId)
      : [...rolePermModal.permissionIds, permId];
    setRolePermModal({ ...rolePermModal, permissionIds: ids });
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
                <h2 className="text-2xl font-bold text-[var(--app-fg)]">Permissions</h2>
                <p className="text-sm text-[var(--app-fg-muted)] mt-1">
                  Define granular permissions and assign them to roles.
                </p>
              </div>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Add permission
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <Shield className="w-6 h-6 text-indigo-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Total permissions</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{permissions.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <KeyRound className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Roles</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{roles.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <Shield className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Policy</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">Role → Permissions</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-6">
              <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-4">All permissions</h3>
              {loading && <p className="text-sm text-[var(--app-fg-muted)]">Loading...</p>}
              {!loading && permissions.length === 0 && (
                <p className="text-sm text-[var(--app-fg-muted)]">No permissions yet. Create one to get started.</p>
              )}
              {!loading && permissions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--app-fg-muted)]">
                        <th className="py-2 pr-4 font-medium">Name</th>
                        <th className="py-2 pr-4 font-medium">Resource</th>
                        <th className="py-2 pr-4 font-medium">Action</th>
                        <th className="py-2 pr-4 font-medium">Description</th>
                        <th className="py-2 pr-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissions.map((p) => (
                        <tr key={p.id} className="border-t border-[var(--panel-border)]">
                          <td className="py-2 pr-4 text-[var(--app-fg)] font-medium">{p.name}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg)]">{p.resource}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg)]">{p.action}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg-muted)]">{p.description || '—'}</td>
                          <td className="py-2 pr-4 flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(p)}
                              className="p-1.5 rounded text-[var(--app-fg-muted)] hover:bg-black/5 dark:hover:bg-white/10"
                              aria-label="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-500/10"
                              aria-label="Delete"
                            >
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
              <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-4">Assign permissions to roles</h3>
              {roles.length === 0 && (
                <p className="text-sm text-[var(--app-fg-muted)]">Create roles in the Roles page first.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => openRolePermModal(role)}
                    className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)] hover:bg-black/5 dark:hover:bg-white/10 text-sm font-medium"
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Create/Edit permission modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModal(null)}>
          <div className="rounded-xl glass-black-surface border border-[var(--panel-border)] w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-4">
              {editingPermission ? 'Edit permission' : 'New permission'}
            </h3>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--app-fg)]">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="e.g. finance.accounts.read"
              />
              <label className="block text-sm font-medium text-[var(--app-fg)]">Resource</label>
              <input
                type="text"
                value={form.resource}
                onChange={(e) => setForm((f) => ({ ...f, resource: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="e.g. finance.accounts"
              />
              <label className="block text-sm font-medium text-[var(--app-fg)]">Action</label>
              <input
                type="text"
                value={form.action}
                onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="e.g. read, write, delete"
              />
              <label className="block text-sm font-medium text-[var(--app-fg)]">Description (optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="Short description"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)]">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Role permissions modal */}
      {rolePermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setRolePermModal(null)}>
          <div className="rounded-xl glass-black-surface border border-[var(--panel-border)] w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--panel-border)]">
              <h3 className="text-lg font-semibold text-[var(--app-fg)]">Permissions for role: {rolePermModal.role.name}</h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-[var(--app-fg-muted)] mb-3">Select permissions to assign to this role.</p>
              <div className="space-y-2">
                {permissions.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rolePermModal.permissionIds.includes(p.id)}
                      onChange={() => togglePermissionForRole(p.id)}
                      className="rounded border-[var(--panel-border)]"
                    />
                    <span className="text-sm text-[var(--app-fg)]">{p.name}</span>
                    <span className="text-xs text-[var(--app-fg-muted)]">({p.resource}:{p.action})</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-[var(--panel-border)] flex justify-end gap-2">
              <button onClick={() => setRolePermModal(null)} className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)]">Cancel</button>
              <button onClick={saveRolePermissions} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
