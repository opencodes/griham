import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFinanceMonthOptional } from '@/contexts/FinanceMonthContext';

export function FinanceMonthFilter() {
  const ctx = useFinanceMonthOptional();
  if (!ctx) return null;

  const { monthLabel, goPrev, goNext, canGoPrev, canGoNext } = ctx;

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] px-2 py-1.5">
      <button
        type="button"
        onClick={goNext}
        disabled={!canGoNext}
        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none text-[var(--app-fg)]"
        aria-label="Previous month (older)"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="min-w-[5rem] text-center text-sm font-medium text-[var(--app-fg)]">
        {monthLabel}
      </span>
      <button
        type="button"
        onClick={goPrev}
        disabled={!canGoPrev}
        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none text-[var(--app-fg)]"
        aria-label="Next month (newer)"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
