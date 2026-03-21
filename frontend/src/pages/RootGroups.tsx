import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { adminAPI, rbacAPI, type User, type Group, type Role } from '@/lib/api';
import { Users, Plus, Pencil, Trash2, UserPlus, Shield } from 'lucide-react';

export default function RootGroups() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('root-groups');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupModal, setGroupModal] = useState<'create' | 'edit' | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [membersModal, setMembersModal] = useState<Group | null>(null);
  const [membersSelectedIds, setMembersSelectedIds] = useState<string[]>([]);
  const [groupRolesModal, setGroupRolesModal] = useState<Group | null>(null);
  const [groupRolesSelectedIds, setGroupRolesSelectedIds] = useState<string[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [groupsData, usersData, rolesData] = await Promise.all([
        rbacAPI.listGroups(),
        adminAPI.listUsers(),
        rbacAPI.listRoles(),
      ]);
      setGroups(groupsData);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(rolesData);
    } catch (e) {
      console.error(e);
      setError('Failed to load groups, users, or roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: '', description: '' });
    setGroupModal('create');
  };

  const handleEditGroup = (g: Group) => {
    setEditingGroup(g);
    setGroupForm({ name: g.name, description: g.description ?? '' });
    setGroupModal('edit');
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      setError('Group name is required.');
      return;
    }
    try {
      setError('');
      if (editingGroup) {
        await rbacAPI.updateGroup(editingGroup.id, groupForm);
      } else {
        await rbacAPI.createGroup(groupForm);
      }
      setGroupModal(null);
      load();
    } catch (e) {
      setError((e as Error).message || 'Save failed.');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this group? Member and role assignments will be removed.')) return;
    try {
      await rbacAPI.deleteGroup(id);
      load();
    } catch (e) {
      setError((e as Error).message || 'Delete failed.');
    }
  };

  const openMembersModal = async (g: Group) => {
    try {
      const full = await rbacAPI.getGroup(g.id);
      setMembersSelectedIds(full.user_ids ?? []);
      setMembersModal(g);
    } catch (e) {
      setError('Failed to load group members.');
    }
  };

  const saveGroupMembers = async () => {
    if (!membersModal) return;
    try {
      await rbacAPI.setGroupMembers(membersModal.id, membersSelectedIds);
      setMembersModal(null);
      load();
    } catch (e) {
      setError((e as Error).message || 'Failed to update members.');
    }
  };

  const openGroupRolesModal = async (g: Group) => {
    try {
      const full = await rbacAPI.getGroup(g.id);
      setGroupRolesSelectedIds(full.role_ids ?? []);
      setGroupRolesModal(g);
    } catch (e) {
      setError('Failed to load group roles.');
    }
  };

  const saveGroupRoles = async () => {
    if (!groupRolesModal) return;
    try {
      await rbacAPI.setGroupRoles(groupRolesModal.id, groupRolesSelectedIds);
      setGroupRolesModal(null);
      load();
    } catch (e) {
      setError((e as Error).message || 'Failed to update group roles.');
    }
  };

  const toggleMember = (userId: string) => {
    setMembersSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleGroupRole = (roleId: string) => {
    setGroupRolesSelectedIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
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
                <h2 className="text-2xl font-bold text-[var(--app-fg)]">Groups</h2>
                <p className="text-sm text-[var(--app-fg-muted)] mt-1">
                  Create groups and assign users and roles to them.
                </p>
              </div>
              <button
                onClick={handleCreateGroup}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Add group
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <Users className="w-6 h-6 text-indigo-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Groups</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{groups.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <UserPlus className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Users</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{users.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <Shield className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-sm text-[var(--app-fg-muted)]">Roles</p>
                <p className="text-lg font-semibold text-[var(--app-fg)] mt-1">{roles.length}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-6">
              <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-4">All groups</h3>
              {loading && <p className="text-sm text-[var(--app-fg-muted)]">Loading...</p>}
              {!loading && groups.length === 0 && (
                <p className="text-sm text-[var(--app-fg-muted)]">No groups yet. Create one to get started.</p>
              )}
              {!loading && groups.length > 0 && (
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
                      {groups.map((g) => (
                        <tr key={g.id} className="border-t border-[var(--panel-border)]">
                          <td className="py-2 pr-4 text-[var(--app-fg)] font-medium">{g.name}</td>
                          <td className="py-2 pr-4 text-[var(--app-fg-muted)]">{g.description || '—'}</td>
                          <td className="py-2 pr-4 flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => openMembersModal(g)}
                              className="px-2 py-1 rounded border border-[var(--panel-border)] text-[var(--app-fg)] text-xs hover:bg-black/5"
                            >
                              Members
                            </button>
                            <button
                              onClick={() => openGroupRolesModal(g)}
                              className="px-2 py-1 rounded border border-[var(--panel-border)] text-[var(--app-fg)] text-xs hover:bg-black/5"
                            >
                              Roles
                            </button>
                            <button onClick={() => handleEditGroup(g)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30" aria-label="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteGroup(g.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label="Delete">
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
          </div>
        </main>
      </div>

      {/* Create/Edit group modal */}
      {(groupModal === 'create' || groupModal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setGroupModal(null)}>
          <div className="rounded-xl glass-black-surface border border-[var(--panel-border)] w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--app-fg)] mb-4">
              {editingGroup ? 'Edit group' : 'New group'}
            </h3>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--app-fg)]">Name</label>
              <input
                type="text"
                value={groupForm.name}
                onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="e.g. Finance team"
              />
              <label className="block text-sm font-medium text-[var(--app-fg)]">Description (optional)</label>
              <input
                type="text"
                value={groupForm.description}
                onChange={(e) => setGroupForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] text-[var(--app-fg)]"
                placeholder="Short description"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setGroupModal(null)} className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)]">Cancel</button>
              <button onClick={handleSaveGroup} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Group members modal */}
      {membersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setMembersModal(null)}>
          <div className="rounded-xl glass-black-surface border border-[var(--panel-border)] w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--panel-border)]">
              <h3 className="text-lg font-semibold text-[var(--app-fg)]">Members: {membersModal.name}</h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={membersSelectedIds.includes(u.id)}
                      onChange={() => toggleMember(u.id)}
                      className="rounded border-[var(--panel-border)]"
                    />
                    <span className="text-sm text-[var(--app-fg)]">{u.full_name || u.email}</span>
                    <span className="text-xs text-[var(--app-fg-muted)]">{u.email}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-[var(--panel-border)] flex justify-end gap-2">
              <button onClick={() => setMembersModal(null)} className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)]">Cancel</button>
              <button onClick={saveGroupMembers} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Group roles modal */}
      {groupRolesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setGroupRolesModal(null)}>
          <div className="rounded-xl glass-black-surface border border-[var(--panel-border)] w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--panel-border)]">
              <h3 className="text-lg font-semibold text-[var(--app-fg)]">Roles for group: {groupRolesModal.name}</h3>
              <p className="text-xs text-[var(--app-fg-muted)] mt-1">Roles assigned to this group (for future group-based permission inheritance).</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={groupRolesSelectedIds.includes(r.id)}
                      onChange={() => toggleGroupRole(r.id)}
                      className="rounded border-[var(--panel-border)]"
                    />
                    <span className="text-sm text-[var(--app-fg)]">{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-[var(--panel-border)] flex justify-end gap-2">
              <button onClick={() => setGroupRolesModal(null)} className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-[var(--app-fg)]">Cancel</button>
              <button onClick={saveGroupRoles} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
