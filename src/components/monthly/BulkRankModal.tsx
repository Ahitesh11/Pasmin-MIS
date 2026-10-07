import React, { useMemo, useState } from 'react';
import { DailyRankEntry, Employee } from '../../types';
import { X, Loader2, Layers, CheckSquare, Square, Search } from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const rankColor = (rank: number) => {
  if (rank >= 9) return 'bg-emerald-500 text-white';
  if (rank >= 7) return 'bg-emerald-100 text-emerald-800';
  if (rank >= 5) return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-700';
};

interface BulkRankModalProps {
  staff: Employee[];
  defaultFrom: string;
  defaultTo: string;
  minDate: string; // first day of the viewed month
  maxDate: string; // min(last day of month, today)
  getRank: (code: string, date: string) => number | undefined;
  onClose: () => void;
  onSubmit: (entries: DailyRankEntry[]) => Promise<boolean>;
}

export const BulkRankModal: React.FC<BulkRankModalProps> = ({
  staff,
  defaultFrom,
  defaultTo,
  minDate,
  maxDate,
  getRank,
  onClose,
  onSubmit
}) => {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(staff.map(e => e.employeeCode)));
  const [rank, setRank] = useState<number | null>(null);
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const dates = useMemo(() => {
    const list: string[] = [];
    if (!from || !to || from > to) return list;
    const d = new Date(from + 'T00:00:00');
    const end = new Date(to + 'T00:00:00');
    while (d <= end) {
      if (d.getDay() !== 0) list.push(toLocalDate(d)); // Sundays are holidays
      d.setDate(d.getDate() + 1);
    }
    return list;
  }, [from, to]);

  const entries = useMemo<DailyRankEntry[]>(() => {
    if (rank === null) return [];
    const out: DailyRankEntry[] = [];
    staff.forEach(emp => {
      if (!selected.has(emp.employeeCode)) return;
      dates.forEach(date => {
        if (onlyEmpty && getRank(emp.employeeCode, date) !== undefined) return;
        out.push({ employeeCode: emp.employeeCode, date, rank });
      });
    });
    return out;
  }, [staff, selected, dates, rank, onlyEmpty, getRank]);

  const visibleStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? staff.filter(e => e.employeeName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q))
      : staff;
  }, [staff, search]);

  const allSelected = selected.size === staff.length && staff.length > 0;
  const toggle = (code: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const handleApply = async () => {
    if (!entries.length) return;
    setIsSaving(true);
    const ok = await onSubmit(entries);
    setIsSaving(false);
    if (ok) onClose();
  };

  const formatDay = (date: string) =>
    new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const inputClass =
    'w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={() => !isSaving && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-2xl max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-title"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h3 id="bulk-title" className="text-base font-bold text-slate-900">Bulk Rank</h3>
              <p className="text-xs text-slate-500">Give one rank to many employees and dates at once</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {/* 1. Dates */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">1 · Dates</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1">From</span>
                <input
                  type="date"
                  value={from}
                  min={minDate}
                  max={maxDate}
                  onChange={e => setFrom(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1">To</span>
                <input
                  type="date"
                  value={to}
                  min={minDate}
                  max={maxDate}
                  onChange={e => setTo(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="text-xs font-semibold text-slate-500">Sundays are skipped (holiday)</span>
              <span className="text-xs font-semibold text-slate-500">
                {dates.length} {dates.length === 1 ? 'day' : 'days'}
                {dates.length > 0 && ` · ${formatDay(dates[0])} – ${formatDay(dates[dates.length - 1])}`}
              </span>
            </div>
          </div>

          {/* 2. Employees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2 · Employees <span className="text-indigo-600">({selected.size}/{staff.length})</span>
              </div>
              <button
                onClick={() => setSelected(allSelected ? new Set() : new Set(staff.map(e => e.employeeCode)))}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>
            {staff.length > 8 && (
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {visibleStaff.map(emp => {
                const on = selected.has(emp.employeeCode);
                return (
                  <button
                    key={emp.employeeCode}
                    onClick={() => toggle(emp.employeeCode)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer transition-colors ${
                      on ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    {on ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className="flex-1 min-w-0 text-sm font-semibold text-slate-800 truncate">{emp.employeeName}</span>
                    <span className="text-[11px] font-mono text-slate-400">{emp.employeeCode}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Rank */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">3 · Rank</div>
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setRank(n)}
                  className={`h-11 rounded-xl text-sm font-extrabold tabular-nums cursor-pointer transition ${rankColor(n)} ${
                    rank === n ? 'ring-2 ring-offset-2 ring-indigo-600 scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={onlyEmpty}
                onChange={e => setOnlyEmpty(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              <span className="font-medium text-slate-700">Only fill empty cells (don't overwrite existing ranks)</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60 rounded-b-2xl">
          <div className="text-sm text-slate-600">
            {rank === null ? (
              'Choose a rank'
            ) : (
              <>
                <b className="text-slate-900 tabular-nums">{entries.length}</b> cells will be set to{' '}
                <b className="text-slate-900">{rank}/10</b>
              </>
            )}
          </div>
          <button
            onClick={handleApply}
            disabled={isSaving || entries.length === 0}
            className="h-11 px-5 inline-flex items-center gap-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            {isSaving ? 'Saving…' : 'Apply Ranks'}
          </button>
        </div>
      </div>
    </div>
  );
};
