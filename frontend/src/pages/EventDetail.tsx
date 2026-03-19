import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { contactsAPI, eventsAPI, financeAPI, householdAPI, type Contact, type Event, type EventFinanceSummary, type EventParticipant, type SubEvent, type Transaction } from '@/lib/api';
import { ArrowLeft, CalendarDays, Clock3, IndianRupee, MapPin, Plus, Sparkles } from 'lucide-react';

const PARTICIPANT_ROLES: EventParticipant['role'][] = ['guest', 'vendor', 'host'];
const RSVP_STATUSES: EventParticipant['rsvp_status'][] = ['pending', 'accepted', 'declined'];

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

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

const roleTone = (role: EventParticipant['role']) => {
  if (role === 'vendor') return 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-300';
  if (role === 'host') return 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200';
};

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId = '' } = useParams();
  const [activeTab, setActiveTab] = useState('events');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [familyId, setFamilyId] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financeSummary, setFinanceSummary] = useState<EventFinanceSummary>({
    totalBudget: 0,
    totalSpent: 0,
    remainingBudget: 0,
    bySubEvent: [],
  });
  const [aiInsight, setAiInsight] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSubEventModal, setShowSubEventModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [subEventForm, setSubEventForm] = useState({
    name: '',
    date_time: '',
    location: '',
    budget: '',
  });
  const [participantForm, setParticipantForm] = useState({
    contact_ids: [] as string[],
    role: 'guest' as EventParticipant['role'],
    rsvp_status: 'pending' as EventParticipant['rsvp_status'],
  });
  const [participantSearch, setParticipantSearch] = useState('');

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const loadEventDetails = useCallback(async (currentFamilyId: string, currentEventId: string) => {
    setIsLoading(true);
    try {
      const [eventData, subEventList, participantList, finance, ai, transactionList, contactList] = await Promise.all([
        eventsAPI.getEvent(currentFamilyId, currentEventId),
        eventsAPI.listSubEvents(currentEventId),
        eventsAPI.listParticipants(currentEventId),
        eventsAPI.getFinanceSummary(currentEventId),
        eventsAPI.getAiInsights(currentEventId).catch(() => ({ eventId: currentEventId, message: '', ai_available: false })),
        financeAPI.listTransactions(currentFamilyId).catch(() => []),
        contactsAPI.list(currentFamilyId, { limit: 500 }).catch(() => []),
      ]);
      setEvent(eventData);
      setSubEvents(subEventList);
      setParticipants(participantList);
      setContacts(contactList as Contact[]);
      setFinanceSummary(finance);
      setAiInsight(ai.message ?? '');
      setTransactions(
        (transactionList as Transaction[])
          .filter((transaction) => transaction.event_id === currentEventId)
          .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
      );
      setError('');
    } catch (loadError) {
      console.error('Failed to load event detail', loadError);
      setError('Unable to load this event right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadFamily = async () => {
      try {
        const families = await householdAPI.list();
        if (families.length === 0) {
          setError('Create a family first to view event details.');
          setIsLoading(false);
          return;
        }
        const currentFamilyId = families[0].id;
        setFamilyId(currentFamilyId);
        if (eventId) {
          await loadEventDetails(currentFamilyId, eventId);
        }
      } catch (loadError) {
        console.error('Failed to load family', loadError);
        setError('Unable to load household details.');
        setIsLoading(false);
      }
    };

    void loadFamily();
  }, [eventId, loadEventDetails]);

  const transactionsBySubEvent = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const transaction of transactions) {
      const key = transaction.sub_event_id ?? '__general__';
      const list = map.get(key) ?? [];
      list.push(transaction);
      map.set(key, list);
    }
    return map;
  }, [transactions]);

  const resetSubEventForm = () => {
    setSubEventForm({
      name: '',
      date_time: '',
      location: '',
      budget: '',
    });
  };

  const resetParticipantForm = () => {
    setParticipantForm({
      contact_ids: [],
      role: 'guest',
      rsvp_status: 'pending',
    });
    setParticipantSearch('');
  };

  const availableContacts = useMemo(
    () => contacts.filter((contact) => !participants.some((participant) => participant.contact_id === contact.id)),
    [contacts, participants]
  );

  const filteredContacts = useMemo(() => {
    const query = participantSearch.trim().toLowerCase();
    if (!query) return availableContacts;
    return availableContacts.filter((contact) => {
      const haystack = [contact.name, contact.phone, contact.email]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [availableContacts, participantSearch]);

  const selectedParticipantContacts = useMemo(
    () => availableContacts.filter((contact) => participantForm.contact_ids.includes(contact.id)),
    [availableContacts, participantForm.contact_ids]
  );

  const toggleParticipantContact = (contactId: string) => {
    setParticipantForm((prev) => ({
      ...prev,
      contact_ids: prev.contact_ids.includes(contactId)
        ? prev.contact_ids.filter((id) => id !== contactId)
        : [...prev.contact_ids, contactId],
    }));
  };

  const handleSaveSubEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !subEventForm.name || !subEventForm.date_time || !familyId) return;

    setIsSaving(true);
    try {
      await eventsAPI.createSubEvent(eventId, {
        name: subEventForm.name.trim(),
        date_time: new Date(subEventForm.date_time).toISOString(),
        location: subEventForm.location.trim() || undefined,
        budget: Number(subEventForm.budget || 0),
      });
      setShowSubEventModal(false);
      resetSubEventForm();
      await loadEventDetails(familyId, eventId);
    } catch (saveError) {
      console.error('Failed to save sub-event', saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveParticipants = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !familyId || participantForm.contact_ids.length === 0) return;

    setIsSaving(true);
    try {
      await Promise.all(
        participantForm.contact_ids.map((contactId) =>
          eventsAPI.createParticipant(eventId, {
            contact_id: contactId,
            role: participantForm.role,
            rsvp_status: participantForm.rsvp_status,
          })
        )
      );
      setShowParticipantModal(false);
      resetParticipantForm();
      await loadEventDetails(familyId, eventId);
    } catch (saveError) {
      console.error('Failed to save participants', saveError);
    } finally {
      setIsSaving(false);
    }
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
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/events')}
                  className="w-10 h-10 rounded-lg border border-[var(--panel-border)] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 shadow-sm glass-black-surface"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{event?.name || 'Event Details'}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Dedicated event view for functions, participants, and finance details.
                  </p>
                </div>
              </div>
              {!!event && (
                <button
                  type="button"
                  onClick={() => familyId && eventId && void loadEventDetails(familyId, eventId)}
                  className="px-3 py-2 rounded-lg border border-[var(--panel-border)] text-sm text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Refresh
                </button>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-8 text-sm text-gray-500 dark:text-gray-400">
                Loading event details...
              </div>
            )}

            {!isLoading && event && (
              <>
                <section className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${eventTypeTone(event.type)}`}>
                          {titleCase(event.type)}
                        </span>
                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${statusTone(event.status)}`}>
                          {titleCase(event.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="w-4 h-4" />{formatDate(event.start_date)} to {formatDate(event.end_date)}</span>
                        {event.location && <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" />{event.location}</span>}
                        <span className="inline-flex items-center gap-1"><IndianRupee className="w-4 h-4" />{formatCurrency(event.total_budget)}</span>
                      </div>
                      {event.notes && (
                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{event.notes}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-[280px]">
                      <div className="rounded-lg bg-white dark:bg-white/5 border border-[var(--panel-border)] p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                        <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(financeSummary.totalBudget)}</p>
                      </div>
                      <div className="rounded-lg bg-white dark:bg-white/5 border border-[var(--panel-border)] p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Spent</p>
                        <p className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400">{formatCurrency(financeSummary.totalSpent)}</p>
                      </div>
                      <div className="rounded-lg bg-white dark:bg-white/5 border border-[var(--panel-border)] p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(financeSummary.remainingBudget)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-[var(--panel-border)] bg-white dark:bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg ai-gradient-icon flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">AI Planning Note</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {aiInsight || 'AI event insight placeholder is ready for future planning suggestions.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">Functions</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{subEvents.length} sub-events</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSubEventModal(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg ai-gradient-button text-white text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  <div className="space-y-3">
                    {subEvents.map((subEvent) => {
                      const spend = financeSummary.bySubEvent.find((item) => item.subEventId === subEvent.id)?.totalSpent ?? 0;
                      return (
                        <article key={subEvent.id} className="rounded-lg border border-[var(--panel-border)] bg-white dark:bg-white/5 p-4">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 dark:text-gray-100">{subEvent.name}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{formatDateTime(subEvent.date_time)}</span>
                                {subEvent.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{subEvent.location}</span>}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 xl:min-w-[240px]">
                              <div className="rounded-lg border border-[var(--panel-border)] bg-black/5 px-3 py-2 text-right dark:bg-white/5">
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">Budget</p>
                                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(subEvent.budget)}</p>
                              </div>
                              <div className="rounded-lg border border-[var(--panel-border)] bg-black/5 px-3 py-2 text-right dark:bg-white/5">
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">Spent</p>
                                <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">{formatCurrency(spend)}</p>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                    {subEvents.length === 0 && (
                      <div className="rounded-lg border border-dashed border-[var(--panel-border)] p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No sub-events added yet.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">Spend by Function</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">All event-linked transactions grouped under each function</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {financeSummary.bySubEvent.map((item) => (
                      <div key={item.subEventId ?? 'general'} className="rounded-lg border border-[var(--panel-border)] bg-white dark:bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-100">{item.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Budget {formatCurrency(item.budget)}</p>
                          </div>
                          <p className="text-sm font-semibold text-red-600 dark:text-red-400">{formatCurrency(item.totalSpent)}</p>
                        </div>

                        {(transactionsBySubEvent.get(item.subEventId ?? '__general__') ?? []).length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-[var(--panel-border)] pt-3">
                            {(transactionsBySubEvent.get(item.subEventId ?? '__general__') ?? []).map((transaction) => (
                              <div
                                key={transaction.id}
                                className="flex items-start justify-between gap-3 rounded-lg bg-black/5 px-3 py-2 dark:bg-white/5"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                    {transaction.description || transaction.category || 'Transaction'}
                                  </p>
                                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(transaction.transaction_date)} • {transaction.category}
                                    {transaction.account_name ? ` • ${transaction.account_name}` : ''}
                                  </p>
                                </div>
                                <p className={`shrink-0 text-sm font-semibold ${transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount || 0))}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {financeSummary.bySubEvent.length === 0 && (
                      <div className="rounded-lg border border-dashed border-[var(--panel-border)] p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No event-linked transactions yet.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">Participants</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{participants.length} linked contacts</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowParticipantModal(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg ai-gradient-button text-white text-sm disabled:opacity-50"
                      disabled={availableContacts.length === 0}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-[var(--panel-border)] bg-white dark:bg-white/5">
                    {participants.length > 0 && (
                      <table className="min-w-full text-sm">
                        <thead className="bg-black/5 dark:bg-white/5">
                          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">RSVP</th>
                            <th className="px-4 py-3 font-medium">Phone</th>
                            <th className="px-4 py-3 font-medium">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participants.map((participant) => (
                            <tr key={participant.id} className="border-t border-[var(--panel-border)]">
                              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                                {participant.contact?.name || 'Unnamed contact'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${roleTone(participant.role)}`}>
                                  {titleCase(participant.role)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex rounded-full px-2 py-1 text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                                  {titleCase(participant.rsvp_status)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                {participant.contact?.phone || 'NA'}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                {participant.contact?.email || 'NA'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {participants.length === 0 && (
                      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No participants linked yet.
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {showSubEventModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={handleSaveSubEvent} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add Sub-Event</h3>
                <button type="button" onClick={() => { setShowSubEventModal(false); resetSubEventForm(); }} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="md:col-span-2 space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Function Name</span>
                  <input
                    value={subEventForm.name}
                    onChange={(e) => setSubEventForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Reception"
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Date & Time</span>
                  <input
                    type="datetime-local"
                    value={subEventForm.date_time}
                    onChange={(e) => setSubEventForm((prev) => ({ ...prev, date_time: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Budget</span>
                  <input
                    type="number"
                    min="0"
                    value={subEventForm.budget}
                    onChange={(e) => setSubEventForm((prev) => ({ ...prev, budget: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="md:col-span-2 space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Location</span>
                  <input
                    value={subEventForm.location}
                    onChange={(e) => setSubEventForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Hall, lawn, terrace..."
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowSubEventModal(false); resetSubEventForm(); }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-lg ai-gradient-button text-white disabled:opacity-50">
                  Save Sub-Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showParticipantModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={handleSaveParticipants} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add Participants</h3>
                <button type="button" onClick={() => { setShowParticipantModal(false); resetParticipantForm(); }} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="md:col-span-2 space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Contacts</span>
                  <input
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Search by name, phone, or email"
                  />
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    {filteredContacts.map((contact) => {
                      const checked = participantForm.contact_ids.includes(contact.id);
                      return (
                        <label key={contact.id} className="flex cursor-pointer items-start gap-3 border-b border-gray-100 px-3 py-2.5 text-sm last:border-b-0 dark:border-gray-800">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParticipantContact(contact.id)}
                            className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="min-w-0">
                            <span className="block text-gray-800 dark:text-gray-100">{contact.name || 'Unnamed contact'}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">{contact.phone || contact.email || 'No contact detail'}</span>
                          </span>
                        </label>
                      );
                    })}
                    {filteredContacts.length === 0 && (
                      <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">No matching contacts found.</div>
                    )}
                  </div>
                  {selectedParticipantContacts.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedParticipantContacts.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => toggleParticipantContact(contact.id)}
                          className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
                        >
                          {contact.name || 'Unnamed contact'}
                          <span>×</span>
                        </button>
                      ))}
                    </div>
                  )}
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Role</span>
                  <select
                    value={participantForm.role}
                    onChange={(e) => setParticipantForm((prev) => ({ ...prev, role: e.target.value as EventParticipant['role'] }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PARTICIPANT_ROLES.map((role) => (
                      <option key={role} value={role}>{titleCase(role)}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-gray-700 dark:text-gray-200">RSVP Status</span>
                  <select
                    value={participantForm.rsvp_status}
                    onChange={(e) => setParticipantForm((prev) => ({ ...prev, rsvp_status: e.target.value as EventParticipant['rsvp_status'] }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {RSVP_STATUSES.map((status) => (
                      <option key={status} value={status}>{titleCase(status)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowParticipantModal(false); resetParticipantForm(); }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={isSaving || participantForm.contact_ids.length === 0} className="px-4 py-2 rounded-lg ai-gradient-button text-white disabled:opacity-50">
                  Save Participants
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
