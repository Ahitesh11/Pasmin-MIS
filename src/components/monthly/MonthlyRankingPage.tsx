import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/apiService';
import { DailyRankEntry, Employee } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RefreshCw,
  Search,
  X,
  Loader2,
  Lock,
  Eraser,
  Layers
} from 'lucide-react';
import { BulkRankModal } from './BulkRankModal';
import { getCurrentWeekId, getWeekDateRange } from '../../utils/rankingUtils';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toMonthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const cellColor = (rank: number) => {
  if (rank >= 9) return 'bg-emerald-500 text-white';
  if (rank >= 7) return 'bg-emerald-100 text-emerald-800';
  if (rank >= 5) return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-700';
};

const avg = (nums: number[]) =>
  nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;

export const MonthlyRankingPage: React.FC = () => {
  const { settings, currentRole, currentHod, myHodEmployees, employees, availableHods, showNotification, reloadStaff } = useApp();

  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [entries, setEntries] = useState<Record<string, number>>({}); // key: `${code}|${date}`
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [hodFilter, setHodFilter] = useState('');
  const [editing, setEditing] = useState<{ emp: Employee; date: string } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ from: string; to: string } | null>(null);

  const canEdit = currentRole === 'HOD';
  const currentWeekStart = getWeekDateRange(getCurrentWeekId()).startDate;
  const today = toLocalDate(new Date());

  const [year, monthIndex] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const dates = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(year, monthIndex - 1, i + 1);
        return { date: toLocalDate(d), day: i + 1, weekday: d.getDay() };
      }),
    [year, monthIndex, daysInMonth]
  );
  const elapsedDates = dates.filter(d => d.date <= today);
  const monthLabel = new Date(year, monthIndex - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const isCurrentMonth = month === toMonthKey(new Date());

  const staff = useMemo(() => {
    const base = currentRole === 'HOD'
      ? myHodEmployees
      : hodFilter
        ? employees.filter(e => e.hodName.toLowerCase() === hodFilter.toLowerCase())
        : employees;
    const q = search.trim().toLowerCase();
    return q
      ? base.filter(e => e.employeeName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q))
      : base;
  }, [currentRole, myHodEmployees, employees, hodFilter, search]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const list: DailyRankEntry[] = await apiService.fetchMonthlyRanks(
        settings.scriptUrl,
        month,
        currentRole === 'HOD' ? currentHod.name : undefined
      );
      const map: Record<string, number> = {};
      list.forEach(e => (map[`${e.employeeCode.toUpperCase()}|${e.date}`] = e.rank));
      setEntries(map);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to load monthly ranks', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [settings.scriptUrl, month, currentRole, currentHod.name]);

  useEffect(() => {
    load();
  }, [load]);

  const getRank = (code: string, date: string) => entries[`${code.toUpperCase()}|${date}`];

  const saveRank = async (emp: Employee, date: string, rank: number | null) => {
    const key = `${emp.employeeCode.toUpperCase()}|${date}`;
    const previous = entries[key];
    setEditing(null);
    setSavingKey(key);
    setEntries(prev => {
      const next = { ...prev };
      if (rank === null) delete next[key];
      else next[key] = rank;
      return next;
    });

    const res = await apiService.saveDailyRank(settings.scriptUrl, emp.employeeCode, currentHod.name, date, rank);
    setSavingKey(null);
    if (res.status !== 'success') {
      setEntries(prev => {
        const next = { ...prev };
        if (previous === undefined) delete next[key];
        else next[key] = previous;
        return next;
      });
      showNotification(res.message || 'Failed to save rank', 'error');
      return;
    }
    if (date >= currentWeekStart) reloadStaff(); // this week's Day columns were updated too
  };

  const monthStart = dates[0]?.date || '';
  const monthEnd = dates[dates.length - 1]?.date || '';
  const maxBulkDate = monthEnd < today ? monthEnd : today;

  const openBulk = (date?: string) => {
    if (!canEdit || monthStart > today) return;
    setBulk({ from: date || monthStart, to: date || maxBulkDate });
  };

  const saveBulk = async (list: DailyRankEntry[]) => {
    const res = await apiService.saveDailyRanksBulk(settings.scriptUrl, currentHod.name, list);
    if (res.status === 'success') {
      showNotification(res.message || 'Ranks saved', 'success');
      await load();
      if (list.some(e => e.date >= currentWeekStart)) reloadStaff();
      return true;
    }
    showNotification(res.message || 'Bulk save failed', 'error');
    return false;
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(year, monthIndex - 1 + delta, 1);
    if (toMonthKey(d) > toMonthKey(new Date())) return;
    setMonth(toMonthKey(d));
  };

  // KPIs
  const expected = staff.length * elapsedDates.length;
  const given = staff.reduce(
    (sum, e) => sum + elapsedDates.filter(d => getRank(e.employeeCode, d.date) !== undefined).length,
    0
  );
  const allRanks = staff.flatMap(e =>
    dates.map(d => getRank(e.employeeCode, d.date)).filter((r): r is number => r !== undefined)
  );
  const monthAvg = avg(allRanks);
  const completion = expected > 0 ? Math.round((given / expected) * 100) : 0;

  const card = 'bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]';

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <section className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Monthly Ranking</h2>
              <p className="text-sm text-slate-500">
                {canEdit ? `Rank ${currentHod.name}'s team for any date of the month` : 'Organization-wide date-wise ranks (read only)'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                onClick={() => openBulk()}
                disabled={monthStart > today}
                className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 cursor-pointer disabled:opacity-50"
              >
                <Layers className="w-4 h-4" />
                Bulk Rank
              </button>
            )}
            <button
              onClick={() => shiftMonth(-1)}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="h-10 min-w-[150px] px-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-800">
              {monthLabel}
            </div>
            <button
              onClick={() => shiftMonth(1)}
              disabled={isCurrentMonth}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={load}
              disabled={isLoading}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer disabled:opacity-50"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Staff', value: String(staff.length), cls: 'text-slate-900' },
            { label: 'Ranks Given', value: `${given}/${expected}`, cls: 'text-emerald-600' },
            { label: 'Completion', value: `${completion}%`, cls: 'text-indigo-600' },
            { label: 'Month Avg', value: monthAvg !== null ? `${monthAvg}/10` : '—', cls: 'text-blue-600' }
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3">
              <div className="text-xs font-semibold text-slate-500">{k.label}</div>
              <div className={`mt-1 text-2xl font-extrabold tabular-nums ${k.cls}`}>{k.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className={`${card} overflow-hidden`}>
        <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee name or code…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {currentRole === 'ADMIN' && (
            <select
              value={hodFilter}
              onChange={e => setHodFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              aria-label="Filter by HOD"
            >
              <option value="">All HODs</option>
              {availableHods.map(h => (
                <option key={h.name} value={h.name}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
          <div className="sm:ml-auto flex items-center gap-3 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" />9–10</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100" />7–8</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100" />5–6</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-100" />1–4</span>
          </div>
        </div>

        {canEdit && (
          <div className="px-5 sm:px-6 py-2 bg-indigo-50/50 border-b border-indigo-100 text-xs font-medium text-indigo-800">
            Tip: click a date at the top to rank all staff for that day at once, or use “Bulk Rank” for a date range.
          </div>
        )}

        {!canEdit && (
          <div className="px-5 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-100 text-xs font-medium text-amber-800 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            Admin view is read only. Use “View as” in the sidebar to rank a HOD's team.
          </div>
        )}

        <div className="overflow-auto max-h-[calc(100dvh-280px)] min-h-[200px]">
          <table className="border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50 border-b border-r border-slate-200 px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 min-w-[200px]">
                  Employee
                </th>
                {dates.map(d => {
                  const isToday = d.date === today;
                  const clickable = canEdit && d.date <= today;
                  return (
                    <th
                      key={d.date}
                      className={`border-b border-slate-200 p-0 text-center font-bold min-w-[34px] ${
                        isToday ? 'bg-indigo-600 text-white' : d.weekday === 0 ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      <button
                        disabled={!clickable}
                        onClick={() => openBulk(d.date)}
                        className={`w-full px-0.5 py-1.5 ${clickable ? 'cursor-pointer hover:bg-indigo-100 hover:text-indigo-700' : 'cursor-default'}`}
                        title={clickable ? `Bulk rank all staff for ${d.date}` : undefined}
                      >
                        <div className="text-[9px] font-semibold opacity-80">{WEEKDAY[d.weekday]}</div>
                        <div className="tabular-nums">{d.day}</div>
                      </button>
                    </th>
                  );
                })}
                <th className="sticky right-0 z-30 bg-slate-50 border-b border-l border-slate-200 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 min-w-[72px]">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map(emp => {
                const ranks = dates
                  .map(d => getRank(emp.employeeCode, d.date))
                  .filter((r): r is number => r !== undefined);
                const empAvg = avg(ranks);
                return (
                  <tr key={emp.employeeCode} className="group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-r border-slate-100 px-4 py-2">
                      <div className="font-bold text-slate-900 text-[13px] truncate max-w-[180px]">{emp.employeeName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{emp.employeeCode}</div>
                    </td>
                    {dates.map(d => {
                      const rank = getRank(emp.employeeCode, d.date);
                      const isFuture = d.date > today;
                      const key = `${emp.employeeCode.toUpperCase()}|${d.date}`;
                      const disabled = !canEdit || isFuture;
                      return (
                        <td
                          key={d.date}
                          className={`border-b border-slate-100 p-0.5 text-center ${d.weekday === 0 ? 'bg-slate-50/70' : ''} ${
                            d.date === today ? 'bg-indigo-50/60' : ''
                          }`}
                        >
                          <button
                            disabled={disabled}
                            onClick={() => setEditing({ emp, date: d.date })}
                            className={`w-8 h-8 rounded-lg text-[12px] font-bold tabular-nums transition ${
                              rank !== undefined
                                ? cellColor(rank)
                                : isFuture
                                  ? 'text-slate-200'
                                  : 'text-slate-300 border border-dashed border-slate-200'
                            } ${disabled ? 'cursor-default' : 'cursor-pointer hover:ring-2 hover:ring-indigo-400'}`}
                            title={`${emp.employeeName} · ${d.date}${rank !== undefined ? ` · ${rank}/10` : ''}`}
                          >
                            {savingKey === key ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                            ) : rank !== undefined ? (
                              rank
                            ) : isFuture ? (
                              ''
                            ) : (
                              '+'
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 border-b border-l border-slate-100 px-3 py-2 text-center">
                      <div className="text-sm font-extrabold text-blue-600 tabular-nums">{empAvg !== null ? empAvg : '—'}</div>
                      <div className="text-[10px] text-slate-400">{ranks.length} days</div>
                    </td>
                  </tr>
                );
              })}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={dates.length + 2} className="px-6 py-12 text-center text-sm text-slate-500">
                    {isLoading ? 'Loading…' : 'No staff found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {bulk && (
        <BulkRankModal
          staff={staff}
          defaultFrom={bulk.from}
          defaultTo={bulk.to}
          minDate={monthStart}
          maxDate={maxBulkDate}
          getRank={getRank}
          onClose={() => setBulk(null)}
          onSubmit={saveBulk}
        />
      )}

      {/* Rank picker */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl p-5"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-bold text-slate-900">{editing.emp.employeeName}</div>
                <div className="text-xs font-medium text-slate-500">
                  {new Date(editing.date + 'T00:00:00').toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                const current = getRank(editing.emp.employeeCode, editing.date) === n;
                return (
                  <button
                    key={n}
                    onClick={() => saveRank(editing.emp, editing.date, n)}
                    className={`h-12 rounded-xl text-base font-extrabold tabular-nums transition cursor-pointer ${
                      current ? 'ring-2 ring-offset-2 ring-indigo-600 ' : ''
                    }${cellColor(n)} hover:brightness-95`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            {getRank(editing.emp.employeeCode, editing.date) !== undefined && (
              <button
                onClick={() => saveRank(editing.emp, editing.date, null)}
                className="mt-3 w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <Eraser className="w-4 h-4" />
                Clear rank
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
