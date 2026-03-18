import { useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Plus, ShieldAlert, User, Building2, Users, Pencil, Trash2, Sparkles } from 'lucide-react';
import { contactsAPI, householdAPI, type Contact as ApiContact, type ContactCleanupSuggestion } from '@/lib/api';

type ContactGroup = 'Family' | 'Neighbor' | 'Vendor' | 'Emergency';

interface ContactItem {
  id: string;
  name: string;
  group: ContactGroup;
  relationOrRole: string;
  phone: string;
  email?: string;
  address?: string;
  isEmergency: boolean;
}

const groupBadgeClass = (group: ContactGroup) => {
  if (group === 'Family') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
  if (group === 'Neighbor') return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
  if (group === 'Vendor') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
};

const groupIcon = (group: ContactGroup) => {
  if (group === 'Family') return <Users className="w-4 h-4 text-indigo-500" />;
  if (group === 'Neighbor') return <User className="w-4 h-4 text-cyan-500" />;
  if (group === 'Vendor') return <Building2 className="w-4 h-4 text-amber-500" />;
  return <ShieldAlert className="w-4 h-4 text-red-500" />;
};

export default function Contacts() {
  const [activeTab, setActiveTab] = useState('contacts');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [deletingContact, setDeletingContact] = useState<ContactItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [summaryFromApi, setSummaryFromApi] = useState<{ total: number; last_synced_at: string | null }>({
    total: 0,
    last_synced_at: null,
  });
  const [serverSuggestions, setServerSuggestions] = useState<ContactCleanupSuggestion[] | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [cleanupSuggesting, setCleanupSuggesting] = useState(false);
  const [ignoredSuggestions, setIgnoredSuggestions] = useState<Set<string>>(new Set());
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupActiveId, setCleanupActiveId] = useState<string | null>(null);
  const [cleanupProgress, setCleanupProgress] = useState({ current: 0, total: 0 });
  const [cleanupAction, setCleanupAction] = useState<string>('');
  const [cleanupSuccess, setCleanupSuccess] = useState<string | null>(null);
  const cleanupSuccessTimerRef = useRef<number | null>(null);
  const cleanupCancelRef = useRef(false);

  const mapApiToUi = (c: ApiContact): ContactItem => {
    const phone = c.phone ?? (c.phone_ext && c.phone_number ? `${c.phone_ext} ${c.phone_number}` : c.phone_number ?? '');
    const nameRaw = c.name ?? '';
    const nameDigits = nameRaw.replace(/\D/g, '');
    const phoneDigits = phone.replace(/\D/g, '');
    const nameIsPhoneOnly = nameDigits && phoneDigits && nameDigits === phoneDigits;
    return {
      id: c.id,
      name: nameIsPhoneOnly ? 'Unknown Name' : nameRaw || 'Unknown Name',
      group: 'Family',
      relationOrRole: 'Synced',
      phone,
      email: c.email ?? undefined,
      isEmergency: false,
    };
  };

  const loadContacts = async (q?: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const family = await householdAPI.getCurrent();
      const familyId = family?.id;
      if (!familyId) {
        setContacts([]);
        setLoadError('No family selected');
        return;
      }
      const [apiContacts, apiSummary] = await Promise.all([
        contactsAPI.list(familyId, { q: q?.trim() || undefined, limit: 500 }),
        contactsAPI.summary(familyId),
      ]);
      setContacts(apiContacts.map(mapApiToUi));
      setSummaryFromApi(apiSummary);
      setIgnoredSuggestions(new Set());
      setServerSuggestions(null);
      setAiAvailable(false);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search text for typeahead queries
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Trigger search whenever debounced value changes
  useEffect(() => {
    if (debouncedSearch === '' && search === '') {
      // Initial load already handled
      return;
    }
    loadContacts(debouncedSearch || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const [formData, setFormData] = useState({
    name: '',
    group: 'Family' as ContactGroup,
    relationOrRole: '',
    phone: '',
    email: '',
    address: '',
    isEmergency: false,
  });

  const summary = useMemo(() => {
    return {
      family: summaryFromApi.total,
      vendors: 0,
      emergency: 0,
    };
  }, [summaryFromApi.total]);

  const countryCode = useMemo(() => {
    // Simple default: India (10-digit numbers)
    return 'IN';
  }, []);

  type JunkReasonType =
    | 'name_phone'
    | 'invalid_phone'
    | 'duplicate_name'
    | 'missing_name'
    | 'missing_phone'
    | 'phone_repeated'
    | 'name_too_short'
    | 'name_mostly_digits'
    | 'email_invalid'
    | 'ai_suspected';
  interface JunkSuggestion {
    id: string;
    reasons: JunkReasonType[];
    ai_reason?: string;
  }

  const isPhoneValid = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return false;
    if (raw.trim().startsWith('+')) return digits.length >= 10 && digits.length <= 15;
    if (countryCode === 'IN') return digits.length === 10;
    return digits.length >= 7 && digits.length <= 15;
  };

  const localSuggestions = useMemo<JunkSuggestion[]>(() => {
    const list: JunkSuggestion[] = [];
    const nameCounts = new Map<string, number>();

    contacts.forEach((c) => {
      const key = (c.name || '').trim().toLowerCase();
      if (!key) return;
      nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
    });

    contacts.forEach((c) => {
      const reasons: JunkReasonType[] = [];
      const name = (c.name || '').trim();
      const phone = (c.phone || '').trim();
      const nameLower = name.toLowerCase();
      const phoneDigits = phone.replace(/\D/g, '');

      if (!name) reasons.push('missing_name');
      if (!phone) reasons.push('missing_phone');

      if (name && phone) {
        const startsWithPhone = nameLower.startsWith(phoneDigits) || nameLower.startsWith(phone);
        const hasOnlyNameAndPhone = nameLower.replace(/\s+/g, ' ').includes(phoneDigits) || nameLower.includes(phone);
        if (startsWithPhone || hasOnlyNameAndPhone) reasons.push('name_phone');
      }

      if (phone && !isPhoneValid(phone)) reasons.push('invalid_phone');

      if (name && (nameCounts.get(nameLower) || 0) > 1) reasons.push('duplicate_name');

      if (reasons.length > 0) list.push({ id: c.id, reasons });
    });

    return list.filter((s) => !ignoredSuggestions.has(s.id));
  }, [contacts, ignoredSuggestions, countryCode]);

  const contactsById = useMemo(() => {
    return new Map(contacts.map((c) => [c.id, c]));
  }, [contacts]);

  type JunkSuggestionView = JunkSuggestion & { contact: ContactItem };
  const suggestions = useMemo<JunkSuggestionView[]>(() => {
    const source = (serverSuggestions ?? localSuggestions) as JunkSuggestion[];
    const withContact = source
      .filter((s) => !ignoredSuggestions.has(s.id))
      .map((s) => ({
        ...s,
        contact: contactsById.get(s.id),
      }))
      .filter((s): s is JunkSuggestionView => Boolean(s.contact));
    return withContact;
  }, [serverSuggestions, localSuggestions, ignoredSuggestions, contactsById]);
  const showSuggestions = serverSuggestions !== null;

  const reasonLabel = (reason: JunkReasonType) => {
    if (reason === 'name_phone') return 'Name includes phone number';
    if (reason === 'invalid_phone') return 'Invalid phone length';
    if (reason === 'duplicate_name') return 'Duplicate name (rename)';
    if (reason === 'missing_name') return 'Missing name';
    if (reason === 'missing_phone') return 'Missing phone';
    if (reason === 'phone_repeated') return 'Repeated digits';
    if (reason === 'name_too_short') return 'Name too short';
    if (reason === 'name_mostly_digits') return 'Name mostly digits';
    if (reason === 'email_invalid') return 'Email invalid';
    if (reason === 'ai_suspected') return 'AI suspected junk';
    return reason.replace(/_/g, ' ');
  };

  const handleIgnoreSuggestion = (id: string) => {
    setIgnoredSuggestions((prev) => new Set(prev).add(id));
  };

  const handleSuggestCleanup = async () => {
    if (cleanupSuggesting) return;
    setCleanupSuggesting(true);
    setLoadError(null);
    try {
      const family = await householdAPI.getCurrent();
      const familyId = family?.id;
      if (!familyId) {
        setLoadError('No family selected');
        return;
      }
      const cleanup = await contactsAPI.cleanupSuggestions(familyId, { country: countryCode, limit: 500 });
      setServerSuggestions(cleanup.suggestions);
      setAiAvailable(cleanup.ai_available);
      setIgnoredSuggestions(new Set());
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to generate cleanup suggestions');
      setServerSuggestions([]);
      setAiAvailable(false);
    } finally {
      setCleanupSuggesting(false);
    }
  };

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      return a.name.localeCompare(b.name);
    });
  }, [contacts]);

  const resetForm = () => {
    setFormData({
      name: '',
      group: 'Family',
      relationOrRole: '',
      phone: '',
      email: '',
      address: '',
      isEmergency: false,
    });
  };

  const openAddModal = () => {
    setEditingContact(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (contact: ContactItem) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      group: contact.group,
      relationOrRole: contact.relationOrRole,
      phone: contact.phone,
      email: contact.email ?? '',
      address: contact.address ?? '',
      isEmergency: contact.isEmergency,
    });
    setShowModal(true);
  };

  const isLocalId = (id: string) => id.startsWith('cnt-');

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.relationOrRole) return;

    if (editingContact) {
      if (isLocalId(editingContact.id)) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === editingContact.id
              ? {
                  ...c,
                  name: formData.name,
                  group: formData.group,
                  relationOrRole: formData.relationOrRole,
                  phone: formData.phone,
                  email: formData.email || undefined,
                  address: formData.address || undefined,
                  isEmergency: formData.isEmergency || formData.group === 'Emergency',
                }
              : c
          )
        );
      } else {
        try {
          const updated = await contactsAPI.update(editingContact.id, {
            name: formData.name,
            phone: formData.phone,
            email: formData.email || null,
          });
          setContacts((prev) =>
            prev.map((c) =>
              c.id === editingContact.id
                ? {
                    ...c,
                    name: updated.name ?? c.name,
                    phone:
                      updated.phone ??
                      (updated.phone_ext && updated.phone_number
                        ? `${updated.phone_ext} ${updated.phone_number}`
                        : updated.phone_number ?? c.phone),
                    email: updated.email ?? undefined,
                    group: formData.group,
                    relationOrRole: formData.relationOrRole,
                    address: formData.address || undefined,
                    isEmergency: formData.isEmergency || formData.group === 'Emergency',
                  }
                : c
            )
          );
        } catch (err: any) {
          setLoadError(err?.message ?? 'Failed to update contact');
          return;
        }
      }
    } else {
      setContacts((prev) => [
        ...prev,
        {
          id: `cnt-${Date.now()}`,
          name: formData.name,
          group: formData.group,
          relationOrRole: formData.relationOrRole,
          phone: formData.phone,
          email: formData.email || undefined,
          address: formData.address || undefined,
          isEmergency: formData.isEmergency || formData.group === 'Emergency',
        },
      ]);
    }

    setEditingContact(null);
    resetForm();
    setShowModal(false);
  };

  const requestDelete = (contact: ContactItem) => {
    setDeletingContact(contact);
  };

  const confirmDelete = async () => {
    if (!deletingContact) return;
    if (isLocalId(deletingContact.id)) {
      setContacts((prev) => prev.filter((c) => c.id !== deletingContact.id));
      if (editingContact?.id === deletingContact.id) {
        setEditingContact(null);
        setShowModal(false);
      }
      setDeletingContact(null);
      return;
    }
    try {
      await contactsAPI.remove(deletingContact.id);
      setContacts((prev) => prev.filter((c) => c.id !== deletingContact.id));
      if (editingContact?.id === deletingContact.id) {
        setEditingContact(null);
        setShowModal(false);
      }
      setDeletingContact(null);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to delete contact');
    }
  };

  const bulkCleanup = async () => {
    if (suggestions.length === 0) return;
    if (cleanupRunning) return;
    setCleanupRunning(true);
    setCleanupActiveId(null);
    setCleanupProgress({ current: 0, total: suggestions.length });
    setCleanupAction('');
    setCleanupSuccess(null);
    if (cleanupSuccessTimerRef.current) {
      window.clearTimeout(cleanupSuccessTimerRef.current);
      cleanupSuccessTimerRef.current = null;
    }
    cleanupCancelRef.current = false;
    try {
      const queue = [...suggestions];
      for (let i = 0; i < queue.length; i += 1) {
        if (cleanupCancelRef.current) break;
        const item = queue[i];
        setCleanupActiveId(item.id);
        setCleanupProgress({ current: i + 1, total: queue.length });
        if (isLocalId(item.id)) {
          setCleanupAction('Removing local contact');
          setContacts((prev) => prev.filter((c) => c.id !== item.id));
          continue;
        }
        setCleanupAction('Deleting contact');
        await contactsAPI.remove(item.id);
        setContacts((prev) => prev.filter((c) => c.id !== item.id));
      }
      setCleanupActiveId(null);
      setCleanupAction('');
      setServerSuggestions([]);
      setIgnoredSuggestions(new Set());
      await loadContacts(search.trim() || undefined);
      setCleanupSuccess('Cleanup completed successfully.');
      cleanupSuccessTimerRef.current = window.setTimeout(() => {
        setCleanupSuccess(null);
        cleanupSuccessTimerRef.current = null;
      }, 30000);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to cleanup contacts');
      setCleanupActiveId(null);
      setCleanupAction('');
    } finally {
      setCleanupRunning(false);
      setCleanupProgress({ current: 0, total: 0 });
      setCleanupAction('');
      cleanupCancelRef.current = false;
    }
  };

  const cancelCleanup = () => {
    cleanupCancelRef.current = true;
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Contacts</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Family, neighbors, vendors and emergency numbers</p>
              </div>
              <button
                onClick={openAddModal}
                className="inline-flex h-11 items-center gap-2 ai-gradient-button text-white px-4 rounded-lg text-sm font-medium whitespace-nowrap"
                type="button"
              >
                <Plus className="w-4 h-4" />
                Add Contact
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Family Contacts</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{summary.family}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Service Vendors</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{summary.vendors}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Emergency Contacts</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{summary.emergency}</p>
              </div>
            </div>

            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">AI Cleanup Suggestions</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSuggestCleanup}
                    disabled={cleanupSuggesting}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    {cleanupSuggesting ? 'Suggesting…' : 'Suggest Cleanup'}
                  </button>
                  <button
                    type="button"
                    onClick={bulkCleanup}
                    disabled={!showSuggestions || suggestions.length === 0 || cleanupRunning}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    {cleanupRunning ? 'Processing…' : 'Cleanup All'}
                  </button>
                  {cleanupRunning && (
                    <button
                      type="button"
                      onClick={cancelCleanup}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Heuristics-based detection with optional AI review. {aiAvailable ? 'AI is available.' : 'AI is not available.'}
                {cleanupRunning && cleanupProgress.total > 0 ? ` Processing ${cleanupProgress.current} of ${cleanupProgress.total}.` : ''}
              </p>
              {cleanupSuccess && (
                <div className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300">
                  {cleanupSuccess}
                </div>
              )}
              {cleanupRunning && cleanupProgress.total > 0 && (
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${Math.min(100, Math.round((cleanupProgress.current / cleanupProgress.total) * 100))}%` }}
                  />
                </div>
              )}

              {!showSuggestions ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Click “Suggest Cleanup” to generate cleanup suggestions.
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">No cleanup suggestions right now.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {suggestions.map((s) => (
                    <div
                      key={s.id}
                      className={`rounded-lg border border-[var(--panel-border)] px-3 py-2 flex items-center justify-between gap-3 glass-black-soft ${
                        cleanupActiveId === s.id ? 'bg-amber-50/60 dark:bg-amber-900/20' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{s.contact.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {s.reasons.map(reasonLabel).join(' • ')}
                        </p>
                        {s.ai_reason && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 truncate">
                            AI: {s.ai_reason}
                          </p>
                        )}
                        {cleanupActiveId === s.id && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                            {cleanupAction ? `${cleanupAction}…` : 'Processing…'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(s.contact)}
                          disabled={cleanupRunning}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                        >
                          Fix
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(s.contact)}
                          disabled={cleanupRunning}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => handleIgnoreSuggestion(s.id)}
                          disabled={cleanupRunning}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Contact Directory</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isLoading ? 'Loading…' : `${sortedContacts.length} contacts`}
                </p>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or phone…"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {loadError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                  {loadError}
                </div>
              )}

              <div className="space-y-2">
                <div className="hidden md:grid grid-cols-12 gap-3 px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2">Group</div>
                  <div className="col-span-2">Relation/Role</div>
                  <div className="col-span-2">Phone</div>
                  <div className="col-span-2">Email</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
                {sortedContacts.map((contact) => (
                  <article
                    key={contact.id}
                    className="rounded-lg border border-[var(--panel-border)] px-3 py-2.5 transition hover:bg-black/5 dark:hover:bg-white/10 glass-black-soft"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="col-span-3 min-w-0 flex items-center gap-2.5">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                          {groupIcon(contact.group)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{contact.name}</p>
                          {contact.isEmergency && (
                            <span className="mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              Emergency
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${groupBadgeClass(contact.group)}`}>
                          {contact.group}
                        </span>
                      </div>

                      <div className="col-span-2 text-[11px] text-gray-600 dark:text-gray-300 truncate">
                        {contact.relationOrRole}
                      </div>

                      <div className="col-span-2 text-[11px] font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {contact.phone || '—'}
                      </div>

                      <div className="col-span-2 text-[11px] text-gray-600 dark:text-gray-300 truncate">
                        {contact.email || '—'}
                      </div>

                      <div className="col-span-1 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          title={`Edit ${contact.name}`}
                          onClick={() => openEditModal(contact)}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                          title={`Delete ${contact.name}`}
                          onClick={() => requestDelete(contact)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {contact.address && (
                      <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 truncate md:pl-10">
                        Address: {contact.address}
                      </div>
                    )}
                  </article>
                ))}

                {sortedContacts.length === 0 && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    {isLoading ? 'Loading contacts…' : 'No contacts found'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={handleSaveContact} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {editingContact ? 'Edit Contact' : 'Add Contact'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingContact(null);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  className="md:col-span-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />

                <select
                  value={formData.group}
                  onChange={(e) => setFormData((prev) => ({ ...prev, group: e.target.value as ContactGroup }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Family">Family</option>
                  <option value="Neighbor">Neighbor</option>
                  <option value="Vendor">Vendor</option>
                  <option value="Emergency">Emergency</option>
                </select>

                <input
                  value={formData.relationOrRole}
                  onChange={(e) => setFormData((prev) => ({ ...prev, relationOrRole: e.target.value }))}
                  placeholder="Relation / Role"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />

                <input
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <input
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email (optional)"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <input
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Address / Notes (optional)"
                  className="md:col-span-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={formData.isEmergency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isEmergency: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Mark as emergency contact
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingContact(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg ai-gradient-button text-white"
                >
                  {editingContact ? 'Update Contact' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingContact && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <div className="p-5 space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Delete contact</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to delete <span className="font-semibold">{deletingContact.name}</span>?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingContact(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
