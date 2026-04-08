import { useEffect, useState } from 'react';
import { channelsAPI, type Channel } from '@/lib/api';
import { Plus, ChevronDown, Settings2, Loader2 } from 'lucide-react';

interface ChannelSelectorProps {
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel: () => void;
  isLoading?: boolean;
  refreshTrigger?: number; // Increment to trigger reload
}

export default function ChannelSelector({
  selectedChannelId,
  onChannelSelect,
  onCreateChannel,
  isLoading = false,
  refreshTrigger = 0,
}: ChannelSelectorProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
      red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    return colorMap[colorTag || 'blue'] || colorMap.blue;
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
    <div className="relative">
      {/* Channel Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        disabled={isLoading || channels.length === 0}
      >
        {selectedChannel ? (
          <>
            <div
              className={`w-2 h-2 rounded-full ${getColorClass(selectedChannel.color_tag).split(' ')[0]}`}
            />
            <span className="font-medium text-sm text-slate-900 dark:text-white truncate max-w-xs">
              {selectedChannel.name}
            </span>
          </>
        ) : (
          <span className="text-sm text-slate-500 dark:text-slate-400">No channels</span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 p-2">
          {/* Channels List */}
          <div className="max-h-64 overflow-y-auto space-y-1 mb-2">
            {channels.length === 0 ? (
              <div className="p-3 text-center text-sm text-slate-500 dark:text-slate-400">
                No channels yet. Create one to get started!
              </div>
            ) : (
              channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => {
                    onChannelSelect(channel.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedChannelId === channel.id
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${getColorClass(channel.color_tag).split(' ')[0]}`}
                        />
                        <h3 className="font-medium text-slate-900 dark:text-white truncate">
                          {channel.name}
                        </h3>
                      </div>
                      {channel.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                          {channel.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        Target: {channel.target_monthly_uploads} videos/month
                      </p>
                    </div>
                    {selectedChannelId === channel.id && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 ml-2" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Divider */}
          {channels.length > 0 && <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />}

          {/* Create Channel Button */}
          <button
            onClick={() => {
              onCreateChannel();
              setIsDropdownOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Channel
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}
