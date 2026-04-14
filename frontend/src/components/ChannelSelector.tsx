import { useEffect, useState } from 'react';
import { channelsAPI, type Channel } from '@/lib/api';
import { Plus, Loader2, Pencil } from 'lucide-react';

interface ChannelSelectorProps {
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel: () => void;
  onEditChannel?: (channel: Channel) => void;
  isLoading?: boolean;
  refreshTrigger?: number; // Increment to trigger reload
}

export default function ChannelSelector({
  selectedChannelId,
  onChannelSelect,
  onCreateChannel,
  onEditChannel,
  isLoading = false,
  refreshTrigger = 0,
}: ChannelSelectorProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadChannels();
  }, [refreshTrigger]);

  const loadChannels = async () => {
    try {
      setIsFetching(true);
      setError('');
      const fetchedChannels = await channelsAPI.list();
      setChannels(fetchedChannels);

      // Auto-select first channel if none selected
      if (fetchedChannels.length > 0 && !selectedChannelId) {
        onChannelSelect(fetchedChannels[0].id);
      }
    } catch (err) {
      setError('Failed to load channels');
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const selectedChannel = channels.find((ch) => ch.id === selectedChannelId);

  const getColorClass = (colorTag?: string) => {
    const colorMap: Record<string, string> = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      yellow: 'bg-yellow-500',
    };
    return colorMap[colorTag || 'blue'] || colorMap.blue;
  };

  const getChannelInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isFetching) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-slate-600 dark:text-slate-400">Loading channels...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {channels.length === 0 ? (
          <div className="px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
            No channels yet. Create one to get started.
          </div>
        ) : (
          channels.map((channel) => {
            const isSelected = selectedChannelId === channel.id;

            return (
              <div
                key={channel.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-all ${
                  isSelected
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <button
                  onClick={() => onChannelSelect(channel.id)}
                  disabled={isLoading}
                  className={`flex items-center gap-3 text-left ${!isSelected ? 'hover:opacity-90' : ''}`}
                >
                  <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    {channel.logo_image_url ? (
                      <img
                        src={channel.logo_image_url}
                        alt={channel.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {getChannelInitials(channel.name)}
                      </span>
                    )}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-800 ${getColorClass(channel.color_tag)}`} />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="max-w-[180px] truncate text-sm font-medium text-slate-900 dark:text-white">
                      {channel.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {channel.target_monthly_uploads ?? 0} videos/month
                    </p>
                  </div>
                </button>

                {isSelected && onEditChannel && (
                  <button
                    type="button"
                    onClick={() => onEditChannel(channel)}
                    className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    title="Edit channel"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })
        )}

        <button
          onClick={onCreateChannel}
          className="inline-flex h-[58px] items-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
        >
          <Plus className="w-4 h-4" />
          Add Channel
        </button>
      </div>

      {selectedChannel?.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400">{selectedChannel.description}</p>
      )}

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
