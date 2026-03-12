import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Plus, MessageSquare, Bell, AlertTriangle, Send } from 'lucide-react';

type MessageType = 'Message' | 'Notification' | 'Alert';

interface MessageItem {
  id: string;
  title: string;
  body: string;
  type: MessageType;
  from: string;
  createdAt: string;
  unread: boolean;
}

const toDateTime = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const typeStyle = (type: MessageType) => {
  if (type === 'Alert') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (type === 'Notification') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
};

export default function Messaging() {
  const [activeTab, setActiveTab] = useState('messages');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'msg-1',
      title: 'Water bill reminder',
      body: 'Water bill is due in 2 days. Please review and pay.',
      type: 'Notification',
      from: 'Finance Bot',
      createdAt: '2026-02-28T09:30:00',
      unread: true,
    },
    {
      id: 'msg-2',
      title: 'Gate lock issue',
      body: 'Main gate lock seems loose. Need a locksmith visit.',
      type: 'Alert',
      from: 'Mom',
      createdAt: '2026-02-27T20:15:00',
      unread: true,
    },
    {
      id: 'msg-3',
      title: 'Groceries done',
      body: 'Monthly groceries are stocked. Invoice kept in kitchen drawer.',
      type: 'Message',
      from: 'John Doe',
      createdAt: '2026-02-26T18:45:00',
      unread: false,
    },
  ]);

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'Message' as MessageType,
  });

  const stats = useMemo(
    () => ({
      unread: messages.filter((m) => m.unread).length,
      alerts: messages.filter((m) => m.type === 'Alert').length,
      notifications: messages.filter((m) => m.type === 'Notification').length,
    }),
    [messages]
  );

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [messages]
  );

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.body) return;

    setMessages((prev) => [
      {
        id: `msg-${Date.now()}`,
        title: formData.title,
        body: formData.body,
        type: formData.type,
        from: 'You',
        createdAt: new Date().toISOString(),
        unread: true,
      },
      ...prev,
    ]);

    setFormData({ title: '', body: '', type: 'Message' });
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Messaging</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Internal messages, notifications and critical alerts</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex h-11 items-center gap-2 ai-gradient-button text-white px-4 rounded-lg text-sm font-medium whitespace-nowrap"
                type="button"
              >
                <Plus className="w-4 h-4" />
                New Message
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Unread</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{stats.unread}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Alerts</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{stats.alerts}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Notifications</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{stats.notifications}</p>
              </div>
            </div>

            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Inbox</h3>
              </div>

              <div className="space-y-1.5">
                {sortedMessages.map((msg) => (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, unread: false } : m)))}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition ${
                      msg.unread
                        ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-900/20'
                        : 'border-[var(--panel-border)] glass-black-soft hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeStyle(msg.type)}`}>
                            {msg.type}
                          </span>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{msg.title}</p>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{msg.body}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{msg.from} • {toDateTime(msg.createdAt)}</p>
                      </div>
                      {msg.type === 'Alert' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      ) : msg.type === 'Notification' ? (
                        <Bell className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={sendMessage} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">New Message</h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Close
                </button>
              </div>

              <select
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as MessageType }))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Message">Message</option>
                <option value="Notification">Notification</option>
                <option value="Alert">Alert</option>
              </select>

              <input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <textarea
                value={formData.body}
                onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Message body"
                rows={4}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                required
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg ai-gradient-button text-white"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
