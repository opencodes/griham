import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { contentTrackerAPI, channelsAPI, type ContentItem, type Channel } from '@/lib/api';
import { Plus, Pencil, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import ChannelSelector from '@/components/ChannelSelector';
import ChannelForm from '@/components/ChannelForm';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
};

const STATUS_COLORS = {
  plan: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  build: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  publish: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
};

type ContentStatus = 'plan' | 'build' | 'publish';
type ContentFormState = {
  title: string;
  description: string;
  status: ContentStatus;
  planned_month: string;
  planned_publish_date: string;
};

export default function ContentTrackerPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [refreshChannels, setRefreshChannels] = useState(0);
  const [form, setForm] = useState<ContentFormState>({
    title: '',
    description: '',
    status: 'plan',
    planned_month: '',
    planned_publish_date: '',
  });

  // Load selected channel and content
  useEffect(() => {
    if (selectedChannelId) {
      loadChannelData();
    } else {
      setSelectedChannel(null);
      setContentItems([]);
    }
  }, [selectedChannelId]);

  const loadChannelData = async () => {
    if (!selectedChannelId) return;
    try {
      setIsLoading(true);
      setLoadError('');
      const [channel, items] = await Promise.all([
        channelsAPI.get(selectedChannelId),
        contentTrackerAPI.getByChannel(selectedChannelId),
      ]);
      setSelectedChannel(channel);
      setContentItems(items.sort((a, b) => a.episode_number - b.episode_number));
    } catch (error) {
      setLoadError('Failed to load channel data. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChannelCreated = async () => {
    // Reload channels - increment trigger to force ChannelSelector reload
    setRefreshChannels((prev) => prev + 1);
    if (editingChannel?.id) {
      setSelectedChannelId(editingChannel.id);
    }
    setEditingChannel(null);
    setShowChannelForm(false);
  };

  const handleCreateChannel = () => {
    setEditingChannel(null);
    setShowChannelForm(true);
  };

  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel);
    setShowChannelForm(true);
  };

  const handleAdd = () => {
    if (!selectedChannelId) {
      setLoadError('Please select a channel first');
      return;
    }
    setEditingItem(null);
    setForm({ title: '', description: '', status: 'plan', planned_month: '', planned_publish_date: '' });
    setShowForm(true);
  };

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description || '',
      status: item.status,
      planned_month: item.planned_month || '',
      planned_publish_date: item.planned_publish_date || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('Title is required');
      return;
    }
    if (!selectedChannelId) {
      alert('Channel not selected');
      return;
    }

    try {
      setIsSaving(true);

      // Auto-generate episode number if creating new item
      let episodeNumber: number;
      if (editingItem) {
        episodeNumber = editingItem.episode_number;
      } else {
        // Find next episode number
        const maxEp = contentItems.length > 0 ? Math.max(...contentItems.map(i => i.episode_number)) : 0;
        episodeNumber = maxEp + 1;
      }

      const payload: Partial<ContentItem> = {
        channel_id: selectedChannelId,
        episode_number: episodeNumber,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        planned_month: form.planned_month || undefined,
        planned_publish_date: form.planned_publish_date || undefined,
      };

      if (editingItem) {
        await contentTrackerAPI.update(editingItem.id, payload);
      } else {
        await contentTrackerAPI.create(payload);
      }

      await loadChannelData();
      setShowForm(false);
    } catch (error) {
      alert('Failed to save. Please try again.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      setDeleteError('');
      await contentTrackerAPI.delete(itemId);
      await loadChannelData();
    } catch (error) {
      setDeleteError('Failed to delete. Please try again.');
      console.error(error);
    }
  };

  const handleStatusChange = async (item: ContentItem) => {
    try {
      const nextStatus = item.status === 'plan' ? 'build' : item.status === 'build' ? 'publish' : 'plan';
      const updateDate = {
        plan: 'planned_date',
        build: 'start_build_date',
        publish: 'published_date',
      };

      await contentTrackerAPI.update(item.id, {
        status: nextStatus,
        [updateDate[nextStatus]]: new Date().toISOString(),
      });

      await loadChannelData();
    } catch (error) {
      alert('Failed to update status. Please try again.');
      console.error(error);
    }
  };

  const itemsByStatus = useMemo(() => {
    return {
      plan: contentItems.filter((item) => item.status === 'plan'),
      build: contentItems.filter((item) => item.status === 'build'),
      publish: contentItems.filter((item) => item.status === 'publish'),
    };
  }, [contentItems]);

  const summaryCards = useMemo(() => {
    const plannedCount = itemsByStatus.plan.length;
    const buildCount = itemsByStatus.build.length;
    const publishedCount = itemsByStatus.publish.length;
    const inPipelineCount = plannedCount + buildCount;

    return [
      {
        label: 'Planned Content',
        value: plannedCount,
        valueClassName: 'text-gray-800 dark:text-gray-100',
      },
      {
        label: 'In Production',
        value: inPipelineCount,
        valueClassName: 'text-gray-800 dark:text-gray-100',
      },
      {
        label: selectedChannel ? 'Monthly Target' : 'Published',
        value: selectedChannel ? selectedChannel.target_monthly_uploads ?? 0 : publishedCount,
        valueClassName: selectedChannel ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400',
      },
    ];
  }, [itemsByStatus, selectedChannel]);

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        isCollapsed={false}
      />

      <div className="flex-1 flex flex-col">
        <Header onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="w-full">
            {/* Header with Channel Selector */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Content Tracker</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Track your video content through Plan → Build → Publish</p>
              </div>
              <button
                onClick={handleAdd}
                disabled={!selectedChannelId || isLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Content
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5"
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className={`text-2xl font-bold mt-2 ${card.valueClassName}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Channel Selector Bar */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Channel</p>
                  <ChannelSelector
                    selectedChannelId={selectedChannelId}
                    onChannelSelect={setSelectedChannelId}
                    onCreateChannel={handleCreateChannel}
                    onEditChannel={handleEditChannel}
                    isLoading={isLoading}
                    refreshTrigger={refreshChannels}
                  />
                </div>
                {selectedChannel && (
                  <div className="text-right">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-900 dark:text-white">{contentItems.length}</span> total items
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Target: <span className="font-medium text-slate-900 dark:text-white">{selectedChannel.target_monthly_uploads}</span> videos/month
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error Messages */}
            {loadError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
                  <p className="text-red-700 dark:text-red-300 text-sm">{loadError}</p>
                </div>
              </div>
            )}

            {deleteError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-300 text-sm">{deleteError}</p>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* No Channel Selected */}
            {!isLoading && !selectedChannelId && (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 p-8">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">No channel selected</p>
                <p className="text-slate-500 dark:text-slate-500 text-sm mb-6">Please select or create a channel to get started</p>
                <button
                  onClick={handleCreateChannel}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Channel
                </button>
              </div>
            )}

            {/* Table View */}
            {!isLoading && selectedChannelId && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Episode</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Title</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Planned Month</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Planned Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Build Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Publish Date</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900 dark:text-white">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {contentItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                            No content items yet. Create one to get started.
                          </td>
                        </tr>
                      ) : (
                        contentItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-mono font-medium text-slate-900 dark:text-white">EP{String(item.episode_number).padStart(7, '0')}</td>
                            <td className="px-6 py-4 text-sm text-slate-900 dark:text-white max-w-xs truncate">{item.title}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {item.planned_month || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {formatDate(item.planned_date)}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {formatDate(item.start_build_date)}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {item.planned_publish_date ? formatDate(item.planned_publish_date) : formatDate(item.published_date)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(item)}
                                  className="text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded transition-colors"
                                  title="Change Status"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Channel Form Modal */}
      <ChannelForm
        isOpen={showChannelForm}
        channel={editingChannel}
        onClose={() => setShowChannelForm(false)}
        onSuccess={handleChannelCreated}
      />

      {/* Content Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{editingItem ? 'Edit Content' : 'New Content'}</h2>

            {/* Form Fields */}
            <div className="space-y-4 mb-6">
              {/* Auto-generated Episode Number Display */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Episode Number (auto-generated)</label>
                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-medium">
                  EP{editingItem ? String(editingItem.episode_number).padStart(7, '0') : String((Math.max(...contentItems.map(i => i.episode_number), 0) + 1)).padStart(7, '0')}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Content title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Content description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Planned Month</label>
                <input
                  type="month"
                  value={form.planned_month}
                  onChange={(e) => setForm({ ...form, planned_month: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Publish Date</label>
                <input
                  type="date"
                  value={form.planned_publish_date}
                  onChange={(e) => setForm({ ...form, planned_publish_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'plan' | 'build' | 'publish' })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="plan">Planning</option>
                  <option value="build">Building</option>
                  <option value="publish">Published</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                disabled={isSaving}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
