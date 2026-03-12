import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Plus, Phone, ShieldAlert, User, Building2, Users } from 'lucide-react';

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
  const [showModal, setShowModal] = useState(false);

  const [contacts, setContacts] = useState<ContactItem[]>([
    {
      id: 'cnt-1',
      name: 'Rajesh Kumar Jha',
      group: 'Family',
      relationOrRole: 'Father',
      phone: '+91 98xxxxxx10',
      email: 'rajesh@example.com',
      isEmergency: true,
    },
    {
      id: 'cnt-2',
      name: 'Sharma Ji',
      group: 'Neighbor',
      relationOrRole: 'Flat 402',
      phone: '+91 98xxxxxx22',
      address: 'Tower B, 4th Floor',
      isEmergency: false,
    },
    {
      id: 'cnt-3',
      name: 'Ravi Electrician',
      group: 'Vendor',
      relationOrRole: 'Electric Repair',
      phone: '+91 98xxxxxx45',
      isEmergency: true,
    },
    {
      id: 'cnt-4',
      name: 'City Ambulance',
      group: 'Emergency',
      relationOrRole: '24x7 Emergency',
      phone: '108',
      isEmergency: true,
    },
  ]);

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
      family: contacts.filter((c) => c.group === 'Family').length,
      vendors: contacts.filter((c) => c.group === 'Vendor').length,
      emergency: contacts.filter((c) => c.isEmergency || c.group === 'Emergency').length,
    };
  }, [contacts]);

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      return a.name.localeCompare(b.name);
    });
  }, [contacts]);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.relationOrRole) return;

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

    setFormData({
      name: '',
      group: 'Family',
      relationOrRole: '',
      phone: '',
      email: '',
      address: '',
      isEmergency: false,
    });
    setShowModal(false);
  };

  return (
    <div className="flex h-screen overflow-hidden app-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Contacts</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Family, neighbors, vendors and emergency numbers</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Contact Directory</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{sortedContacts.length} contacts</p>
              </div>

              <div className="space-y-1.5">
                {sortedContacts.map((contact) => (
                  <article
                    key={contact.id}
                    className="rounded-lg border border-[var(--panel-border)] px-3 py-2.5 transition hover:bg-black/5 dark:hover:bg-white/10 glass-black-soft"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex items-start gap-2.5">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                          {groupIcon(contact.group)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${groupBadgeClass(contact.group)}`}>
                              {contact.group}
                            </span>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{contact.name}</p>
                            {contact.isEmergency && (
                              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                Emergency
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {contact.relationOrRole} • {contact.phone}
                            {contact.email ? ` • ${contact.email}` : ''}
                            {contact.address ? ` • ${contact.address}` : ''}
                          </p>
                        </div>
                      </div>

                      <a
                        href={`tel:${contact.phone}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={`Call ${contact.name}`}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </article>
                ))}

                {sortedContacts.length === 0 && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">No contacts added yet</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={handleAddContact} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add Contact</h3>
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
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg ai-gradient-button text-white"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
