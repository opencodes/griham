import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

const MAX_MONTHS_BACK = 11;

function getCurrentMonthKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthKeyToDate(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function addMonths(key: string, delta: number): string {
  const d = monthKeyToDate(key);
  d.setMonth(d.getMonth() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export interface FinanceMonthContextValue {
  /** Selected month in YYYY-MM format */
  month: string;
  /** Human-readable label e.g. "Mar 2026" */
  monthLabel: string;
  goPrev: () => void;
  goNext: () => void;
  /** Can go to a more recent month (toward current) */
  canGoPrev: boolean;
  /** Can go to an older month (up to 11 months back) */
  canGoNext: boolean;
}

const FinanceMonthContext = createContext<FinanceMonthContextValue | null>(null);

export function FinanceMonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(getCurrentMonthKey);

  const currentKey = getCurrentMonthKey();
  const selectedDate = monthKeyToDate(month);

  const canGoPrev = month < currentKey;
  const canGoNext = useMemo(() => {
    const oldest = addMonths(currentKey, -MAX_MONTHS_BACK);
    return month > oldest;
  }, [month, currentKey]);

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    setMonth((prev) => addMonths(prev, 1));
  }, [canGoPrev]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    setMonth((prev) => addMonths(prev, -1));
  }, [canGoNext]);

  const monthLabel = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [month]);

  const value: FinanceMonthContextValue = useMemo(
    () => ({ month, monthLabel, goPrev, goNext, canGoPrev, canGoNext }),
    [month, monthLabel, goPrev, goNext, canGoPrev, canGoNext]
  );

  return (
    <FinanceMonthContext.Provider value={value}>
      {children}
    </FinanceMonthContext.Provider>
  );
}

export function useFinanceMonth(): FinanceMonthContextValue {
  const ctx = useContext(FinanceMonthContext);
  if (!ctx) throw new Error('useFinanceMonth must be used within FinanceMonthProvider');
  return ctx;
}

export function useFinanceMonthOptional(): FinanceMonthContextValue | null {
  return useContext(FinanceMonthContext);
}
