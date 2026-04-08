import { ContentItem } from '@/lib/api';
import { Calendar } from 'lucide-react';
import { useMemo } from 'react';

interface TimelineViewProps {
  items: ContentItem[];
  channelId: string;
}

export default function TimelineView({ items }: TimelineViewProps) {
  // Group by planned_month
  const groupedByMonth = useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};

    items.forEach((item) => {
      const month = item.planned_month || 'unplanned';
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(item);
    });

    // Sort months in chronological order
    return Object.keys(grouped)
      .sort((a, b) => {
        if (a === 'unplanned') return 1;
        if (b === 'unplanned') return -1;
        return a.localeCompare(b);
      })
      .reduce((acc, key) => {
        acc[key] = grouped[key];
        return acc;
      }, {} as Record<string, ContentItem[]>);
  }, [items]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      plan: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
      build: 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100',
      publish: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-700 dark:text-emerald-100',
    };
    return colors[status] || colors.plan;
  };

  const monthNames: Record<string, string> = {
    '01': 'January',
    '02': 'February',
    '03': 'March',
    '04': 'April',
    '05': 'May',
    '06': 'June',
    '07': 'July',
    '08': 'August',
    '09': 'September',
    '10': 'October',
    '11': 'November',
    '12': 'December',
  };

  const formatMonth = (monthStr: string) => {
    if (monthStr === 'unplanned') return 'Unplanned';
    const [year, month] = monthStr.split('-');
    return `${monthNames[month]} ${year}`;
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-400">No content items to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedByMonth).map(([month, monthItems]) => (
        <div key={month} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          {/* Month Header */}
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatMonth(month)}
            </h3>
            <span className="ml-auto text-sm font-medium text-slate-600 dark:text-slate-400">
              {monthItems.length} video{monthItems.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthItems.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-shadow"
              >
                {/* Episode Number */}
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  EPISODE {item.episode_number}
                </div>

                {/* Title */}
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                  {item.title}
                </h4>

                {/* Description */}
                {item.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {item.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 2 && (
                      <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                        +{item.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* Status Badge */}
                <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </div>

                {/* Planned Publish Date */}
                {item.planned_publish_date && (
                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Publish:</span> {new Date(item.planned_publish_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
