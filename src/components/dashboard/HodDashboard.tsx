import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  Building2,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Star
} from 'lucide-react';
import { getDayLabel, formatScore, isHolidayDay } from '../../utils/rankingUtils';
import { Employee, RankingDay } from '../../types';

export const HodDashboard: React.FC = () => {
  const {
    currentHod,
    myHodEmployees,
    rankingDay,
    setRankingDay,
    setActiveTab,
    setFilterState,
    openRatingModal,
    setSelectedEmployeeForHistory,
    settings
  } = useApp();

  const totalStaff = myHodEmployees.length;

  const todayField = `day${rankingDay}` as keyof Employee;
  const ratedTodayEmployees = myHodEmployees.filter(
    (e) => e[todayField] !== null && e[todayField] !== undefined
  );
  const ratedCount = ratedTodayEmployees.length;
  const pendingCount = totalStaff - ratedCount;
  const completionPercentage = totalStaff > 0 ? Math.round((ratedCount / totalStaff) * 100) : 0;

  const employeesWithAvg = myHodEmployees.filter((e) => e.rankAvg !== null && e.rankAvg !== undefined);
  const avgTeamRank =
    employeesWithAvg.length > 0
      ? Math.round(
          (employeesWithAvg.reduce((sum, e) => sum + (e.rankAvg || 0), 0) / employeesWithAvg.length) * 10
        ) / 10
      : null;

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* 1. Header Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60">
                HOD Portal
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {currentHod.company}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>{currentHod.department}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Welcome, {currentHod.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Daily staff performance evaluation & weekly records.
            </p>
          </div>

          {/* Active Ranking Day Control */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/90 rounded-xl p-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-sky-100/80 flex items-center justify-center text-sky-800 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Active Evaluation Day
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-slate-900">
                  {getDayLabel(rankingDay)}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({settings.currentWeekId})
                </span>
              </div>
            </div>
            <div className="ml-1 pl-2 border-l border-slate-200">
              <select
                value={rankingDay}
                onChange={(e) => setRankingDay(parseInt(e.target.value, 10) as RankingDay)}
                className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                title="Change active evaluation day"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {isHolidayDay(d) ? 'Sun (Holiday)' : `Day ${d}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Security Isolation Notice */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-1">
          <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>HOD Isolation Active: Showing staff strictly under {currentHod.name}</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            {/* Backend Validated · Rule 7 Active */}
          </span>
        </div>
      </div>

      {/* 2. Key Metrics Cards (2x2 on Mobile, 4 Across on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Staff */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {totalStaff}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            {currentHod.department}
          </div>
        </div>

        {/* Card 2: Rated Today */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 sm:p-5 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Rated Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums">
            {ratedCount}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium">
            Completed for Day {rankingDay}
          </div>
        </div>

        {/* Card 3: Pending Today */}
        <div className="bg-white rounded-2xl border border-amber-200/80 p-4 sm:p-5 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Pending Today</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-amber-700 font-mono tabular-nums">
            {pendingCount}
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium">
            Score out of 10 needed
          </div>
        </div>

        {/* Card 4: Average Team Rank */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-800">Team Rank Avg</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-sky-900 font-mono tabular-nums">
            {avgTeamRank !== null ? `${avgTeamRank}/10` : '-'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Cumulative average
          </div>
        </div>
      </div>

      {/* 3. Daily Completion Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-slate-900">
              Today's Evaluation Status
            </span>
            <span className="text-xs text-slate-500 ml-2 font-mono">
              ({ratedCount} of {totalStaff} Staff Rated)
            </span>
          </div>
          <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
            {completionPercentage}% Done
          </span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              completionPercentage === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                : completionPercentage >= 50
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600'
                : 'bg-gradient-to-r from-amber-500 to-orange-500'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {pendingCount > 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
            <span className="text-amber-800 font-medium">
              {pendingCount} staff member{pendingCount > 1 ? 's' : ''} pending evaluation for Day {rankingDay}.
            </span>
            <button
              onClick={() => {
                setFilterState((prev) => ({ ...prev, statusFilter: 'PENDING' }));
                setActiveTab('dailyRanking');
              }}
              className="font-bold text-white bg-sky-700 hover:bg-sky-800 px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors self-start sm:self-auto"
            >
              <span>Rate Pending Staff ({pendingCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-xs text-emerald-800 flex items-center gap-1.5 font-bold pt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Great job! All team members evaluated for Day {rankingDay}.</span>
          </div>
        )}
      </div>

      {/* 4. Quick Team Action List (Mobile Card + Desktop Table) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Team Overview: {currentHod.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant daily evaluation status for your team
            </p>
          </div>
          <button
            onClick={() => setActiveTab('dailyRanking')}
            className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer"
          >
            <span>Full List</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile View: Quick Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {myHodEmployees.map((emp) => {
            const todayScore = emp[todayField];
            const isRated = todayScore !== null && todayScore !== undefined;

            return (
              <div key={emp.employeeCode} className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded">
                      {emp.employeeCode}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">{emp.location}</span>
                  </div>
                  <button
                    onClick={() => setSelectedEmployeeForHistory(emp)}
                    className="text-sm font-bold text-slate-900 hover:text-sky-700 text-left truncate block mt-0.5"
                  >
                    {emp.employeeName}
                  </button>
                  <div className="text-xs text-slate-500 truncate">{emp.designation}</div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {isRated ? (
                    <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {todayScore}/10
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      Pending
                    </span>
                  )}

                  <button
                    onClick={() => openRatingModal(emp, rankingDay)}
                    disabled={isHolidayDay(rankingDay)}
                    title={isHolidayDay(rankingDay) ? 'Sunday is a holiday' : undefined}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none ${
                      isRated
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-sky-700 hover:bg-sky-800 text-white shadow-xs'
                    }`}
                  >
                    {isHolidayDay(rankingDay) ? 'Holiday' : isRated ? 'Edit' : 'Rate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Employee Code</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Today Rank (D{rankingDay})</th>
                <th className="py-3 px-4 text-right">Rank Avg</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myHodEmployees.map((emp) => {
                const todayScore = emp[todayField];
                const isRated = todayScore !== null && todayScore !== undefined;

                return (
                  <tr key={emp.employeeCode} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-900">
                      {emp.employeeCode}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedEmployeeForHistory(emp)}
                        className="font-bold text-slate-900 hover:text-sky-700 text-left cursor-pointer"
                      >
                        {emp.employeeName}
                      </button>
                      <div className="text-[11px] text-slate-400">
                        {emp.attendanceMode} · {emp.incentiveCategory}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{emp.designation}</td>
                    <td className="py-3 px-4 text-slate-600">{emp.location}</td>
                    <td className="py-3 px-4 text-center">
                      {isRated ? (
                        <span className="font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {todayScore}/10 (Rated)
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Not Rated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {emp.rankAvg !== null ? `${emp.rankAvg}/10` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openRatingModal(emp, rankingDay)}
                        disabled={isHolidayDay(rankingDay)}
                        title={isHolidayDay(rankingDay) ? 'Sunday is a holiday' : undefined}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none ${
                          isRated
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            : 'bg-sky-700 hover:bg-sky-800 text-white shadow-xs'
                        }`}
                      >
                        {isHolidayDay(rankingDay) ? 'Holiday' : isRated ? 'Edit Rank' : 'Give Rank'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
