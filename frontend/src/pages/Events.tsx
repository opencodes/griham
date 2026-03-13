import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { CalendarDays, Plus, Bell, Repeat, Cake, Heart, Sparkles } from 'lucide-react';

type EventType = 'Birthday' | 'Anniversary' | 'Festival' | 'Custom';

interface EventItem {
  id: string;
  title: string;
  type: EventType;
  date: string;
  location?: string;
  reminderDays: number;
  isRecurring: boolean;
}

const getTypeIcon = (type: EventType) => {
  if (type === 'Birthday') return <Cake className="w-4 h-4 text-pink-500" />;
  if (type === 'Anniversary') return <Heart className="w-4 h-4 text-rose-500" />;
  if (type === 'Festival') return <Sparkles className="w-4 h-4 text-amber-500" />;
  return <CalendarDays className="w-4 h-4 text-indigo-500" />;
};

const formatDate = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysUntil = (date: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export default function Events() {
  const [activeTab, setActiveTab] = useState('events');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([
    {
      id: 'evt-1',
      title: 'Papa Birthday',
      type: 'Birthday',
      date: '2026-03-05',
      location: 'Home',
      reminderDays: 7,
      isRecurring: true,
    },
    {
      id: 'evt-2',
      title: 'Wedding Anniversary',
      type: 'Anniversary',
      date: '2026-03-12',
      location: 'Family Dinner',
      reminderDays: 10,
      isRecurring: true,
    },
    {
      id: 'evt-3',
      title: 'Holi Celebration',
      type: 'Festival',
      date: '2026-03-14',
      location: 'Society Club',
      reminderDays: 3,
      isRecurring: true,
    },
  ]);

  const [formData, setFormData] = useState({
    title: '',
    type: 'Custom' as EventType,
    date: '',
    location: '',
    reminderDays: '3',
    isRecurring: true,
  });

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  const upcomingCount = useMemo(() => sortedEvents.filter((evt) => daysUntil(evt.date) >= 0).length, [sortedEvents]);
  const recurringCount = useMemo(() => sortedEvents.filter((evt) => evt.isRecurring).length, [sortedEvents]);
  const nextEvent = sortedEvents.find((evt) => daysUntil(evt.date) >= 0);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) return;

    const newEvent: EventItem = {
      id: `evt-${Date.now()}`,
      title: formData.title,
      type: formData.type,
      date: formData.date,
      location: formData.location || undefined,
      reminderDays: Number(formData.reminderDays || 0),
      isRecurring: formData.isRecurring,
    };

    setEvents((prev) => [...prev, newEvent]);
    setShowModal(false);
    setFormData({
      title: '',
      type: 'Custom',
      date: '',
      location: '',
      reminderDays: '3',
      isRecurring: true,
    });
  };

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

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
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Events</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track family occasions and reminders</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex h-11 items-center gap-2 ai-gradient-button text-white px-4 rounded-lg text-sm font-medium whitespace-nowrap"
                type="button"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Events</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{upcomingCount}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Recurring</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{recurringCount}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Next Event</p>
                <p className="text-base font-semibold text-gray-800 dark:text-gray-100 mt-2 truncate">
                  {nextEvent ? nextEvent.title : 'No upcoming events'}
                </p>
              </div>
            </div>

            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Event Timeline</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{sortedEvents.length} events</p>
              </div>

              <div className="space-y-1.5">
                {sortedEvents.map((event) => {
                  const due = daysUntil(event.date);
                  const dueLabel = due < 0 ? `${Math.abs(due)} days ago` : due === 0 ? 'Today' : `in ${due} days`;

                  return (
                    <article
                      key={event.id}
                      className="rounded-lg border border-[var(--panel-border)] px-3 py-2.5 transition hover:bg-black/5 dark:hover:bg-white/10 glass-black-soft"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex items-start gap-2.5">
                          <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            {getTypeIcon(event.type)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                {event.type}
                              </span>
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{event.title}</p>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {formatDate(event.date)}
                              {event.location ? ` • ${event.location}` : ''}
                              {' • '}
                              Reminder {event.reminderDays}d before
                              {event.isRecurring ? ' • Recurring' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-semibold text-sm ${due < 0 ? 'text-gray-500 dark:text-gray-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {dueLabel}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {sortedEvents.length === 0 && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">No events added yet</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={handleAddEvent} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add Event</h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                  className="md:col-span-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />

                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as EventType }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Birthday">Birthday</option>
                  <option value="Anniversary">Anniversary</option>
                  <option value="Festival">Festival</option>
                  <option value="Custom">Custom</option>
                </select>

                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />

                <input
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Location (optional)"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <input
                  type="number"
                  min="0"
                  value={formData.reminderDays}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reminderDays: e.target.value }))}
                  placeholder="Reminder days"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isRecurring: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Repeat className="w-4 h-4 text-gray-500" />
                Repeat yearly
              </label>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Event reminders can be sent before the selected number of days.
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg ai-gradient-button text-white"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
