import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { eventsAPI, householdAPI, type Event } from '@/lib/api';
import { CalendarDays, Plus, MapPin, IndianRupee, Pencil, Trash2, ArrowRight } from 'lucide-react';

const EVENT_TYPES: Event['type'][] = ['marriage', 'anniversary', 'birthday', 'other'];
const EVENT_STATUSES: Event['status'][] = ['planned', 'ongoing', 'completed'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const eventTypeTone = (type: Event['type']) => {
  if (type === 'marriage') return 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300';
  if (type === 'anniversary') return 'bg-pink-50 text-pink-700 dark:bg-pink-950/20 dark:text-pink-300';
  if (type === 'birthday') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200';
};

const statusTone = (status: Event['status']) => {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300';
  if (status === 'ongoing') return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300';
  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300';
};

export default function EventsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('events');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    name: '',
    type: 'other' as Event['type'],
    start_date: '',
    end_date: '',
    location: '',
    total_budget: '',
    notes: '',
    status: 'planned' as Event['status'],
  });

  useEffect(() => {
    void loadFamily();
  }, []);

  useEffect(() => {
    if (!familyId) return;
    void loadEvents(familyId);
  }, [familyId]);

  const loadFamily = async () => {
    try {
      const families = await householdAPI.list();
      if (families.length === 0) {
        setLoadError('Create a family first to start planning events.');
        return;
      }
      setFamilyId(families[0].id);
      setLoadError('');
    } catch (error) {
      console.error('Failed to load family', error);
      setLoadError('Failed to load your family.');
    }
  };

  const loadEvents = async (currentFamilyId: string) => {
    setIsLoading(true);
    try {
      const list = await eventsAPI.listEvents(currentFamilyId);
      setEvents(list);
      setLoadError('');
    } catch (error) {
      console.error('Failed to load events', error);
      setLoadError('Failed to load events.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetEventForm = () => {
    setEventForm({
      name: '',
      type: 'other',
      start_date: '',
      end_date: '',
      location: '',
      total_budget: '',
      notes: '',
      status: 'planned',
    });
  };

  const openCreateEvent = () => {
    setEditingEvent(null);
    resetEventForm();
    setShowEventModal(true);
  };

  const openEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name,
      type: event.type,
      start_date: event.start_date?.slice(0, 10) ?? '',
      end_date: event.end_date?.slice(0, 10) ?? '',
      location: event.location ?? '',
      total_budget: String(event.total_budget ?? ''),
      notes: event.notes ?? '',
      status: event.status,
    });
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setEditingEvent(null);
    resetEventForm();
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId || !eventForm.name || !eventForm.start_date) return;

    setIsSaving(true);
    try {
      const payload = {
        name: eventForm.name.trim(),
        type: eventForm.type,
        start_date: eventForm.start_date,
        end_date: eventForm.end_date || undefined,
        location: eventForm.location.trim() || undefined,
        total_budget: Number(eventForm.total_budget || 0),
        notes: eventForm.notes.trim() || undefined,
        status: eventForm.status,
      };

      if (editingEvent) {
        await eventsAPI.updateEvent(familyId, editingEvent.id, payload);
      } else {
        await eventsAPI.createEvent(familyId, payload);
      }

      closeEventModal();
      await loadEvents(familyId);
    } catch (error) {
      console.error('Failed to save event', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    if (!familyId) return;
    if (!window.confirm(`Delete "${event.name}" and all linked sub-events and participants?`)) return;

    setDeletingEventId(event.id);
    try {
      await eventsAPI.deleteEvent(familyId, event.id);
      await loadEvents(familyId);
    } catch (error) {
      console.error('Failed to delete event', error);
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const totalPlannedBudget = useMemo(
    () => events.reduce((sum, event) => sum + Number(event.total_budget || 0), 0),
    [events]
  );

  const ongoingCount = useMemo(
    () => events.filter((event) => event.status === 'ongoing').length,
    [events]
  );

  const completedCount = useMemo(
    () => events.filter((event) => event.status === 'completed').length,
    [events]
  );

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
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Browse household events and open a dedicated page for full planning details.
                </p>
              </div>
              <button
                onClick={openCreateEvent}
                className="inline-flex h-11 items-center gap-2 ai-gradient-button text-white px-4 rounded-lg text-sm font-medium whitespace-nowrap disabled:opacity-60"
                type="button"
                disabled={!familyId}
              >
                <Plus className="w-4 h-4" />
                New Event
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{events.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Ongoing</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{ongoingCount}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{completedCount}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Event List</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isLoading ? 'Loading…' : `${events.length} events • Total budget ${formatCurrency(totalPlannedBudget)}`}
                  </p>
                </div>
              </div>

              {loadError && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  {loadError}
                </div>
              )}

              <div className="space-y-0">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 transition hover:bg-black/5 dark:hover:bg-white/10 border-b border-[var(--panel-border)] last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${eventTypeTone(event.type)}`}>
                            {titleCase(event.type)}
                          </span>
                          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${statusTone(event.status)}`}>
                            {titleCase(event.status)}
                          </span>
                        </div>
                        <p className="mt-2 text-base font-semibold text-gray-800 dark:text-gray-100">{event.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDate(event.start_date)}</span>
                          <span className="inline-flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />{formatCurrency(event.total_budget)}</span>
                          {event.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/events/${event.id}`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                          aria-label={`Open ${event.name}`}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditEvent(event)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                          aria-label={`Edit ${event.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteEvent(event)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition disabled:opacity-50"
                          aria-label={`Delete ${event.name}`}
                          disabled={deletingEventId === event.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {!isLoading && events.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No events yet. Start with your next birthday, anniversary, or family function.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showEventModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={handleSaveEvent} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {editingEvent ? 'Edit Event' : 'Create Event'}
                </h3>
                <button type="button" onClick={closeEventModal} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="md:col-span-2 space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Event Name</span>
                  <input
                    value={eventForm.name}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Riya Wedding"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Type</span>
                  <select
                    value={eventForm.type}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, type: e.target.value as Event['type'] }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>{titleCase(type)}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Status</span>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, status: e.target.value as Event['status'] }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {EVENT_STATUSES.map((status) => (
                      <option key={status} value={status}>{titleCase(status)}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Start Date</span>
                  <input
                    type="date"
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">End Date</span>
                  <input
                    type="date"
                    value={eventForm.end_date}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, end_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Location</span>
                  <input
                    value={eventForm.location}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Banquet hall or home"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Budget</span>
                  <input
                    type="number"
                    min="0"
                    value={eventForm.total_budget}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, total_budget: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </label>

                <label className="md:col-span-2 space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Notes</span>
                  <textarea
                    value={eventForm.notes}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Guest expectations, venue remarks, planning notes..."
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeEventModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-lg ai-gradient-button text-white disabled:opacity-50">
                  {editingEvent ? 'Update Event' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
