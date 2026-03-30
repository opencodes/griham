export interface SmsParseHistoryItem {
  id: string;
  familyId: string;
  createdAt: string;
  inputPreview: string;
  amount?: number | null;
  category?: string | null;
  type?: string | null;
  created: boolean;
  transactionId?: string | null;
  aiModelId?: string | null;
}

const STORAGE_KEY = 'griham:ai:sms-parse-history';
const MAX_HISTORY_ITEMS = 12;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getSmsParseHistory(): SmsParseHistoryItem[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as SmsParseHistoryItem[] : [];
  } catch {
    return [];
  }
}

export function recordSmsParseHistory(item: SmsParseHistoryItem): void {
  if (!canUseStorage()) return;

  const next = [item, ...getSmsParseHistory()].slice(0, MAX_HISTORY_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
