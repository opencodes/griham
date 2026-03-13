import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Plus, CheckSquare, NotebookPen, ShoppingCart, BellRing } from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  dueDate?: string;
  done: boolean;
}

interface NoteItem {
  id: string;
  title: string;
  body: string;
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
}

interface ReminderItem {
  id: string;
  title: string;
  dateTime: string;
}

const toDate = (value?: string) => {
  if (!value) return 'No due date';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const toDateTime = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function Organizer() {
  const [activeTab, setActiveTab] = useState('organizer');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: 'tsk-1', title: 'Pay electricity bill', dueDate: '2026-03-04', done: false },
    { id: 'tsk-2', title: 'Book plumber visit', dueDate: '2026-03-02', done: false },
    { id: 'tsk-3', title: 'Review monthly budget', dueDate: '2026-03-10', done: true },
  ]);
  const [notes] = useState<NoteItem[]>([
    { id: 'nt-1', title: 'Home Maintenance', body: 'Deep cleaning on first weekend. Service AC before summer.' },
    { id: 'nt-2', title: 'School Checklist', body: 'Collect fee receipt and uniform list before Monday.' },
  ]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([
    { id: 'sh-1', name: 'Milk', quantity: '2 packets', checked: false },
    { id: 'sh-2', name: 'Rice', quantity: '5 kg', checked: false },
    { id: 'sh-3', name: 'Detergent', quantity: '1 pack', checked: true },
  ]);
  const [reminders] = useState<ReminderItem[]>([
    { id: 'rm-1', title: 'Parent-teacher meeting', dateTime: '2026-03-06T09:00:00' },
    { id: 'rm-2', title: 'Water filter service', dateTime: '2026-03-09T18:30:00' },
  ]);

  const [formData, setFormData] = useState({
    title: '',
    dueDate: '',
  });

  const pendingTasks = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);
  const shoppingPending = useMemo(() => shopping.filter((i) => !i.checked).length, [shopping]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    setTasks((prev) => [...prev, { id: `tsk-${Date.now()}`, title: formData.title, dueDate: formData.dueDate || undefined, done: false }]);
    setFormData({ title: '', dueDate: '' });
    setShowModal(false);
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Organizer</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tasks, notes, shopping lists and reminders</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex h-11 items-center gap-2 ai-gradient-button text-white px-4 rounded-lg text-sm font-medium whitespace-nowrap"
                type="button"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{pendingTasks}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Shopping Pending</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{shoppingPending}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Reminders</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{reminders.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <section className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Tasks</h3>
                </div>
                <div className="space-y-1.5">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))}
                      className="w-full text-left rounded-lg border border-[var(--panel-border)] px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 transition glass-black-soft"
                    >
                      <p className={`text-sm font-medium ${task.done ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-100'}`}>{task.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{toDate(task.dueDate)}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <NotebookPen className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Notes</h3>
                </div>
                <div className="space-y-1.5">
                  {notes.map((note) => (
                    <article key={note.id} className="rounded-lg border border-[var(--panel-border)] px-3 py-2.5 glass-black-soft">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{note.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{note.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Shopping List</h3>
                </div>
                <div className="space-y-1.5">
                  {shopping.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setShopping((prev) => prev.map((s) => (s.id === item.id ? { ...s, checked: !s.checked } : s)))}
                      className="w-full text-left rounded-lg border border-[var(--panel-border)] px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 transition glass-black-soft"
                    >
                      <p className={`text-sm font-medium ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-100'}`}>{item.name}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{item.quantity}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BellRing className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Reminders</h3>
                </div>
                <div className="space-y-1.5">
                  {reminders.map((reminder) => (
                    <article key={reminder.id} className="rounded-lg border border-[var(--panel-border)] px-3 py-2.5 glass-black-soft">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{reminder.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{toDateTime(reminder.dateTime)}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={addTask} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add Task</h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Close
                </button>
              </div>

              <input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

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
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
