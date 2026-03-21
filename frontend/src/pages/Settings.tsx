import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAppSettings, type AppSettings } from '@/contexts/AppSettingsContext';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function listHasValue(values: string[], value: string, exceptIndex?: number) {
  const needle = normalize(value);
  return values.some((item, index) => index !== exceptIndex && normalize(item) === needle);
}

function ListSettingEditor({
  title,
  values,
  onChange,
}: {
  title: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [newValue, setNewValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const addValue = () => {
    const candidate = newValue.trim();
    if (!candidate || listHasValue(values, candidate)) return;
    onChange([...values, candidate]);
    setNewValue('');
  };

  const removeValue = (index: number) => {
    onChange(values.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingValue('');
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingValue(values[index]);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const candidate = editingValue.trim();
    if (!candidate || listHasValue(values, candidate, editingIndex)) return;
    onChange(values.map((item, index) => (index === editingIndex ? candidate : item)));
    setEditingIndex(null);
    setEditingValue('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  return (
    <section className="h-full bg-white/60 dark:bg-white/5 p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h3>

      <div className="flex items-center gap-2">
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Add a value"
        />
        <button type="button" onClick={addValue} className="px-3 py-2 rounded-lg ai-gradient-button text-white text-sm">
          Add
        </button>
      </div>

      <div className="space-y-0">
        {values.map((value, index) => (
          <div key={`${value}-${index}`} className="flex items-center gap-2 p-2 border-b border-[var(--panel-border)] last:border-b-0">
            {editingIndex === index ? (
              <>
                <input
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="button" onClick={saveEdit} className="px-2.5 py-1.5 rounded-md bg-indigo-600 text-white text-xs">Save</button>
                <button type="button" onClick={cancelEdit} className="px-2.5 py-1.5 rounded-md border border-[var(--panel-border)] text-xs text-gray-700 dark:text-gray-200">Cancel</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{value}</span>
                <button type="button" onClick={() => startEditing(index)} className="px-2.5 py-1.5 rounded-md border border-[var(--panel-border)] text-xs text-gray-700 dark:text-gray-200">Edit</button>
                <button type="button" onClick={() => removeValue(index)} className="px-2.5 py-1.5 rounded-md border border-red-200 text-xs text-red-700 dark:border-red-800 dark:text-red-300">Delete</button>
              </>
            )}
          </div>
        ))}
        {values.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">No values added yet.</p>
        )}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('settings');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { settings, updateSettings, resetSettings } = useAppSettings();

  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saveMessage, setSaveMessage] = useState('');

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(draft);
    setSaveMessage('Settings saved. All participant dropdowns now use these values.');
  };

  const restoreDefaults = () => {
    resetSettings();
    const defaults: AppSettings = {
      participantRsvpStatuses: ['Pending Invitation', 'Invited', 'Attended'],
      participantGenders: ['Female', 'Male', 'Non-binary', 'Prefer not to say'],
      participantAgeGroups: ['Child', 'Teen', 'Adult', 'Senior'],
      participantGiftOptions: ['Flowers', 'Cash Gift', 'Gift Card', 'Home Decor'],
    };
    setDraft(defaults);
    setSaveMessage('Defaults restored.');
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
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage reusable dropdown values used in participant forms across the app.
              </p>
            </div>

            <form onSubmit={saveSettings} className="rounded-xl border border-[var(--panel-border)] glass-black-surface p-5 space-y-5">
              {saveMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {saveMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <ListSettingEditor
                  title="RSVP Statuses"
                  values={draft.participantRsvpStatuses}
                  onChange={(participantRsvpStatuses) => setDraft((prev) => ({ ...prev, participantRsvpStatuses }))}
                />

                <ListSettingEditor
                  title="Gender Options"
                  values={draft.participantGenders}
                  onChange={(participantGenders) => setDraft((prev) => ({ ...prev, participantGenders }))}
                />

                <ListSettingEditor
                  title="Age Group Options"
                  values={draft.participantAgeGroups}
                  onChange={(participantAgeGroups) => setDraft((prev) => ({ ...prev, participantAgeGroups }))}
                />

                <ListSettingEditor
                  title="Gift Options"
                  values={draft.participantGiftOptions}
                  onChange={(participantGiftOptions) => setDraft((prev) => ({ ...prev, participantGiftOptions }))}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={restoreDefaults} className="btn-secondary">
                  Restore Defaults
                </button>
                <button type="submit" disabled={!isDirty} className="px-4 py-2 rounded-lg ai-gradient-button text-white disabled:opacity-50">
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
