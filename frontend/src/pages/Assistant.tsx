import { useState, useEffect, useRef } from 'react';
import { householdAPI, financeAPI } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useFinanceMonthOptional } from '@/contexts/FinanceMonthContext';
import { Sparkles, Send, User, Bot } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

export default function Assistant() {
  const [activeTab, setActiveTab] = useState('assistant');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Ask Griham. You can ask about your household finance, e.g. \"How is my finance this month?\" or \"Give me a summary\". More modules (events, tasks, health) coming soon.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const financeMonth = useFinanceMonthOptional();
  const month = financeMonth?.month;

  useEffect(() => {
    householdAPI.list().then((list) => {
      if (list.length > 0) setFamilyId(list[0].id);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    const lower = text.toLowerCase();
    const isFinanceQuery =
      lower.includes('finance') ||
      lower.includes('summary') ||
      lower.includes('income') ||
      lower.includes('expense') ||
      lower.includes('balance') ||
      lower.includes('saving') ||
      lower.includes('bill') ||
      lower.includes('month');

    if (isFinanceQuery && familyId) {
      try {
        const res = await financeAPI.getInsights(familyId, month ?? undefined);
        const reply = res?.insights
          ? res.insights
          : "I don't have enough data to generate insights yet. Add accounts and transactions to see a summary.";
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: "Sorry, I couldn't fetch your finance summary. Please try again later." },
        ]);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I can help with finance summaries for now. Try: \"How is my finance this month?\" or \"Give me a summary\". Events, tasks, and health are coming soon.",
        },
      ]);
    }

    setLoading(false);
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

        <main className="flex-1 flex flex-col px-4 md:px-8 py-6 min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl ai-gradient-icon flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--app-fg)]">Ask Griham</h2>
              <p className="text-sm text-[var(--app-fg-muted)]">Household assistant (finance, events, tasks)</p>
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-[var(--panel-border)] glass-black-surface flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-[var(--app-fg)]'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="rounded-xl px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-sm text-[var(--app-fg-muted)]">
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-[var(--panel-border)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your household (e.g. How is my finance this month?)"
                  className="flex-1 rounded-lg border border-[var(--panel-border)] bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-[var(--app-fg)] placeholder:text-[var(--app-fg-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="shrink-0 w-11 h-11 rounded-lg ai-gradient-button text-white flex items-center justify-center disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
