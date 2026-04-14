import { useEffect, useState } from 'react';
import { channelsAPI, type Channel } from '@/lib/api';
import { X, Loader2 } from 'lucide-react';

interface ChannelFormProps {
  isOpen: boolean;
  channel?: Channel | null;
  onClose: () => void;
  onSuccess: () => void;
}

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
];

export default function ChannelForm({ isOpen, channel, onClose, onSuccess }: ChannelFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_image_url: '',
    youtube_url: '',
    upload_schedule: 'Mon, Wed, Fri at 8:00 AM',
    target_monthly_uploads: 8,
    monthly_target_views: 5000,
    color_tag: 'blue',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name || '',
        description: channel.description || '',
        logo_image_url: channel.logo_image_url || '',
        youtube_url: channel.youtube_url || '',
        upload_schedule: channel.upload_schedule || 'Mon, Wed, Fri at 8:00 AM',
        target_monthly_uploads: channel.target_monthly_uploads || 8,
        monthly_target_views: channel.monthly_target_views || 5000,
        color_tag: channel.color_tag || 'blue',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        logo_image_url: '',
        youtube_url: '',
        upload_schedule: 'Mon, Wed, Fri at 8:00 AM',
        target_monthly_uploads: 8,
        monthly_target_views: 5000,
        color_tag: 'blue',
      });
    }
    setError('');
  }, [channel, isOpen]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Channel name is required');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      if (channel?.id) {
        await channelsAPI.update(channel.id, formData);
      } else {
        await channelsAPI.create(formData);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save channel');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {channel ? 'Edit Channel' : 'New Channel'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-6">
          {/* Channel Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Channel Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Learnatica"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., AI learning for junior developers"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Logo Image URL
            </label>
            <input
              type="url"
              value={formData.logo_image_url}
              onChange={(e) => setFormData({ ...formData, logo_image_url: e.target.value })}
              placeholder="https://example.com/channel-logo.png"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          {/* YouTube URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              YouTube URL
            </label>
            <input
              type="url"
              value={formData.youtube_url}
              onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              placeholder="https://youtube.com/@yourhandle"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          {/* Upload Schedule */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Upload Schedule
            </label>
            <input
              type="text"
              value={formData.upload_schedule}
              onChange={(e) => setFormData({ ...formData, upload_schedule: e.target.value })}
              placeholder="e.g., Mon, Wed, Fri at 8:00 AM"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          {/* Monthly Targets */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Videos/Month
              </label>
              <input
                type="number"
                min="1"
                value={formData.target_monthly_uploads}
                onChange={(e) => setFormData({ ...formData, target_monthly_uploads: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Views
              </label>
              <input
                type="number"
                min="0"
                value={formData.monthly_target_views}
                onChange={(e) => setFormData({ ...formData, monthly_target_views: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Color Tag */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Channel Color
            </label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setFormData({ ...formData, color_tag: color.value })}
                  className={`w-8 h-8 rounded-full ${color.class} ${
                    formData.color_tag === color.value ? 'ring-2 ring-offset-2 ring-slate-300 dark:ring-offset-slate-800' : ''
                  } transition-all`}
                  title={color.label}
                  disabled={isSaving}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
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
  );
}
