import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Shield,
  Users,
  Building2,
  Calendar,
  Settings,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  RefreshCw,
  Eye
} from 'lucide-react';
import { getDayLabel } from '../../utils/rankingUtils';
import { getInitials } from '../layout/Sidebar';
import { RankingDay, HODProfile } from '../../types';

export const AdminDashboard: React.FC = () => {
  const {
    availableHods,
    employees,
    rankingDay,
    setRankingDay,
    settings,
    updateSettings,
    setCurrentHod,
    setCurrentRole,
    setActiveTab,
    setFilterState,
    setSelectedEmployeeForHistory,
    refreshAllData,
    isLoading
  } = useApp();

  const [selectedHodDrilldown, setSelectedHodDrilldown] = useState<string>('');

  // Overall Organization Metrics
  const totalEmployees = employees.length;
  const todayField = `day${rankingDay}` as const;
  const ratedTodayTotal = employees.filter((e) => e[todayField] !== null && e[todayField] !== undefined).length;
  const pendingTodayTotal = totalEmployees - ratedTodayTotal;
  const overallCompletion = totalEmployees > 0 ? Math.round((ratedTodayTotal / totalEmployees) * 100) : 0;

  const ratedEmployees = employees.filter((e) => e.rankAvg !== null);
  const overallAvgRank =
    ratedEmployees.length > 0
      ? Math.round((ratedEmployees.reduce((sum, e) => sum + (e.rankAvg || 0), 0) / ratedEmployees.length) * 10) / 10
      : null;

  // HOD Drilldown Employees
  const drilldownEmployees = selectedHodDrilldown
    ? employees.filter((e) => e.hodName.toLowerCase() === selectedHodDrilldown.toLowerCase())
    : [];

  const stats = [
    {
      label: 'Total Staff',
      value: String(totalEmployees),
      sub: `Across ${availableHods.length} HODs`,
      icon: Users,
      valueClass: 'text-slate-900',
      iconClass: 'bg-slate-100 text-slate-700'
    },
    {
      label: `Rated Today · Day ${rankingDay}`,
      value: String(ratedTodayTotal),
      sub: `${overallCompletion}% overall completion`,
      icon: CheckCircle2,
      valueClass: 'text-emerald-600',
      iconClass: 'bg-emerald-50 text-emerald-600'
    },
    {
      label: 'Pending Ratings',
      value: String(pendingTodayTotal),
      sub: 'Action needed from HODs',
      icon: Clock,
      valueClass: 'text-amber-600',
      iconClass: 'bg-amber-50 text-amber-600'
    },
    {
      label: 'Organization Avg Rank',
      value: overallAvgRank !== null ? `${overallAvgRank}/10` : '—',
      sub: 'Cumulative average',
      icon: TrendingUp,
      valueClass: 'text-blue-600',
      iconClass: 'bg-blue-50 text-blue-600'
    }
  ];

  const card = 'bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]';

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      {/* 1. Master console header + KPIs */}
      <section className={`${card} p-6 sm:p-8`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
              <Shield className="w-3.5 h-3.5" />
              System Administration & Organization Health
            </div>
            <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              HOD Daily Ranking Master Console
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Cross-department oversight, completion tracking, and cycle management.
            </p>
          </div>

          <button
            onClick={() => refreshAllData()}
            disabled={isLoading}
            className="shrink-0 inline-flex items-center gap-2 h-11 px-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/25 transition-colors cursor-pointer disabled:opacity-60"
            title="Reload latest data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">{s.label}</span>
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.iconClass}`}>
                  <s.icon className="w-5 h-5" />
                </span>
              </div>
              <div className={`mt-3 text-4xl font-extrabold tracking-tight tabular-nums ${s.valueClass}`}>{s.value}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Ranking cycle configuration */}
      <section className={`${card} p-6 sm:p-8`}>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Ranking Cycle & Auto-Detection Configuration</h3>
            <p className="text-sm text-slate-500">Section 5 · applies to every HOD</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 p-5">
            <label htmlFor="activeDay" className="block text-sm font-bold text-slate-800">
              Active Evaluation Day
            </label>
            <select
              id="activeDay"
              value={rankingDay}
              onChange={(e) => setRankingDay(parseInt(e.target.value, 10) as RankingDay)}
              className="mt-3 w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {getDayLabel(d as RankingDay)}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">Sets the active Day column for all HOD evaluations.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <span className="block text-sm font-bold text-slate-800">Automatic Day Detection</span>
            <label className="mt-3 flex items-center justify-between gap-3 h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="text-sm font-semibold text-slate-700">Auto-sync with calendar</span>
              <input
                type="checkbox"
                checked={settings.autoDetectDay}
                onChange={(e) => updateSettings({ autoDetectDay: e.target.checked })}
                className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">Monday &rarr; Day 1, Sunday &rarr; Day 7.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <label htmlFor="weekId" className="block text-sm font-bold text-slate-800">
              Active Week Cycle ID
            </label>
            <input
              id="weekId"
              type="text"
              value={settings.currentWeekId}
              onChange={(e) => updateSettings({ currentWeekId: e.target.value, autoDetectDay: false })}
              className="mt-3 w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 2026-W40"
            />
            <p className="mt-2 text-xs text-slate-500">Used when submitting weekly records.</p>
          </div>
        </div>
      </section>

      {/* 3. HOD-wise table */}
      <section className={`${card} overflow-hidden`}>
        <div className="px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">HOD-Wise Staff Count & Ranking Completion</h3>
            <p className="text-sm text-slate-500">Open a HOD to inspect their team, or view the app as that HOD.</p>
          </div>
          <span className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Evaluation Day {rankingDay}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 pl-6 sm:pl-8 pr-3">HOD Name</th>
                <th className="py-3.5 px-3">Company</th>
                <th className="py-3.5 px-3 text-center">Staff</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Rated</th>
                <th className="py-3.5 px-3 text-center">Pending</th>
                <th className="py-3.5 px-3 min-w-[140px]">Completion</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Team Avg</th>
                <th className="py-3.5 pl-3 pr-6 sm:pr-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {availableHods.map((hod) => {
                const hodStaff = employees.filter((e) => e.hodName.toLowerCase() === hod.name.toLowerCase());
                const staffCount = hodStaff.length;
                const ratedCount = hodStaff.filter((e) => e[todayField] !== null && e[todayField] !== undefined).length;
                const pendingCount = staffCount - ratedCount;
                const pct = staffCount > 0 ? Math.round((ratedCount / staffCount) * 100) : 0;

                const withAvg = hodStaff.filter((e) => e.rankAvg !== null);
                const avgRank =
                  withAvg.length > 0
                    ? Math.round((withAvg.reduce((s, e) => s + (e.rankAvg || 0), 0) / withAvg.length) * 10) / 10
                    : null;

                const isSelected = selectedHodDrilldown === hod.name;
                const barColor = pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500';

                return (
                  <tr key={hod.name} className={`transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'}`}>
                    <td className="py-4 pl-6 sm:pl-8 pr-3">
                      <button
                        onClick={() => setSelectedHodDrilldown(isSelected ? '' : hod.name)}
                        className="flex items-center gap-3 text-left cursor-pointer group"
                      >
                        <span className="w-9 h-9 shrink-0 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                          {getInitials(hod.name)}
                        </span>
                        <span className="font-bold text-slate-900 group-hover:text-indigo-700 whitespace-nowrap">{hod.name}</span>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? 'rotate-90 text-indigo-600' : ''}`}
                        />
                      </button>
                    </td>
                    <td className="py-4 px-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-xs font-semibold text-slate-600 whitespace-nowrap">
                        {hod.company || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center font-bold text-slate-800 tabular-nums">{staffCount}</td>
                    <td className="py-4 px-3 text-center font-bold text-emerald-600 tabular-nums">{ratedCount}</td>
                    <td className="py-4 px-3 text-center font-bold text-amber-600 tabular-nums">{pendingCount}</td>
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-10 text-right text-xs font-bold text-slate-700 tabular-nums">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-right font-bold text-blue-600 tabular-nums whitespace-nowrap">
                      {avgRank !== null ? `${avgRank}/10` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-4 pl-3 pr-6 sm:pr-8">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedHodDrilldown(isSelected ? '' : hod.name)}
                          className="h-9 px-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer whitespace-nowrap"
                        >
                          {isSelected ? 'Hide' : 'Team'}
                        </button>
                        <button
                          onClick={() => {
                            setCurrentHod(hod.name);
                            setActiveTab('dashboard');
                          }}
                          className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 cursor-pointer whitespace-nowrap"
                          title="View the app as this HOD"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View as
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. HOD Team Drilldown View (When HOD row is clicked) */}
      {selectedHodDrilldown && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] overflow-hidden">
          <div className="px-6 py-4 bg-sky-50/50 border-b border-sky-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Team Members under {selectedHodDrilldown}</span>
                <span className="font-mono text-xs text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                  {drilldownEmployees.length} Staff
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin inspection mode for {selectedHodDrilldown}'s department
              </p>
            </div>
            <button
              onClick={() => setSelectedHodDrilldown('')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Close Drilldown
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Designation</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4 text-center">Day {rankingDay} Rank</th>
                  <th className="py-2.5 px-4 text-right">Rank Avg</th>
                  <th className="py-2.5 px-4 text-center">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {drilldownEmployees.map((emp) => {
                  const score = emp[todayField];
                  return (
                    <tr key={emp.employeeCode} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-bold text-slate-700">{emp.employeeCode}</td>
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        {emp.employeeName}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">{emp.designation}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">{emp.location}</td>
                      <td className="py-2.5 px-4 text-center">
                        {score !== null && score !== undefined ? (
                          <span className="text-emerald-700 font-bold">{score}/10</span>
                        ) : (
                          <span className="text-amber-700 font-medium font-sans">Pending</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {emp.rankAvg !== null ? `${emp.rankAvg}/10` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center font-sans">
                        <button
                          onClick={() => setSelectedEmployeeForHistory(emp)}
                          className="text-xs text-sky-700 hover:text-sky-900 underline font-medium cursor-pointer"
                        >
                          View 7 Days
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
