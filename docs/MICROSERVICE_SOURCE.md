# Microservice source changes (diff)

Current working tree changes vs HEAD (all staged/unstaged, excluding .md files).

**11 files touched:** .gitignore, frontend/src/lib/api.ts, frontend/src/mirage/server.ts, frontend/src/pages/Bills.tsx, frontend/src/pages/Dashboard.tsx, frontend/src/pages/FinanceOverview.tsx, frontend/src/pages/Transactions.tsx, microservice/src/modules/finance/aggregate.ts, microservice/src/modules/finance/controller.ts, microservice/src/modules/finance/routes.ts, microservice/src/modules/finance/service.ts

File Changes

```diff
diff --git a/.gitignore b/.gitignore
index 2e2ef35..8ba65e6 100644
--- a/.gitignore
+++ b/.gitignore
@@ -83,3 +83,7 @@ temp/
 # yarn.lock
 # composer.lock
  
+.cursor/commands/diff.md
+.cursor/rules/diff-format.mdc
+docs/MICROSERVICE_SOURCE.md
+docs/MICROSERVICE_SOURCE.md
diff --git a/frontend/src/lib/api.ts b/frontend/src/lib/api.ts
index 1f8e745..f8fda0f 100644
--- a/frontend/src/lib/api.ts
+++ b/frontend/src/lib/api.ts
@@ -73,6 +73,22 @@ export interface Transaction {
   created_by_name?: string;
 }
 
+export interface TransactionSearchSpec {
+  description_contains?: string;
+  category?: string;
+  type?: 'income' | 'expense';
+  date_from?: string;
+  date_to?: string;
+  sort?: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
+}
+
+export interface CategoryInsightItem {
+  category: string;
+  amount: number;
+  percent: number;
+  summary: string;
+}
+
 export interface Bill {
   id: string;
   family_id: string;
@@ -261,6 +277,55 @@ export const financeAPI = {
     }>(`/finance/ai/insights/${familyId}${params}`);
     return data;
   },
+  // AI risk suggestions for Dashboard Risk Radar
+  getRiskSuggestions: async (familyId: string, month?: string) => {
+    const params = month ? `?month=${month}` : '';
+    const { data } = await api.get<{ data: { risks: string[]; ai_available: boolean } }>(
+      `/finance/ai/risk-suggestions/${familyId}${params}`
+    );
+    return data.data ?? { risks: [], ai_available: false };
+  },
+  getCategoryInsights: async (familyId: string, month?: string) => {
+    const params = month ? `?month=${month}` : '';
+    const { data } = await api.get<{ data: { insights: CategoryInsightItem[]; ai_available: boolean } }>(
+      `/finance/ai/category-insights/${familyId}${params}`
+    );
+    return data.data ?? { insights: [], ai_available: false };
+  },
+  getNarrativeSummary: async (familyId: string, month?: string) => {
+    const params = month ? `?month=${month}` : '';
+    const { data } = await api.get<{ data: { narrative: string; ai_available: boolean } }>(
+      `/finance/ai/narrative-summary/${familyId}${params}`
+    );
+    return data.data ?? { narrative: '', ai_available: false };
+  },
+  askAboutMonth: async (
+    familyId: string,
+    payload: { question: string; month?: string }
+  ): Promise<{ answer: string; ai_available: boolean }> => {
+    const { data } = await api.post<{ data: { answer: string; ai_available: boolean } }>(
+      `/finance/ai/ask-month/${familyId}`,
+      payload
+    );
+    return data.data ?? { answer: '', ai_available: false };
+  },
+  getCashflowTips: async (familyId: string, month?: string) => {
+    const params = month ? `?month=${month}` : '';
+    const { data } = await api.get<{ data: { tips: string[]; ai_available: boolean } }>(
+      `/finance/ai/cashflow-tips/${familyId}${params}`
+    );
+    return data.data ?? { tips: [], ai_available: false };
+  },
+  interpretSearch: async (
+    familyId: string,
+    payload: { q: string; month?: string }
+  ): Promise<{ spec: TransactionSearchSpec; ai_available: boolean }> => {
+    const { data } = await api.post<{ data: { spec: TransactionSearchSpec; ai_available: boolean } }>(
+      `/finance/ai/interpret-search/${familyId}`,
+      payload
+    );
+    return data.data ?? { spec: {}, ai_available: false };
+  },
   getSavingsTips: async (familyId: string) => {
     const { data } = await api.get<{ tips: string[] | null; ai_available: boolean }>(`/finance/ai/savings-tips/${familyId}`);
     return data;
diff --git a/frontend/src/mirage/server.ts b/frontend/src/mirage/server.ts
index 43c4005..f27e329 100644
--- a/frontend/src/mirage/server.ts
+++ b/frontend/src/mirage/server.ts
@@ -778,6 +778,161 @@ export function makeServer({ environment = 'development' } = {}) {
         return { data: { data, insights, ai_available: true } };
       });
 
+      this.get('/finance/ai/risk-suggestions/:familyId', (_schema, request) => {
+        const familyId = request.params.familyId;
+        const accounts = db.accounts.filter((a) => a.family_id === familyId);
+        const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
+        let transactions = db.transactions.filter((t) => t.family_id === familyId);
+        const q = request.queryParams;
+        const monthStr = (q?.month as string) || new Date().toISOString().slice(0, 7);
+        const [y, m] = monthStr.split('-').map(Number);
+        const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
+        const end = new Date(y, m, 0).toISOString().slice(0, 10);
+        transactions = transactions.filter((t) => t.transaction_date >= start && t.transaction_date <= end);
+        const total_income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
+        const total_expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
+        const bills = db.bills.filter((b) => b.family_id === familyId && b.status === 'pending');
+        const billsTotal = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
+        const risks: string[] = [];
+        if (total_expense > total_balance && total_balance > 0) {
+          risks.push('Monthly expenses exceed current balance; consider delaying non-essential spending.');
+        }
+        if (bills.length > 0 && billsTotal > totalBalance) {
+          risks.push(`Bills due total ₹${billsTotal.toLocaleString()} but balance is ₹${totalBalance.toLocaleString()}.`);
+        }
+        if (total_income > 0 && total_expense / total_income > 0.9) {
+          risks.push('Spending is over 90% of income this month; savings may be at risk.');
+        }
+        return { data: { risks, ai_available: true } };
+      });
+
+      this.post('/finance/ai/ask-month/:familyId', (_schema, request) => {
+        const body = JSON.parse(request.requestBody || '{}');
+        const q = ((body.question || '') as string).toLowerCase();
+        const familyId = request.params.familyId;
+        const monthStr = (body.month as string) || new Date().toISOString().slice(0, 7);
+        const [y, m] = monthStr.split('-').map(Number);
+        const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
+        const end = new Date(y, m, 0).toISOString().slice(0, 10);
+        const txs = db.transactions.filter(
+          (t) => t.family_id === familyId && t.transaction_date >= start && t.transaction_date <= end
+        );
+        const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
+        const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
+        const byCat = new Map<string, number>();
+        txs.filter((t) => t.type === 'expense').forEach((t) => {
+          const cat = t.category || 'Other';
+          byCat.set(cat, (byCat.get(cat) || 0) + t.amount);
+        });
+        const top3 = Array.from(byCat.entries())
+          .sort((a, b) => b[1] - a[1])
+          .slice(0, 3)
+          .map(([c]) => c);
+        let answer = `This month: income ₹${income.toLocaleString()}, expenses ₹${expense.toLocaleString()}.`;
+        if (/\btop\s*3|top three|biggest|largest\b/.test(q) && top3.length > 0) {
+          answer += ` Top 3 categories: ${top3.join(', ')}.`;
+        }
+        if (/\bwhy.*(high|expense|spend)\b|\bexpense.*high\b/.test(q)) {
+          answer += ` Expense is driven mainly by ${top3[0] || 'general spending'}.`;
+        }
+        return { data: { answer, ai_available: true } };
+      });
+
+      this.get('/finance/ai/cashflow-tips/:familyId', (_schema, request) => {
+        const familyId = request.params.familyId;
+        const bills = db.bills.filter((b) => b.family_id === familyId && b.status === 'pending');
+        const accounts = db.accounts.filter((a) => a.family_id === familyId);
+        const balance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
+        const now = Date.now();
+        const in5 = 5 * 24 * 60 * 60 * 1000;
+        const dueIn5 = bills.filter((b) => {
+          const t = new Date(b.due_date).getTime();
+          return t >= now && t <= now + in5;
+        });
+        const totalDue5 = dueIn5.reduce((s, b) => s + Number(b.amount || 0), 0);
+        const shortfall = Math.max(0, totalDue5 - balance);
+        const tips: string[] = [];
+        if (dueIn5.length > 0) {
+          tips.push(`${dueIn5.length} bill(s) due in 5 days${shortfall > 0 ? `; balance might be short by ₹${shortfall.toLocaleString()}` : ''}.`);
+        }
+        if (bills.length >= 2 && balance < bills.reduce((s, b) => s + Number(b.amount || 0), 0)) {
+          const sorted = [...bills].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
+          tips.push(`Consider paying ${sorted[0].bill_name} (${sorted[0].due_date}) before ${sorted[1].bill_name}.`);
+        }
+        return { data: { tips, ai_available: true } };
+      });
+
+      this.get('/finance/ai/narrative-summary/:familyId', (_schema, request) => {
+        const familyId = request.params.familyId;
+        const monthStr = (request.queryParams?.month as string) || new Date().toISOString().slice(0, 7);
+        const [y, m] = monthStr.split('-').map(Number);
+        const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
+        const end = new Date(y, m, 0).toISOString().slice(0, 10);
+        const txs = db.transactions.filter(
+          (t) => t.family_id === familyId && t.transaction_date >= start && t.transaction_date <= end
+        );
+        const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
+        const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
+        const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
+        const bills = db.bills.filter((b) => b.family_id === familyId && b.status === 'pending').length;
+        const narrative =
+          `This month income is ₹${income.toLocaleString()} and expenses ₹${expense.toLocaleString()}; savings rate ${savingsRate.toFixed(1)}%. ${bills} pending bill(s).`;
+        return { data: { narrative, ai_available: true } };
+      });
+
+      this.get('/finance/ai/category-insights/:familyId', (_schema, request) => {
+        const familyId = request.params.familyId;
+        const monthStr = (request.queryParams?.month as string) || new Date().toISOString().slice(0, 7);
+        const [y, m] = monthStr.split('-').map(Number);
+        const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
+        const end = new Date(y, m, 0).toISOString().slice(0, 10);
+        const txs = db.transactions.filter(
+          (t) => t.family_id === familyId && t.type === 'expense' && t.transaction_date >= start && t.transaction_date <= end
+        );
+        const byCat = new Map<string, number>();
+        let total = 0;
+        txs.forEach((t) => {
+          const cat = t.category || 'Other';
+          const amt = Number(t.amount || 0);
+          byCat.set(cat, (byCat.get(cat) || 0) + amt);
+          total += amt;
+        });
+        const insights = Array.from(byCat.entries())
+          .map(([category, amount]) => ({
+            category,
+            amount,
+            percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
+            summary: `${category} is ${total > 0 ? Math.round((amount / total) * 1000) / 10 : 0}% of expenses this month.`,
+          }))
+          .sort((a, b) => b.amount - a.amount)
+          .slice(0, 8);
+        return { data: { insights, ai_available: true } };
+      });
+
+      this.post('/finance/ai/interpret-search/:familyId', (_schema, request) => {
+        const body = JSON.parse(request.requestBody || '{}');
+        const q = ((body.q || '') as string).toLowerCase().trim();
+        const spec: Record<string, unknown> = {};
+        if (/\b(last\s+week|past\s+week)\b/.test(q)) {
+          const now = new Date();
+          const day = now.getDay();
+          const diffToMonday = day === 0 ? 6 : day - 1;
+          const lastMonday = new Date(now);
+          lastMonday.setDate(now.getDate() - diffToMonday - 7);
+          const lastSunday = new Date(lastMonday);
+          lastSunday.setDate(lastMonday.getDate() + 6);
+          spec.date_from = lastMonday.toISOString().slice(0, 10);
+          spec.date_to = lastSunday.toISOString().slice(0, 10);
+        }
+        if (/\b(biggest|largest|highest)\b.*\b(expense|spend)\b/.test(q) || /\bexpense.*\b(biggest|largest)\b/.test(q)) {
+          spec.type = 'expense';
+          spec.sort = 'amount_high';
+        }
+        const words = q.replace(/\b(last week|this month|biggest|expense|income)\b/gi, '').trim().split(/\s+/).filter(Boolean);
+        if (words.length > 0) spec.description_contains = words[0];
+        return { data: { spec, ai_available: true } };
+      });
+
       this.get('/finance/ai/savings-tips/:familyId', () => {
         const tips = [
           'Track small daily expenses to find easy cuts.',
diff --git a/frontend/src/pages/Bills.tsx b/frontend/src/pages/Bills.tsx
index 595d3a4..a052ad8 100644
--- a/frontend/src/pages/Bills.tsx
+++ b/frontend/src/pages/Bills.tsx
@@ -20,6 +20,8 @@ export default function Bills() {
   const [showModal, setShowModal] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const [suggestCategoryLoading, setSuggestCategoryLoading] = useState(false);
+  const [cashflowTips, setCashflowTips] = useState<string[]>([]);
+  const [cashflowTipsLoading, setCashflowTipsLoading] = useState(false);
   const [formData, setFormData] = useState({
     bill_name: '',
     category: '',
@@ -39,6 +41,19 @@ export default function Bills() {
     }
   }, [familyId]);
 
+  useEffect(() => {
+    if (!familyId) return;
+    let cancelled = false;
+    setCashflowTipsLoading(true);
+    setCashflowTips([]);
+    financeAPI.getCashflowTips(familyId).then((res) => {
+      if (!cancelled && Array.isArray(res?.tips)) setCashflowTips(res.tips);
+    }).catch(() => {}).finally(() => {
+      if (!cancelled) setCashflowTipsLoading(false);
+    });
+    return () => { cancelled = true; };
+  }, [familyId]);
+
   const loadFamily = async () => {
     try {
       const families = await householdAPI.list();
@@ -175,6 +190,32 @@ export default function Bills() {
               )}
             </div>
 
+            {/* Due-date / cash-flow tips */}
+            {familyId && (cashflowTipsLoading || cashflowTips.length > 0) && (
+              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
+                <div className="flex items-center gap-2 mb-2">
+                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
+                  <h3 className="text-sm font-semibold text-[var(--app-fg)]">Cash-flow tips</h3>
+                  {cashflowTipsLoading && (
+                    <span className="text-xs text-[var(--app-fg-muted)]">Loading…</span>
+                  )}
+                </div>
+                {cashflowTips.length > 0 && (
+                  <ul className="space-y-1.5">
+                    {cashflowTips.map((tip, idx) => (
+                      <li
+                        key={idx}
+                        className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/20 px-2.5 py-1.5 text-sm text-amber-800 dark:text-amber-200"
+                      >
+                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
+                        {tip}
+                      </li>
+                    ))}
+                  </ul>
+                )}
+              </div>
+            )}
+
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {bills.map((bill) => (
                 <div key={bill.id} className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-6">
diff --git a/frontend/src/pages/Dashboard.tsx b/frontend/src/pages/Dashboard.tsx
index 0c44bcd..1c22d65 100644
--- a/frontend/src/pages/Dashboard.tsx
+++ b/frontend/src/pages/Dashboard.tsx
@@ -43,6 +43,8 @@ export default function Dashboard() {
   const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0 });
   const [aiInsights, setAiInsights] = useState<string | null>(null);
   const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
+  const [aiRiskSuggestions, setAiRiskSuggestions] = useState<string[]>([]);
+  const [aiRiskSuggestionsLoading, setAiRiskSuggestionsLoading] = useState(false);
 
   const month = financeMonth?.month;
 
@@ -68,21 +70,26 @@ export default function Dashboard() {
         setCards([]);
         setSummary({ total_income: 0, total_expense: 0, balance: 0 });
         setAiInsights(null);
+        setAiRiskSuggestions([]);
         return;
       }
 
       const familyId = data[0].id;
       setAiInsightsLoading(true);
+      setAiRiskSuggestionsLoading(true);
       setAiInsights(null);
-      const [members, accountData, transactionData, billData, cardData, summaryData, insightsResult] = await Promise.all([
-        householdAPI.listMembers(familyId).catch(() => []),
-        financeAPI.listAccounts(familyId).catch(() => []),
-        financeAPI.listTransactions(familyId, month ? { month } : undefined).catch(() => []),
-        financeAPI.listBills(familyId).catch(() => []),
-        financeAPI.listCards(familyId).catch(() => []),
-        financeAPI.getSummary(familyId, month).catch(() => ({ total_income: 0, total_expense: 0, balance: 0 })),
-        financeAPI.getInsights(familyId, month ?? undefined).catch(() => ({ insights: null, ai_available: false })),
-      ]);
+      setAiRiskSuggestions([]);
+      const [members, accountData, transactionData, billData, cardData, summaryData, insightsResult, riskResult] =
+        await Promise.all([
+          householdAPI.listMembers(familyId).catch(() => []),
+          financeAPI.listAccounts(familyId).catch(() => []),
+          financeAPI.listTransactions(familyId, month ? { month } : undefined).catch(() => []),
+          financeAPI.listBills(familyId).catch(() => []),
+          financeAPI.listCards(familyId).catch(() => []),
+          financeAPI.getSummary(familyId, month).catch(() => ({ total_income: 0, total_expense: 0, balance: 0 })),
+          financeAPI.getInsights(familyId, month ?? undefined).catch(() => ({ insights: null, ai_available: false })),
+          financeAPI.getRiskSuggestions(familyId, month ?? undefined).catch(() => ({ risks: [], ai_available: false })),
+        ]);
 
       setMembersCount(Array.isArray(members) ? members.length : 0);
       setAccounts(accountData);
@@ -92,6 +99,8 @@ export default function Dashboard() {
       setSummary(summaryData);
       setAiInsights(insightsResult?.insights ?? null);
       setAiInsightsLoading(false);
+      setAiRiskSuggestions(Array.isArray(riskResult?.risks) ? riskResult.risks : []);
+      setAiRiskSuggestionsLoading(false);
     } catch (error) {
       console.error('Failed to load dashboard data', error);
     } finally {
@@ -127,72 +136,106 @@ export default function Dashboard() {
   const overdueBills = bills.filter(
     (bill) => bill.status === 'pending' && new Date(bill.due_date).getTime() < Date.now()
   ).length;
+  const now = Date.now();
+  const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;
+  const billsDueThisWeek = bills.filter((bill) => {
+    if (bill.status !== 'pending') return false;
+    const t = new Date(bill.due_date).getTime();
+    return t >= now && t <= oneWeekFromNow;
+  }).length;
 
-  const moduleCards = [
-    {
-      key: 'finance',
-      title: 'Finance',
-      icon: Wallet,
-      path: '/finance',
-      tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
-      primary: `₹${totalBalance.toFixed(2)}`,
-      secondary: `${transactions.length} transactions, ${pendingBills} pending bills`,
-    },
-    {
-      key: 'events',
-      title: 'Events',
-      icon: Calendar,
-      path: '/events',
-      tone: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30',
-      primary: '4 upcoming',
-      secondary: '2 recurring occasions',
-    },
-    {
-      key: 'assets',
-      title: 'Assets',
-      icon: Package,
-      path: '/assets',
-      tone: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
-      primary: '6 tracked',
-      secondary: '1 expiry in 30 days',
-    },
-    {
-      key: 'health',
-      title: 'Health',
-      icon: Heart,
-      path: '/health',
-      tone: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
-      primary: '2 appointments',
-      secondary: '1 vaccine due',
-    },
-    {
-      key: 'contacts',
-      title: 'Contacts',
-      icon: ContactRound,
-      path: '/contacts',
-      tone: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
-      primary: '18 contacts',
-      secondary: '3 emergency entries',
-    },
-    {
-      key: 'organizer',
-      title: 'Organizer',
-      icon: ListTodo,
-      path: '/organizer',
-      tone: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
-      primary: '5 pending tasks',
-      secondary: '3 reminders this week',
-    },
-    {
-      key: 'messages',
-      title: 'Messages',
-      icon: MessageSquare,
-      path: '/messages',
-      tone: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
-      primary: '4 unread',
-      secondary: '1 critical alert',
-    },
-  ];
+  const moduleCards = useMemo(() => {
+    const financePulse =
+      overdueBills > 0
+        ? `${overdueBills} bill${overdueBills > 1 ? 's' : ''} overdue; review payments.`
+        : billsDueThisWeek > 0
+          ? `Healthy; ${billsDueThisWeek} bill${billsDueThisWeek > 1 ? 's' : ''} due this week.`
+          : pendingBills > 0
+            ? `Healthy; ${pendingBills} pending bill${pendingBills > 1 ? 's' : ''}.`
+            : transactions.length === 0
+              ? 'Add transactions to track spending.'
+              : savingsRate >= 20
+                ? 'Healthy; savings on track.'
+                : savingsRate >= 10
+                  ? 'OK; consider boosting savings.'
+                  : monthlyIncome > 0
+                    ? 'Low savings rate; review expenses.'
+                    : 'No income logged this month.';
+
+    return [
+      {
+        key: 'finance',
+        title: 'Finance',
+        icon: Wallet,
+        path: '/finance',
+        tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
+        primary: `₹${totalBalance.toFixed(2)}`,
+        pulseText: financePulse,
+      },
+      {
+        key: 'events',
+        title: 'Events',
+        icon: Calendar,
+        path: '/events',
+        tone: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30',
+        primary: '4 upcoming',
+        pulseText: '4 upcoming events, 2 recurring occasions.',
+      },
+      {
+        key: 'assets',
+        title: 'Assets',
+        icon: Package,
+        path: '/assets',
+        tone: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
+        primary: '6 tracked',
+        pulseText: '6 assets tracked; 1 expiry in 30 days.',
+      },
+      {
+        key: 'health',
+        title: 'Health',
+        icon: Heart,
+        path: '/health',
+        tone: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
+        primary: '2 appointments',
+        pulseText: '2 appointments; 1 vaccine due.',
+      },
+      {
+        key: 'contacts',
+        title: 'Contacts',
+        icon: ContactRound,
+        path: '/contacts',
+        tone: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
+        primary: '18 contacts',
+        pulseText: '18 contacts; 3 emergency entries.',
+      },
+      {
+        key: 'organizer',
+        title: 'Organizer',
+        icon: ListTodo,
+        path: '/organizer',
+        tone: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
+        primary: '5 pending tasks',
+        pulseText: '5 pending tasks; 3 reminders this week.',
+      },
+      {
+        key: 'messages',
+        title: 'Messages',
+        icon: MessageSquare,
+        path: '/messages',
+        tone: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
+        primary: '4 unread',
+        pulseText: '4 unread; 1 critical alert.',
+      },
+    ];
+  }, [
+    overdueBills,
+    billsDueThisWeek,
+    pendingBills,
+    transactions.length,
+    savingsRate,
+    monthlyIncome,
+    totalBalance,
+  ]);
 
   const risks = useMemo(() => {
     const items: string[] = [];
@@ -200,8 +243,17 @@ export default function Dashboard() {
     if (savingsRate < 10 && monthlyIncome > 0) items.push('Monthly savings rate is below 10%');
     if (transactions.length === 0) items.push('No finance transactions logged yet');
     if (households.length === 0) items.push('Create your first family to activate modules');
+    const aiRisks = (aiRiskSuggestions || []).filter((s) => s.trim().length > 0);
+    const seen = new Set(items.map((s) => s.toLowerCase()));
+    for (const r of aiRisks) {
+      const key = r.trim().toLowerCase();
+      if (key && !seen.has(key)) {
+        seen.add(key);
+        items.push(r.trim());
+      }
+    }
     return items;
-  }, [overdueBills, savingsRate, monthlyIncome, transactions.length, households.length]);
+  }, [overdueBills, savingsRate, monthlyIncome, transactions.length, households.length, aiRiskSuggestions]);
 
   const handleMenuToggle = () => {
     setMobileMenuOpen(!mobileMenuOpen);
@@ -310,7 +362,7 @@ export default function Dashboard() {
                           </div>
                           <p className="mt-3 text-sm font-semibold text-[var(--app-fg)]">{module.title}</p>
                           <p className="mt-1 text-sm font-medium text-[var(--app-fg)]">{module.primary}</p>
-                          <p className="mt-0.5 text-xs text-[var(--app-fg-muted)]">{module.secondary}</p>
+                          <p className="mt-0.5 text-xs text-[var(--app-fg-muted)]">{module.pulseText}</p>
                         </button>
                       );
                     })}
@@ -320,8 +372,11 @@ export default function Dashboard() {
                 <div className="rounded-xl p-5 glass-black-surface border border-[var(--panel-border)]">
                   <h3 className="text-lg font-semibold text-[var(--app-fg)]">Risk Radar</h3>
                   <p className="text-xs text-[var(--app-fg-muted)] mt-1">
-                    Actionable alerts across household operations.
+                    Actionable alerts: fixed rules + AI suggestions (spending vs last month, bills vs balance).
                   </p>
+                  {aiRiskSuggestionsLoading && (
+                    <p className="mt-2 text-xs text-[var(--app-fg-muted)]">Loading AI risk suggestions…</p>
+                  )}
                   <div className="mt-4 space-y-2">
                     {risks.length > 0 ? (
                       risks.map((risk, idx) => (
@@ -333,11 +388,11 @@ export default function Dashboard() {
                           <p className="text-xs text-amber-800 dark:text-amber-200">{risk}</p>
                         </div>
                       ))
-                    ) : (
+                    ) : !aiRiskSuggestionsLoading ? (
                       <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 p-2.5">
                         <p className="text-xs text-emerald-700 dark:text-emerald-300">No major operational risks detected.</p>
                       </div>
-                    )}
+                    ) : null}
                     {!aiInsightsLoading && aiInsights && (
                       <div className="flex items-start gap-2 rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/20 p-2.5">
                         <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
diff --git a/frontend/src/pages/FinanceOverview.tsx b/frontend/src/pages/FinanceOverview.tsx
index 178ca6d..b71532d 100644
--- a/frontend/src/pages/FinanceOverview.tsx
+++ b/frontend/src/pages/FinanceOverview.tsx
@@ -1,11 +1,11 @@
 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
-import { householdAPI, financeAPI, BankAccount, Transaction, Bill } from '@/lib/api';
+import { householdAPI, financeAPI, BankAccount, Transaction, Bill, CategoryInsightItem } from '@/lib/api';
 import { Sidebar } from '@/components/Sidebar';
 import { Header } from '@/components/Header';
 import { FinanceMonthFilter } from '@/components/FinanceMonthFilter';
 import { useFinanceMonth } from '@/contexts/FinanceMonthContext';
-import { Wallet, TrendingUp, TrendingDown, AlertCircle, CreditCard, Sparkles } from 'lucide-react';
+import { Wallet, TrendingUp, TrendingDown, AlertCircle, CreditCard, Sparkles, MessageCircle, Send } from 'lucide-react';
 
 const getCategoryIcon = (category?: string) => {
   const value = (category || '').toLowerCase();
@@ -42,8 +42,14 @@ export default function FinanceOverview() {
   const [transactions, setTransactions] = useState<Transaction[]>([]);
   const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
   const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0 });
-  const [aiSummary, setAiSummary] = useState<string | null>(null);
-  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
+  const [narrativeSummary, setNarrativeSummary] = useState<string | null>(null);
+  const [narrativeSummaryLoading, setNarrativeSummaryLoading] = useState(false);
+  const [categoryInsights, setCategoryInsights] = useState<CategoryInsightItem[]>([]);
+  const [categoryInsightsLoading, setCategoryInsightsLoading] = useState(false);
+  const [askQuestion, setAskQuestion] = useState('');
+  const [askAnswer, setAskAnswer] = useState<string | null>(null);
+  const [askLoading, setAskLoading] = useState(false);
+  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
 
   useEffect(() => {
     loadFamily();
@@ -66,12 +72,25 @@ export default function FinanceOverview() {
   useEffect(() => {
     if (!familyId) return;
     let cancelled = false;
-    setAiSummaryLoading(true);
-    setAiSummary(null);
-    financeAPI.getInsights(familyId, month).then((res) => {
-      if (!cancelled && res?.insights) setAiSummary(res.insights);
+    setNarrativeSummaryLoading(true);
+    setNarrativeSummary(null);
+    financeAPI.getNarrativeSummary(familyId, month).then((res) => {
+      if (!cancelled && res?.narrative) setNarrativeSummary(res.narrative);
     }).catch(() => {}).finally(() => {
-      if (!cancelled) setAiSummaryLoading(false);
+      if (!cancelled) setNarrativeSummaryLoading(false);
+    });
+    return () => { cancelled = true; };
+  }, [familyId, month]);
+
+  useEffect(() => {
+    if (!familyId) return;
+    let cancelled = false;
+    setCategoryInsightsLoading(true);
+    setCategoryInsights([]);
+    financeAPI.getCategoryInsights(familyId, month).then((res) => {
+      if (!cancelled && Array.isArray(res?.insights)) setCategoryInsights(res.insights);
+    }).catch(() => {}).finally(() => {
+      if (!cancelled) setCategoryInsightsLoading(false);
     });
     return () => { cancelled = true; };
   }, [familyId, month]);
@@ -130,6 +149,24 @@ export default function FinanceOverview() {
     setSidebarCollapsed(!sidebarCollapsed);
   };
 
+  const handleAskSubmit = async (e: React.FormEvent) => {
+    e.preventDefault();
+    const q = askQuestion.trim();
+    if (!q || !familyId || askLoading) return;
+    setAskLoading(true);
+    setAskAnswer(null);
+    setLastQuestion(q);
+    try {
+      const res = await financeAPI.askAboutMonth(familyId, { question: q, month });
+      setAskAnswer(res?.answer ?? 'Could not get an answer.');
+      setAskQuestion('');
+    } catch {
+      setAskAnswer('Something went wrong. Please try again.');
+    } finally {
+      setAskLoading(false);
+    }
+  };
+
   return (
     <div className="flex h-screen overflow-hidden app-shell">
       <Sidebar
@@ -150,18 +187,43 @@ export default function FinanceOverview() {
               <FinanceMonthFilter />
             </div>
 
-            {/* AI narrative summary */}
-            {(aiSummaryLoading || aiSummary) && (
+            {/* Narrative summary: 2–3 sentences on income, expenses, bills, trend */}
+            {(narrativeSummaryLoading || narrativeSummary) && (
               <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
                 <div className="flex items-center gap-2 mb-2">
                   <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
-                  <h3 className="text-sm font-semibold text-[var(--app-fg)]">AI summary</h3>
+                  <h3 className="text-sm font-semibold text-[var(--app-fg)]">Narrative summary</h3>
                 </div>
-                {aiSummaryLoading && (
+                {narrativeSummaryLoading && (
                   <p className="text-sm text-[var(--app-fg-muted)]">Loading summary…</p>
                 )}
-                {!aiSummaryLoading && aiSummary && (
-                  <p className="text-sm text-[var(--app-fg)] leading-relaxed">{aiSummary}</p>
+                {!narrativeSummaryLoading && narrativeSummary && (
+                  <p className="text-sm text-[var(--app-fg)] leading-relaxed">{narrativeSummary}</p>
+                )}
+              </div>
+            )}
+
+            {/* Category insights (compact) */}
+            {(categoryInsightsLoading || categoryInsights.length > 0) && (
+              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
+                <div className="flex items-center gap-2 mb-2">
+                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
+                  <h3 className="text-sm font-semibold text-[var(--app-fg)]">Spending by category</h3>
+                  {categoryInsightsLoading && <span className="text-xs text-[var(--app-fg-muted)]">Loading…</span>}
+                </div>
+                {categoryInsights.length > 0 && (
+                  <div className="flex flex-wrap gap-2">
+                    {categoryInsights.slice(0, 5).map((item) => (
+                      <div
+                        key={item.category}
+                        className="rounded-lg border border-[var(--panel-border)] bg-black/5 dark:bg-white/5 px-2.5 py-1.5 text-xs"
+                      >
+                        <span className="font-medium text-[var(--app-fg)]">{getCategoryIcon(item.category)} {item.category}</span>
+                        <span className="text-[var(--app-fg-muted)] ml-1">· {item.percent}%</span>
+                        <p className="text-[var(--app-fg-muted)] mt-0.5 line-clamp-2">{item.summary}</p>
+                      </div>
+                    ))}
+                  </div>
                 )}
               </div>
             )}
@@ -237,9 +299,52 @@ export default function FinanceOverview() {
               </button>
             </div>
 
-
-
-
+            {/* Ask about this month – Q&A widget */}
+            {familyId && (
+              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-4 glass-black-surface">
+                <div className="flex items-center gap-2 mb-3">
+                  <MessageCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
+                  <h3 className="text-sm font-semibold text-[var(--app-fg)]">Ask about this month</h3>
+                </div>
+                <p className="text-xs text-[var(--app-fg-muted)] mb-2">
+                  e.g. &quot;Why is expense high?&quot; or &quot;What were the top 3 categories?&quot;
+                </p>
+                <form onSubmit={handleAskSubmit} className="flex gap-2 mb-3">
+                  <input
+                    type="text"
+                    value={askQuestion}
+                    onChange={(e) => setAskQuestion(e.target.value)}
+                    placeholder="Ask a question..."
+                    disabled={askLoading}
+                    className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-[var(--app-fg)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
+                  />
+                  <button
+                    type="submit"
+                    disabled={askLoading || !askQuestion.trim()}
+                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none"
+                  >
+                    {askLoading ? (
+                      <span className="text-xs">…</span>
+                    ) : (
+                      <>
+                        <Send className="w-4 h-4" />
+                        Ask
+                      </>
+                    )}
+                  </button>
+                </form>
+                {lastQuestion && (
+                  <div className="rounded-lg bg-black/5 dark:bg-white/5 px-2.5 py-1.5 mb-2">
+                    <p className="text-xs text-[var(--app-fg-muted)]">You asked: {lastQuestion}</p>
+                  </div>
+                )}
+                {askAnswer !== null && (
+                  <div className="rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/20 px-3 py-2">
+                    <p className="text-sm text-[var(--app-fg)] leading-relaxed">{askAnswer}</p>
+                  </div>
+                )}
+              </div>
+            )}
 
             {/* Recent Transactions */}
             <div className="rounded-xl shadow-sm border border-[var(--panel-border)] p-6 glass-black-surface">
diff --git a/frontend/src/pages/Transactions.tsx b/frontend/src/pages/Transactions.tsx
index a3023c8..0c84677 100644
--- a/frontend/src/pages/Transactions.tsx
+++ b/frontend/src/pages/Transactions.tsx
@@ -1,7 +1,7 @@
 import { useEffect, useMemo, useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { useAuth } from '@/hooks/useAuth';
-import { financeAPI, householdAPI, Transaction, BankAccount } from '@/lib/api';
+import { financeAPI, householdAPI, Transaction, BankAccount, CategoryInsightItem } from '@/lib/api';
 import { Sidebar } from '@/components/Sidebar';
 import { Header } from '@/components/Header';
 import { FinanceMonthFilter } from '@/components/FinanceMonthFilter';
@@ -88,6 +88,12 @@ export default function TransactionsPage() {
   const [categoryFilter, setCategoryFilter] = useState('all');
   const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
   const [sortBy, setSortBy] = useState<SortBy>('newest');
+  const [dateFrom, setDateFrom] = useState('');
+  const [dateTo, setDateTo] = useState('');
+  const [aiSearchMode, setAiSearchMode] = useState(false);
+  const [aiSearchLoading, setAiSearchLoading] = useState(false);
+  const [categoryInsights, setCategoryInsights] = useState<CategoryInsightItem[]>([]);
+  const [categoryInsightsLoading, setCategoryInsightsLoading] = useState(false);
 
   const handleMenuToggle = () => {
     setMobileMenuOpen(!mobileMenuOpen);
@@ -110,6 +116,25 @@ export default function TransactionsPage() {
     }
   }, [familyId, month, typeFilter, categoryFilter]);
 
+  useEffect(() => {
+    if (!familyId) return;
+    let cancelled = false;
+    setCategoryInsightsLoading(true);
+    setCategoryInsights([]);
+    financeAPI
+      .getCategoryInsights(familyId, month ?? undefined)
+      .then((res) => {
+        if (!cancelled && Array.isArray(res?.insights)) setCategoryInsights(res.insights);
+      })
+      .catch(() => {})
+      .finally(() => {
+        if (!cancelled) setCategoryInsightsLoading(false);
+      });
+    return () => {
+      cancelled = true;
+    };
+  }, [familyId, month]);
+
   const loadFamily = async () => {
     try {
       const families = await householdAPI.list();
@@ -241,7 +266,11 @@ export default function TransactionsPage() {
       const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;
       const matchesType = typeFilter === 'all' || tx.type === typeFilter;
 
-      return matchesSearch && matchesCategory && matchesType;
+      const txDate = (tx.transaction_date || '').slice(0, 10);
+      const matchesDateFrom = !dateFrom || txDate >= dateFrom;
+      const matchesDateTo = !dateTo || txDate <= dateTo;
+
+      return matchesSearch && matchesCategory && matchesType && matchesDateFrom && matchesDateTo;
     });
 
     filtered.sort((a, b) => {
@@ -264,7 +293,7 @@ export default function TransactionsPage() {
     });
 
     return filtered;
-  }, [transactions, search, categoryFilter, typeFilter, sortBy]);
+  }, [transactions, search, categoryFilter, typeFilter, sortBy, dateFrom, dateTo]);
 
   const groupedTransactions = useMemo(() => {
     const groups: Record<string, Transaction[]> = {};
@@ -300,6 +329,27 @@ export default function TransactionsPage() {
     setCategoryFilter('all');
     setTypeFilter('all');
     setSortBy('newest');
+    setDateFrom('');
+    setDateTo('');
+  };
+
+  const runAiSearch = async () => {
+    const query = search.trim();
+    if (!query || !familyId || aiSearchLoading) return;
+    setAiSearchLoading(true);
+    try {
+      const { spec } = await financeAPI.interpretSearch(familyId, { q: query, month: month ?? undefined });
+      setSearch(spec.description_contains ?? '');
+      setCategoryFilter(spec.category ?? 'all');
+      setTypeFilter((spec.type ?? 'all') as TypeFilter);
+      setSortBy((spec.sort ?? 'newest') as SortBy);
+      setDateFrom(spec.date_from ?? '');
+      setDateTo(spec.date_to ?? '');
+    } catch (err) {
+      console.error('AI search failed', err);
+    } finally {
+      setAiSearchLoading(false);
+    }
   };
 
   return (
@@ -389,21 +439,61 @@ export default function TransactionsPage() {
 
             <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-4 space-y-3">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
-                <div className="relative lg:col-span-5">
-                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
-                  <input
-                    value={search}
-                    onChange={(e) => setSearch(e.target.value)}
-                    placeholder="Search category, note, account, bank..."
-                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-9 pr-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
-                  />
+                <div className="relative lg:col-span-5 flex items-center gap-2">
+                  <div className="relative flex-1">
+                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
+                    <input
+                      value={search}
+                      onChange={(e) => setSearch(e.target.value)}
+                      onKeyDown={(e) => {
+                        if (e.key === 'Enter' && aiSearchMode) {
+                          e.preventDefault();
+                          runAiSearch();
+                        }
+                      }}
+                      placeholder={
+                        aiSearchMode
+                          ? "Try: 'coffee last week', 'biggest expense this month'..."
+                          : 'Search category, note, account, bank...'
+                      }
+                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-9 pr-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
+                    />
+                  </div>
+                  {aiSearchMode && (
+                    <button
+                      type="button"
+                      onClick={runAiSearch}
+                      disabled={aiSearchLoading || !search.trim()}
+                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
+                    >
+                      {aiSearchLoading ? (
+                        '...'
+                      ) : (
+                        <>
+                          <Sparkles className="w-4 h-4" />
+                          Interpret
+                        </>
+                      )}
+                    </button>
+                  )}
                 </div>
-
-                <div className="lg:col-span-3">
+                <div className="lg:col-span-3 flex items-center gap-2">
+                  <button
+                    type="button"
+                    onClick={() => setAiSearchMode(!aiSearchMode)}
+                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition whitespace-nowrap ${
+                      aiSearchMode
+                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
+                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
+                    }`}
+                  >
+                    <Sparkles className="w-3.5 h-3.5" />
+                    AI search
+                  </button>
                   <select
                     value={categoryFilter}
                     onChange={(e) => setCategoryFilter(e.target.value)}
-                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
+                    className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   >
                     {categoryOptions.map((category) => (
                       <option key={category} value={category}>
@@ -444,12 +534,57 @@ export default function TransactionsPage() {
                 </div>
               </div>
 
-              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
-                <ArrowDownUp className="w-3.5 h-3.5" />
+              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
+                <ArrowDownUp className="w-3.5 h-3.5 shrink-0" />
                 <span>Use filters to narrow records and compare inflow vs outflow.</span>
+                {aiSearchMode && (
+                  <span className="text-indigo-600 dark:text-indigo-400">
+                    AI search: type a phrase (e.g. &quot;coffee last week&quot;) and press Enter or click Interpret.
+                  </span>
+                )}
+                {(dateFrom || dateTo) && (
+                  <span className="text-amber-600 dark:text-amber-400">
+                    Date range: {dateFrom || '…'} to {dateTo || '…'}
+                  </span>
+                )}
               </div>
             </div>
 
+            {/* Category insights panel */}
+            {familyId && (
+              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-4">
+                <div className="flex items-center gap-2 mb-3">
+                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
+                  <h3 className="text-sm font-semibold text-[var(--app-fg)]">Category insights</h3>
+                  {categoryInsightsLoading && (
+                    <span className="text-xs text-[var(--app-fg-muted)]">Loading…</span>
+                  )}
+                </div>
+                {categoryInsightsLoading && categoryInsights.length === 0 && (
+                  <p className="text-xs text-[var(--app-fg-muted)]">Generating short AI summaries per category…</p>
+                )}
+                {!categoryInsightsLoading && categoryInsights.length === 0 && transactions.length > 0 && (
+                  <p className="text-xs text-[var(--app-fg-muted)]">No expense categories this month.</p>
+                )}
+                {categoryInsights.length > 0 && (
+                  <ul className="space-y-2">
+                    {categoryInsights.map((item) => (
+                      <li
+                        key={item.category}
+                        className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-[var(--panel-border)] bg-black/5 dark:bg-white/5 px-3 py-2"
+                      >
+                        <span className="font-medium text-[var(--app-fg)]">{getCategoryIcon(item.category)} {item.category}</span>
+                        <span className="text-xs text-[var(--app-fg-muted)]">
+                          {formatCurrency(item.amount)} · {item.percent}%
+                        </span>
+                        <span className="text-xs text-[var(--app-fg)] flex-1 min-w-0">{item.summary}</span>
+                      </li>
+                    ))}
+                  </ul>
+                )}
+              </div>
+            )}
+
             {loading && (
               <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-6 text-sm text-gray-500 dark:text-gray-400">
                 Loading transactions...
diff --git a/microservice/src/modules/finance/aggregate.ts b/microservice/src/modules/finance/aggregate.ts
index feb7618..cf72dae 100644
--- a/microservice/src/modules/finance/aggregate.ts
+++ b/microservice/src/modules/finance/aggregate.ts
@@ -1,19 +1,24 @@
 /**
  * Aggregate family finance data for AI insights (read-only).
+ * Includes household (members) and module status (finance: accounts, transactions, bills, cards).
  */
 import { BankAccountModel } from '../../db/schemas/BankAccount.js';
 import { TransactionModel } from '../../db/schemas/Transaction.js';
 import { BillModel } from '../../db/schemas/Bill.js';
+import { CardModel } from '../../db/schemas/Card.js';
+import { FamilyMemberModel } from '../../db/schemas/FamilyMember.js';
 import type { InsightsContext } from './service.js';
 
 export async function getInsightsContext(
   familyId: string,
   month?: string
 ): Promise<InsightsContext> {
-  const [accounts, transactions, bills] = await Promise.all([
+  const [accounts, transactions, bills, membersCount, cardsCount] = await Promise.all([
     BankAccountModel.find({ family_id: familyId }).lean(),
     month ? getTransactionsForMonth(familyId, month) : [],
     BillModel.find({ family_id: familyId, status: 'pending' }).lean(),
+    FamilyMemberModel.countDocuments({ family_id: familyId }),
+    CardModel.countDocuments({ family_id: familyId }),
   ]);
 
   const total_balance = accounts.reduce((sum, a) => sum + Number(a.balance ?? 0), 0);
@@ -34,6 +39,49 @@ export async function getInsightsContext(
     savings_rate: Math.round(savings_rate * 100) / 100,
     upcoming_bills: bills.length,
     month,
+    members_count: membersCount,
+    accounts_count: accounts.length,
+    transactions_count: transactions.length,
+    cards_count: cardsCount,
+  };
+}
+
+export interface NarrativeSummaryContext {
+  month?: string;
+  total_income: number;
+  total_expense: number;
+  savings_rate: number;
+  upcoming_bills: number;
+  prev_income: number;
+  prev_expense: number;
+}
+
+/**
+ * Lightweight context for narrative summary: current + previous month (income, expense, bills) for trend.
+ */
+export async function getNarrativeSummaryContext(
+  familyId: string,
+  month?: string
+): Promise<NarrativeSummaryContext> {
+  const monthStr = month ?? getCurrentMonthStr();
+  const [currentTx, prevTx, billCount] = await Promise.all([
+    getTransactionsForMonth(familyId, monthStr),
+    getTransactionsForMonth(familyId, previousMonth(monthStr)),
+    BillModel.countDocuments({ family_id: familyId, status: 'pending' }),
+  ]);
+  const total_income = currentTx.filter((t: { type: string }) => t.type === 'income').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
+  const total_expense = currentTx.filter((t: { type: string }) => t.type === 'expense').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
+  const savings_rate = total_income > 0 ? ((total_income - total_expense) / total_income) * 100 : 0;
+  const prev_income = prevTx.filter((t: { type: string }) => t.type === 'income').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
+  const prev_expense = prevTx.filter((t: { type: string }) => t.type === 'expense').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
+  return {
+    month: monthStr,
+    total_income,
+    total_expense,
+    savings_rate: Math.round(savings_rate * 100) / 100,
+    upcoming_bills: billCount,
+    prev_income,
+    prev_expense,
   };
 }
 
@@ -51,4 +99,180 @@ async function getTransactionsForMonth(
     .select('type amount')
     .lean();
   return list as Array<{ type: string; amount: number }>;
+}
+
+function previousMonth(monthStr: string): string {
+  const [y, m] = monthStr.split('-').map(Number);
+  if (m === 1) return `${y - 1}-12`;
+  return `${y}-${String(m - 1).padStart(2, '0')}`;
+}
+
+export interface RiskSuggestionsContext {
+  total_balance: number;
+  total_income: number;
+  total_expense: number;
+  savings_rate: number;
+  month?: string;
+  prev_month_income: number;
+  prev_month_expense: number;
+  upcoming_bills: Array<{ due_date: string; amount: number }>;
+  overdue_bills_count: number;
+  pending_bills_count: number;
+}
+
+/**
+ * Aggregate data for AI risk suggestions: current vs previous month, bills due, balance.
+ */
+export async function getRiskSuggestionsContext(
+  familyId: string,
+  month?: string
+): Promise<RiskSuggestionsContext> {
+  const monthStr = month ?? getCurrentMonthStr();
+  const [accounts, currentTx, prevTx, pendingBills] = await Promise.all([
+    BankAccountModel.find({ family_id: familyId }).lean(),
+    getTransactionsForMonth(familyId, monthStr),
+    getTransactionsForMonth(familyId, previousMonth(monthStr)),
+    BillModel.find({ family_id: familyId, status: 'pending' })
+      .select('due_date amount')
+      .sort({ due_date: 1 })
+      .lean(),
+  ]);
+
+  const total_balance = accounts.reduce((sum: number, a: { balance?: unknown }) => sum + Number(a.balance ?? 0), 0);
+  const total_income = currentTx.filter((t: { type: string }) => t.type === 'income').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
+  const total_expense = currentTx.filter((t: { type: string }) => t.type === 'expense').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
+  const savings_rate =
+    total_income > 0 ? ((total_income - total_expense) / total_income) * 100 : 0;
+  const prev_month_income = prevTx.filter((t: { type: string }) => t.type === 'income').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
+  const prev_month_expense = prevTx.filter((t: { type: string }) => t.type === 'expense').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
+
+  const now = Date.now();
+  const upcoming_bills = pendingBills.map((b: { due_date: Date; amount?: number }) => ({
+    due_date: (b.due_date as Date).toISOString().slice(0, 10),
+    amount: Number(b.amount ?? 0),
+  }));
+  const overdue_bills_count = upcoming_bills.filter((d: { due_date: string }) => new Date(d.due_date).getTime() < now).length;
+  const pending_bills_count = pendingBills.length;
+
+  return {
+    total_balance,
+    total_income,
+    total_expense,
+    savings_rate: Math.round(savings_rate * 100) / 100,
+    month: monthStr,
+    prev_month_income,
+    prev_month_expense,
+    upcoming_bills,
+    overdue_bills_count,
+    pending_bills_count,
+  };
+}
+
+function getCurrentMonthStr(): string {
+  const d = new Date();
+  const y = d.getFullYear();
+  const m = String(d.getMonth() + 1).padStart(2, '0');
+  return `${y}-${m}`;
+}
+
+async function getExpensesByCategory(
+  familyId: string,
+  monthStr: string
+): Promise<{ total: number; byCategory: Array<{ category: string; amount: number }> }> {
+  const [y, m] = monthStr.split('-').map(Number);
+  const start = new Date(y, m - 1, 1);
+  const end = new Date(y, m, 0);
+  const list = await TransactionModel.find({
+    family_id: familyId,
+    type: 'expense',
+    transaction_date: { $gte: start, $lte: end },
+  })
+    .select('category amount')
+    .lean();
+  const byCategory = new Map<string, number>();
+  let total = 0;
+  for (const t of list as Array<{ category: string; amount: number }>) {
+    const cat = t.category || 'Other';
+    const amt = Number(t.amount ?? 0);
+    byCategory.set(cat, (byCategory.get(cat) ?? 0) + amt);
+    total += amt;
+  }
+  const byCategoryList = Array.from(byCategory.entries())
+    .map(([category, amount]) => ({ category, amount }))
+    .sort((a, b) => b.amount - a.amount);
+  return { total, byCategory: byCategoryList };
+}
+
+export interface CategoryInsightsContext {
+  month?: string;
+  total_expense: number;
+  categories: Array<{ category: string; amount: number; percent: number }>;
+  prev_total_expense: number;
+  prev_categories: Array<{ category: string; amount: number; percent: number }>;
+}
+
+/**
+ * Aggregate expense by category for current and previous month (for "above your usual").
+ */
+export async function getCategoryInsightsContext(
+  familyId: string,
+  month?: string
+): Promise<CategoryInsightsContext> {
+  const monthStr = month ?? getCurrentMonthStr();
+  const [current, prev] = await Promise.all([
+    getExpensesByCategory(familyId, monthStr),
+    getExpensesByCategory(familyId, previousMonth(monthStr)),
+  ]);
+  const categories = current.byCategory.map((c) => ({
+    category: c.category,
+    amount: c.amount,
+    percent: current.total > 0 ? Math.round((c.amount / current.total) * 1000) / 10 : 0,
+  }));
+  const prev_categories = prev.byCategory.map((c) => ({
+    category: c.category,
+    amount: c.amount,
+    percent: prev.total > 0 ? Math.round((c.amount / prev.total) * 1000) / 10 : 0,
+  }));
+  return {
+    month: monthStr,
+    total_expense: current.total,
+    categories,
+    prev_total_expense: prev.total,
+    prev_categories,
+  };
+}
+
+export interface AskMonthContext {
+  month?: string;
+  total_income: number;
+  total_expense: number;
+  savings_rate: number;
+  upcoming_bills: number;
+  prev_income: number;
+  prev_expense: number;
+  top_categories: Array<{ category: string; amount: number; percent: number }>;
+}
+
+/**
+ * Context for "Ask about this month" Q&A: summary + top expense categories.
+ */
+export async function getAskMonthContext(
+  familyId: string,
+  month?: string
+): Promise<AskMonthContext> {
+  const monthStr = month ?? getCurrentMonthStr();
+  const [narrative, categoryCtx] = await Promise.all([
+    getNarrativeSummaryContext(familyId, monthStr),
+    getCategoryInsightsContext(familyId, monthStr),
+  ]);
+  return {
+    month: narrative.month,
+    total_income: narrative.total_income,
+    total_expense: narrative.total_expense,
+    savings_rate: narrative.savings_rate,
+    upcoming_bills: narrative.upcoming_bills,
+    prev_income: narrative.prev_income,
+    prev_expense: narrative.prev_expense,
+    top_categories: categoryCtx.categories.slice(0, 10),
+  };
 }
\ No newline at end of file
diff --git a/microservice/src/modules/finance/controller.ts b/microservice/src/modules/finance/controller.ts
index 8c890e4..2ca2aff 100644
--- a/microservice/src/modules/finance/controller.ts
+++ b/microservice/src/modules/finance/controller.ts
@@ -1,9 +1,15 @@
 import type { Request, Response } from 'express';
 import { v4 as uuidv4 } from 'uuid';
-import { getInsightsContext } from './aggregate.js';
+import { getInsightsContext, getRiskSuggestionsContext, getCategoryInsightsContext, getNarrativeSummaryContext, getAskMonthContext } from './aggregate.js';
 import {
   generateInsights,
+  generateRiskSuggestions,
+  generateCategoryInsights,
+  generateNarrativeSummary,
+  answerAskMonth,
+  generateCashflowTips,
   getSavingsTips,
+  interpretSearchQuery,
   suggestTransactionCategory,
   suggestBillCategory,
   parseSmsToTransaction,
@@ -42,6 +48,109 @@ export const financeController = {
     }
   },
 
+  async riskSuggestions(req: Request, res: Response): Promise<void> {
+    const familyId = req.params.familyId as string;
+    const month = (req.query.month as string) || undefined;
+    if (!familyId) {
+      res.fail('familyId required', 400);
+      return;
+    }
+    try {
+      const context = await getRiskSuggestionsContext(familyId, month);
+      const { risks, ai_available } = await generateRiskSuggestions(context);
+      res.success({ risks, ai_available });
+    } catch (e) {
+      console.error('[finance] riskSuggestions:', e);
+      res.fail('Failed to load risk suggestions', 500);
+    }
+  },
+
+  async askMonth(req: Request, res: Response): Promise<void> {
+    const familyId = req.params.familyId as string;
+    const body = (req.body || {}) as { question?: string; month?: string };
+    const question = typeof body.question === 'string' ? body.question.trim() : '';
+    if (!familyId) {
+      res.fail('familyId required', 400);
+      return;
+    }
+    try {
+      const context = await getAskMonthContext(familyId, body.month);
+      const { answer, ai_available } = await answerAskMonth(question, context);
+      res.success({ answer, ai_available });
+    } catch (e) {
+      console.error('[finance] askMonth:', e);
+      res.fail('Failed to answer question', 500);
+    }
+  },
+
+  async narrativeSummary(req: Request, res: Response): Promise<void> {
+    const familyId = req.params.familyId as string;
+    const month = (req.query.month as string) || undefined;
+    if (!familyId) {
+      res.fail('familyId required', 400);
+      return;
+    }
+    try {
+      const context = await getNarrativeSummaryContext(familyId, month);
+      const { narrative, ai_available } = await generateNarrativeSummary(context);
+      res.success({ narrative, ai_available });
+    } catch (e) {
+      console.error('[finance] narrativeSummary:', e);
+      res.fail('Failed to load narrative summary', 500);
+    }
+  },
+
+  async cashflowTips(req: Request, res: Response): Promise<void> {
+    const familyId = req.params.familyId as string;
+    const month = (req.query.month as string) || undefined;
+    if (!familyId) {
+      res.fail('familyId required', 400);
+      return;
+    }
+    try {
+      const context = await getRiskSuggestionsContext(familyId, month);
+      const { tips, ai_available } = await generateCashflowTips(context);
+      res.success({ tips, ai_available });
+    } catch (e) {
+      console.error('[finance] cashflowTips:', e);
+      res.fail('Failed to load cash-flow tips', 500);
+    }
+  },
+
+  async categoryInsights(req: Request, res: Response): Promise<void> {
+    const familyId = req.params.familyId as string;
+    const month = (req.query.month as string) || undefined;
+    if (!familyId) {
+      res.fail('familyId required', 400);
+      return;
+    }
+    try {
+      const context = await getCategoryInsightsContext(familyId, month);
+      const { insights, ai_available } = await generateCategoryInsights(context);
+      res.success({ insights, ai_available });
+    } catch (e) {
+      console.error('[finance] categoryInsights:', e);
+      res.fail('Failed to load category insights', 500);
+    }
+  },
+
+  async interpretSearch(req: Request, res: Response): Promise<void> {
+    const familyId = req.params.familyId as string;
+    const body = (req.body || {}) as { q?: string; month?: string };
+    const query = typeof body.q === 'string' ? body.q.trim() : '';
+    if (!familyId) {
+      res.fail('familyId required', 400);
+      return;
+    }
+    try {
+      const { spec, ai_available } = await interpretSearchQuery(query, body.month);
+      res.success({ spec, ai_available });
+    } catch (e) {
+      console.error('[finance] interpretSearch:', e);
+      res.fail('Failed to interpret search', 500);
+    }
+  },
+
   async savingsTips(_req: Request, res: Response): Promise<void> {
     try {
       const { tips, ai_available } = await getSavingsTips();
diff --git a/microservice/src/modules/finance/routes.ts b/microservice/src/modules/finance/routes.ts
index b38cb27..cc3189c 100644
--- a/microservice/src/modules/finance/routes.ts
+++ b/microservice/src/modules/finance/routes.ts
@@ -34,6 +34,12 @@ financeRoutes.delete('/cards/:familyId/:cardId', financeDataController.deleteCar
 
 // AI
 financeRoutes.get('/ai/insights/:familyId', financeController.insights);
+financeRoutes.get('/ai/risk-suggestions/:familyId', financeController.riskSuggestions);
+financeRoutes.get('/ai/narrative-summary/:familyId', financeController.narrativeSummary);
+financeRoutes.post('/ai/ask-month/:familyId', financeController.askMonth);
+financeRoutes.get('/ai/cashflow-tips/:familyId', financeController.cashflowTips);
+financeRoutes.get('/ai/category-insights/:familyId', financeController.categoryInsights);
+financeRoutes.post('/ai/interpret-search/:familyId', financeController.interpretSearch);
 financeRoutes.get('/ai/savings-tips/:familyId', financeController.savingsTips);
 financeRoutes.post('/ai/suggest-category/:familyId', financeController.suggestCategory);
 financeRoutes.post('/ai/suggest-bill-category/:familyId', financeController.suggestBillCategory);
diff --git a/microservice/src/modules/finance/service.ts b/microservice/src/modules/finance/service.ts
index ab30416..f38e4aa 100644
--- a/microservice/src/modules/finance/service.ts
+++ b/microservice/src/modules/finance/service.ts
@@ -49,20 +49,272 @@ export interface InsightsContext {
   savings_rate: number;
   upcoming_bills: number;
   month?: string;
+  members_count?: number;
+  accounts_count?: number;
+  transactions_count?: number;
+  cards_count?: number;
+}
+
+export type RiskSuggestionsContext = import('./aggregate.js').RiskSuggestionsContext;
+export type CategoryInsightsContext = import('./aggregate.js').CategoryInsightsContext;
+export type NarrativeSummaryContext = import('./aggregate.js').NarrativeSummaryContext;
+export type AskMonthContext = import('./aggregate.js').AskMonthContext;
+
+export async function answerAskMonth(
+  question: string,
+  context: AskMonthContext
+): Promise<{ answer: string; ai_available: boolean }> {
+  const q = (question || '').trim();
+  if (!q) {
+    return { answer: 'Please ask a question about this month\'s finances.', ai_available: false };
+  }
+  const categoryLines =
+    context.top_categories.length > 0
+      ? context.top_categories
+          .map((c) => `- ${c.category}: ₹${c.amount.toLocaleString()} (${c.percent}% of expenses)`)
+          .join('\n')
+      : 'No expense categories this month.';
+  const fallback =
+    `This month: income ₹${context.total_income.toLocaleString()}, expenses ₹${context.total_expense.toLocaleString()}, savings rate ${context.savings_rate}%, ${context.upcoming_bills} pending bills. Top categories: ${context.top_categories.slice(0, 3).map((c) => c.category).join(', ')}.`;
+  if (!hf.isHuggingFaceAvailable()) {
+    return { answer: fallback, ai_available: false };
+  }
+  const monthLabel = context.month ? ` for ${context.month}` : '';
+  const prompt = `You are a helpful finance assistant. Answer the user's question in 1-3 short sentences using ONLY the data below. Be concise and factual.
+Data for this month${monthLabel}:
+- Income: ₹${context.total_income.toLocaleString()}, Expenses: ₹${context.total_expense.toLocaleString()}
+- Savings rate: ${context.savings_rate}%
+- Pending bills: ${context.upcoming_bills}
+- Last month: income ₹${context.prev_income.toLocaleString()}, expenses ₹${context.prev_expense.toLocaleString()}
+Expense by category:
+${categoryLines}
+
+User question: ${q}
+
+Answer (1-3 sentences, no bullet points):`;
+  const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 150 });
+  if (out && out.trim().length > 10) {
+    return { answer: out.trim(), ai_available: true };
+  }
+  return { answer: fallback, ai_available: false };
+}
+
+export async function generateNarrativeSummary(
+  context: NarrativeSummaryContext
+): Promise<{ narrative: string; ai_available: boolean }> {
+  const fallback =
+    `This month: income ₹${context.total_income.toLocaleString()}, expenses ₹${context.total_expense.toLocaleString()}; savings rate ${context.savings_rate}%. ${context.upcoming_bills} pending bill(s).`;
+  if (!hf.isHuggingFaceAvailable()) {
+    return { narrative: fallback, ai_available: false };
+  }
+  const monthLabel = context.month ? ` for ${context.month}` : '';
+  const trend =
+    context.prev_expense > 0 || context.prev_income > 0
+      ? ` Last month: income ₹${context.prev_income.toLocaleString()}, expenses ₹${context.prev_expense.toLocaleString()}.`
+      : '';
+  const prompt = `Write exactly 2-3 short sentences summarizing this month's finances. Do not use bullet points.
+This month${monthLabel}: income ₹${context.total_income}, expenses ₹${context.total_expense}, savings rate ${context.savings_rate}%, ${context.upcoming_bills} pending bill(s).${trend}
+Mention income, expenses, and bills; if trend is available mention whether spending is up or down vs last month. Be concise and neutral.`;
+  const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 150 });
+  if (out && out.trim().length > 30) {
+    return { narrative: out.trim(), ai_available: true };
+  }
+  return { narrative: fallback, ai_available: false };
+}
+
+const DEFAULT_RISK_SUGGESTIONS: string[] = [];
+
+export interface CategoryInsightItem {
+  category: string;
+  amount: number;
+  percent: number;
+  summary: string;
+}
+
+export async function generateCategoryInsights(
+  context: CategoryInsightsContext
+): Promise<{ insights: CategoryInsightItem[]; ai_available: boolean }> {
+  const topCategories = context.categories.slice(0, 8);
+  if (topCategories.length === 0) {
+    return { insights: [], ai_available: false };
+  }
+  const prevMap = new Map(context.prev_categories.map((c) => [c.category, c.percent]));
+  const fallbackInsights: CategoryInsightItem[] = topCategories.map((c) => ({
+    category: c.category,
+    amount: c.amount,
+    percent: c.percent,
+    summary: `${c.category}: ${c.percent}% of expenses (₹${c.amount.toLocaleString()}).`,
+  }));
+
+  if (!hf.isHuggingFaceAvailable()) {
+    return { insights: fallbackInsights, ai_available: false };
+  }
+
+  const lines = topCategories
+    .map((c) => {
+      const prevPct = prevMap.get(c.category);
+      const comp = prevPct != null ? `; last month ${prevPct}%` : '';
+      return `${c.category}: ₹${c.amount}, ${c.percent}% of total${comp}`;
+    })
+    .join('\n');
+  const prompt = `For each spending category below, write ONE short sentence (e.g. "Food is 25% of expenses; above your usual" or "Transport is 12% of expenses."). Use "above your usual" if this month's % is higher than last month's, "below your usual" if lower. Keep each to under 15 words.
+Categories (this month):
+${lines}
+Reply with one sentence per category, in the same order, one per line. No numbering.`;
+  const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 200 });
+  if (!out || out.trim().length < 5) {
+    return { insights: fallbackInsights, ai_available: false };
+  }
+  const sentences = out
+    .split(/\n/)
+    .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
+    .filter((s) => s.length > 5 && s.length < 120);
+  const insights: CategoryInsightItem[] = topCategories.slice(0, sentences.length).map((c, i) => ({
+    category: c.category,
+    amount: c.amount,
+    percent: c.percent,
+    summary: sentences[i] || fallbackInsights[i]?.summary || `${c.category}: ${c.percent}% of expenses.`,
+  }));
+  return { insights, ai_available: true };
+}
+
+export async function generateRiskSuggestions(
+  context: RiskSuggestionsContext
+): Promise<{ risks: string[]; ai_available: boolean }> {
+  if (!hf.isHuggingFaceAvailable()) {
+    return { risks: DEFAULT_RISK_SUGGESTIONS, ai_available: false };
+  }
+  const prevIncome = context.prev_month_income || 0;
+  const prevExpense = context.prev_month_expense || 0;
+  const incomePct =
+    prevIncome > 0 && context.total_income > 0
+      ? Math.round(((context.total_income - prevIncome) / prevIncome) * 100)
+      : null;
+  const expensePct =
+    prevExpense > 0 && context.total_expense > 0
+      ? Math.round(((context.total_expense - prevExpense) / prevExpense) * 100)
+      : null;
+  const now = Date.now();
+  const in5 = 5 * 24 * 60 * 60 * 1000;
+  const in7 = 7 * 24 * 60 * 60 * 1000;
+  const billsDueIn5 = context.upcoming_bills.filter((b) => {
+    const t = new Date(b.due_date).getTime();
+    return t >= now && t <= now + in5;
+  });
+  const billsDueIn7 = context.upcoming_bills.filter((b) => {
+    const t = new Date(b.due_date).getTime();
+    return t >= now && t <= now + in7;
+  });
+  const totalDueIn5 = billsDueIn5.reduce((s, b) => s + b.amount, 0);
+  const totalDueIn7 = billsDueIn7.reduce((s, b) => s + b.amount, 0);
+  const shortfall5 = Math.max(0, totalDueIn5 - context.total_balance);
+  const shortfall7 = Math.max(0, totalDueIn7 - context.total_balance);
+
+  const billsSummary =
+    context.upcoming_bills.length > 0
+      ? `Upcoming/pending bills: ${context.upcoming_bills
+          .slice(0, 5)
+          .map((b) => `${b.due_date} ₹${b.amount}`)
+          .join('; ')}${context.upcoming_bills.length > 5 ? '...' : ''}. Total pending: ${context.pending_bills_count}. Overdue: ${context.overdue_bills_count}. Bills due in 5 days: ${billsDueIn5.length}, total ₹${totalDueIn5}. Bills due in 7 days: ${billsDueIn7.length}, total ₹${totalDueIn7}. Balance: ₹${context.total_balance}. ${shortfall5 > 0 ? `Shortfall for 5-day bills: ₹${shortfall5}.` : ''} ${shortfall7 > 0 ? `Shortfall for 7-day bills: ₹${shortfall7}.` : ''}`
+      : 'No pending bills.';
+  const prompt = `You are a household finance risk advisor. Given this data, suggest 2 to 5 SHORT risk alerts (one line each, no numbering). Focus on:
+- Spending or income changes vs last month (e.g. "Spending up 20% vs last month")
+- Bills and cash flow: include due-date/cash-flow tips when relevant (e.g. "3 bills due in 5 days; balance might be short by ₹X", "Consider paying Y before Z")
+- Savings rate or balance concerns
+Current month: income ₹${context.total_income}, expenses ₹${context.total_expense}, savings rate ${context.savings_rate}%, balance ₹${context.total_balance}. Previous month: income ₹${prevIncome}, expenses ₹${prevExpense}. ${incomePct != null ? `Income change: ${incomePct}% vs last month.` : ''} ${expensePct != null ? `Expense change: ${expensePct}% vs last month.` : ''} ${billsSummary}
+Reply with ONLY the risk lines, one per line, no numbers or bullets. If no real risks, reply "No additional risks."`;
+  const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 250 });
+  if (!out || out.trim().length < 5) {
+    return { risks: DEFAULT_RISK_SUGGESTIONS, ai_available: false };
+  }
+  const normalized = out.trim().toLowerCase();
+  if (normalized.includes('no additional risks') || normalized.startsWith('none')) {
+    return { risks: [], ai_available: true };
+  }
+  const lines = out
+    .split(/[\n•·-]/)
+    .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
+    .filter((s) => s.length > 15 && s.length < 120);
+  return { risks: lines.slice(0, 5), ai_available: true };
+}
+
+/**
+ * Due-date / cash-flow tips for bills: "3 bills due in 5 days; balance might be short by ₹X", "Consider paying Y before Z."
+ */
+export async function generateCashflowTips(
+  context: RiskSuggestionsContext
+): Promise<{ tips: string[]; ai_available: boolean }> {
+  const now = Date.now();
+  const in5 = 5 * 24 * 60 * 60 * 1000;
+  const in7 = 7 * 24 * 60 * 60 * 1000;
+  const billsDueIn5 = context.upcoming_bills.filter((b) => {
+    const t = new Date(b.due_date).getTime();
+    return t >= now && t <= now + in5;
+  });
+  const billsDueIn7 = context.upcoming_bills.filter((b) => {
+    const t = new Date(b.due_date).getTime();
+    return t >= now && t <= now + in7;
+  });
+  const totalDueIn5 = billsDueIn5.reduce((s, b) => s + b.amount, 0);
+  const totalDueIn7 = billsDueIn7.reduce((s, b) => s + b.amount, 0);
+  const shortfall5 = Math.max(0, totalDueIn5 - context.total_balance);
+  const shortfall7 = Math.max(0, totalDueIn7 - context.total_balance);
+
+  const ruleBasedTips: string[] = [];
+  if (billsDueIn5.length > 0) {
+    ruleBasedTips.push(
+      `${billsDueIn5.length} bill${billsDueIn5.length > 1 ? 's' : ''} due in 5 days${shortfall5 > 0 ? `; balance might be short by ₹${shortfall5.toLocaleString()}` : ''}.`
+    );
+  }
+  if (billsDueIn7.length > 0 && billsDueIn7.length !== billsDueIn5.length) {
+    ruleBasedTips.push(
+      `${billsDueIn7.length} bill${billsDueIn7.length > 1 ? 's' : ''} due in 7 days${shortfall7 > 0 ? `; shortfall ₹${shortfall7.toLocaleString()}` : ''}.`
+    );
+  }
+  if (context.upcoming_bills.length >= 2 && context.total_balance < totalDueIn7) {
+    const sorted = [...context.upcoming_bills].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
+    const first = sorted[0];
+    const second = sorted[1];
+    ruleBasedTips.push(`Consider paying ${first.due_date} (₹${first.amount}) before ${second.due_date} (₹${second.amount}).`);
+  }
+
+  if (!hf.isHuggingFaceAvailable()) {
+    return { tips: ruleBasedTips, ai_available: false };
+  }
+
+  const billLines = context.upcoming_bills.slice(0, 6).map((b) => `${b.due_date} ₹${b.amount}`).join('; ');
+  const prompt = `Generate 1 to 3 SHORT cash-flow tips for the user. Data: Balance ₹${context.total_balance}. ${billsDueIn5.length} bills due in 5 days (total ₹${totalDueIn5}). ${shortfall5 > 0 ? `Shortfall: ₹${shortfall5}.` : ''} Bills: ${billLines}.
+Include if relevant: "N bills due in 5 days; balance might be short by ₹X" or "Consider paying Y before Z." One tip per line, no numbering.`;
+  const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 120 });
+  if (out && out.trim().length > 10) {
+    const lines = out
+      .split(/[\n•·-]/)
+      .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
+      .filter((s) => s.length > 10 && s.length < 100);
+    if (lines.length > 0) return { tips: lines.slice(0, 3), ai_available: true };
+  }
+  return { tips: ruleBasedTips, ai_available: false };
 }
 
 export async function generateInsights(context: InsightsContext): Promise<{ insights: string; ai_available: boolean }> {
   const fallback =
-    'Financial health looks stable. Key observations: Total balance and monthly flow are tracked. Consider keeping savings rate above 20%. Review upcoming bills and add more transactions for better insights.';
+    'Household is set up with family members. Finance is active: balance and monthly flow are tracked. Consider keeping savings rate above 20%. Review upcoming bills and add more transactions for better insights. Other modules (Events, Assets, Health, etc.) are available in the app.';
   if (!hf.isHuggingFaceAvailable()) {
     return { insights: fallback, ai_available: false };
   }
-  const prompt = `Summarize this household finance snapshot in 2-3 short sentences. Be concise and actionable.
-Total balance: ${context.total_balance} INR. This month income: ${context.total_income} INR, expenses: ${context.total_expense} INR. Savings rate: ${context.savings_rate}%. Upcoming bills: ${context.upcoming_bills}.
-Give one paragraph of observations and one recommendation.`;
-  const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 150 });
+  const members = context.members_count ?? 0;
+  const accounts = context.accounts_count ?? 0;
+  const transactions = context.transactions_count ?? 0;
+  const cards = context.cards_count ?? 0;
+  const monthLabel = context.month ? ` for ${context.month}` : '';
+  const prompt = `Write one short paragraph (3-5 sentences) for a "Household Overview" that covers:
+1) Family: this household has ${members} member(s).
+2) Finance: total balance ${context.total_balance} INR; this month${monthLabel} income ${context.total_income} INR, expenses ${context.total_expense} INR; savings rate ${context.savings_rate}%; ${context.upcoming_bills} pending bill(s). Finance module: ${accounts} account(s), ${transactions} transaction(s) this month, ${cards} card(s).
+3) Module status: mention Finance is active with the above; briefly note that other modules (Events, Assets, Health, Contacts, Organizer, Messages) are available in the app.
+Be concise, practical, and motivating. One paragraph only.`;
+  const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 200 });
   if (out && out.length > 20) {
-    return { insights: out, ai_available: true };
+    return { insights: out.trim(), ai_available: true };
   }
   return { insights: fallback, ai_available: false };
 }
@@ -89,6 +341,89 @@ export async function getSavingsTips(): Promise<{ tips: string[]; ai_available:
   return { tips: DEFAULT_SAVINGS_TIPS, ai_available: false };
 }
 
+export interface TransactionSearchSpec {
+  description_contains?: string;
+  category?: string;
+  type?: 'income' | 'expense';
+  date_from?: string;
+  date_to?: string;
+  sort?: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
+}
+
+function getLastWeekRange(): { date_from: string; date_to: string } {
+  const now = new Date();
+  const day = now.getDay();
+  const diffToMonday = day === 0 ? 6 : day - 1;
+  const lastMonday = new Date(now);
+  lastMonday.setDate(now.getDate() - diffToMonday - 7);
+  const lastSunday = new Date(lastMonday);
+  lastSunday.setDate(lastMonday.getDate() + 6);
+  return {
+    date_from: lastMonday.toISOString().slice(0, 10),
+    date_to: lastSunday.toISOString().slice(0, 10),
+  };
+}
+
+export async function interpretSearchQuery(
+  query: string,
+  month?: string
+): Promise<{ spec: TransactionSearchSpec; ai_available: boolean }> {
+  const q = (query || '').trim().toLowerCase();
+  const fallback: TransactionSearchSpec = {};
+  if (!q) {
+    return { spec: fallback, ai_available: false };
+  }
+  if (hf.isHuggingFaceAvailable()) {
+    const today = new Date().toISOString().slice(0, 10);
+    const lastWeek = getLastWeekRange();
+    const prompt = `Convert this transaction search query into a JSON object. Today is ${today}. Current month context: ${month || 'not set'}. Last week: ${lastWeek.date_from} to ${lastWeek.date_to}.
+Query: "${query}"
+
+Return ONLY a JSON object with these optional keys (use null for missing): description_contains (string, keyword to find in description/category), category (string, one category), type ("income" or "expense"), date_from (YYYY-MM-DD), date_to (YYYY-MM-DD), sort ("newest" or "oldest" or "amount_high" or "amount_low").
+Examples: "coffee last week" -> {"description_contains":"coffee","date_from":"${lastWeek.date_from}","date_to":"${lastWeek.date_to}","sort":"newest"}
+"biggest expense this month" -> {"type":"expense","sort":"amount_high"}
+"salary" -> {"description_contains":"salary","type":"income"}
+Return only the JSON, no other text.`;
+    const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 120 });
+    if (out) {
+      const jsonMatch = out.match(/\{[\s\S]*\}/);
+      if (jsonMatch) {
+        try {
+          const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
+          const spec: TransactionSearchSpec = {};
+          if (typeof parsed.description_contains === 'string' && parsed.description_contains.length > 0) spec.description_contains = parsed.description_contains;
+          if (typeof parsed.category === 'string' && parsed.category.length > 0) spec.category = parsed.category;
+          if (parsed.type === 'income' || parsed.type === 'expense') spec.type = parsed.type;
+          if (typeof parsed.date_from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date_from)) spec.date_from = parsed.date_from;
+          if (typeof parsed.date_to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date_to)) spec.date_to = parsed.date_to;
+          const sortVal = parsed.sort;
+          if (sortVal === 'newest' || sortVal === 'oldest' || sortVal === 'amount_high' || sortVal === 'amount_low') spec.sort = sortVal;
+          return { spec, ai_available: true };
+        } catch {
+          /* fall through to rule-based */
+        }
+      }
+    }
+  }
+  const spec: TransactionSearchSpec = { ...fallback };
+  if (/\b(last\s+week|past\s+week)\b/i.test(q)) {
+    const lw = getLastWeekRange();
+    spec.date_from = lw.date_from;
+    spec.date_to = lw.date_to;
+  }
+  if (/\b(biggest|largest|highest|top)\b.*\b(expense|spend)\b/i.test(q) || /\bexpense.*\b(biggest|largest)\b/i.test(q)) {
+    spec.type = 'expense';
+    spec.sort = 'amount_high';
+  }
+  if (/\b(biggest|largest|highest)\b.*\b(income|salary)\b/i.test(q)) {
+    spec.type = 'income';
+    spec.sort = 'amount_high';
+  }
+  const words = q.replace(/\b(last week|this month|biggest|expense|income)\b/gi, '').trim().split(/\s+/).filter(Boolean);
+  if (words.length > 0 && !spec.description_contains) spec.description_contains = words[0];
+  return { spec, ai_available: false };
+}
+
 export async function suggestTransactionCategory(
   description: string,
   amount?: number,
```
