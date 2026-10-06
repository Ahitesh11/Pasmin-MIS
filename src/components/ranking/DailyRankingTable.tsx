import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Filter,
  X,
  History,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Star
} from 'lucide-react';
import { getDayLabel } from '../../utils/rankingUtils';
import { Employee, RankingDay } from '../../types';

export const DailyRankingTable: React.FC = () => {
  const {
    currentHod,
    currentRole,
    myHodEmployees,
    filteredEmployees,
    filterState,
    setFilterState,
    resetFilters,
    rankingDay,
    setRankingDay,
    openRatingModal,
    setSelectedEmployeeForHistory,
    settings
  } = useApp();

  const [showFilters, setShowFilters] = useState(false);

  const todayField = `day${rankingDay}` as keyof Employee;

  // Completion metrics for current HOD team
  const basePool = currentRole === 'HOD' ? myHodEmployees : filteredEmployees;
  const totalInPool = basePool.length;
  const ratedInPool = basePool.filter((e) => e[todayField] !== null && e[todayField] !== undefined).length;
  const pendingInPool = totalInPool - ratedInPool;
  const completionPct = totalInPool > 0 ? Math.round((ratedInPool / totalInPool) * 100) : 0;

  // Extract filter options
  const companies = Array.from(new Set(filteredEmployees.map((e) => e.company))).filter(Boolean);
  const locations = Array.from(new Set(filteredEmployees.map((e) => e.location))).filter(Boolean);
  const designations = Array.from(new Set(filteredEmployees.map((e) => e.designation))).filter(Boolean);

  const hasActiveFilters =
    Boolean(filterState.search) ||
    Boolean(filterState.company) ||
    Boolean(filterState.location) ||
    Boolean(filterState.designation) ||
    Boolean(filterState.attendanceMode) ||
    Boolean(filterState.incentiveCategory) ||
    filterState.statusFilter !== 'ALL';

  return (
    <div className="space-y-4 pb-16 md:pb-6">
      {/* 1. Header & Live Day Ribbon */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">
                {currentRole === 'HOD' ? `HOD: ${currentHod.name}` : 'Admin View (All Staff)'}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-500 font-medium">{currentHod.department}</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Daily Staff Ranking ({getDayLabel(rankingDay)})
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Select score (1 to 10) for each employee. Blank days will not affect rank average.
            </p>
          </div>

          {/* Day Navigation Pills */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none shrink-0">
            {([1, 2, 3, 4, 5, 6, 7] as RankingDay[]).map((d) => {
              const isCurrent = rankingDay === d;
              return (
                <button
                  key={d}
                  onClick={() => setRankingDay(d)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    isCurrent
                      ? 'bg-sky-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Day {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Today's Evaluation Summary Ribbon */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Total Staff: </span>
              <strong className="text-slate-900 font-mono">{totalInPool}</strong>
            </div>
            <div className="text-emerald-700">
              <span className="font-medium">Rated: </span>
              <strong className="font-mono">{ratedInPool}</strong>
            </div>
            <div className="text-amber-700">
              <span className="font-medium">Pending: </span>
              <strong className="font-mono">{pendingInPool}</strong>
            </div>
            <div className="hidden sm:block text-slate-400">·</div>
            <div className="hidden sm:block font-bold text-sky-800 font-mono">
              {completionPct}% Complete
            </div>
          </div>

          {/* Quick Progress Bar */}
          <div className="w-full sm:w-48 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                completionPct === 100
                  ? 'bg-emerald-500'
                  : completionPct >= 50
                  ? 'bg-sky-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Instant Search & Fast Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Employee Name or Code..."
              value={filterState.search}
              onChange={(e) => setFilterState((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
            {filterState.search && (
              <button
                onClick={() => setFilterState((prev) => ({ ...prev, search: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Fast Status Segmented Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold shrink-0">
              <button
                onClick={() => setFilterState((prev) => ({ ...prev, statusFilter: 'ALL' }))}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterState.statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({filteredEmployees.length})
              </button>
              <button
                onClick={() => setFilterState((prev) => ({ ...prev, statusFilter: 'PENDING' }))}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterState.statusFilter === 'PENDING'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingInPool})
              </button>
              <button
                onClick={() => setFilterState((prev) => ({ ...prev, statusFilter: 'RATED' }))}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterState.statusFilter === 'RATED'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rated ({ratedInPool})
              </button>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                showFilters || hasActiveFilters
                  ? 'bg-sky-50 border-sky-300 text-sky-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-sky-600 ml-0.5"></span>}
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-slate-500 hover:text-slate-900 underline shrink-0 cursor-pointer ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Detailed Filter Row */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs animate-in fade-in duration-150">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Company</label>
              <select
                value={filterState.company}
                onChange={(e) => setFilterState((prev) => ({ ...prev, company: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-medium"
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Location</label>
              <select
                value={filterState.location}
                onChange={(e) => setFilterState((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-medium"
              >
                <option value="">All Locations</option>
                {locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Designation</label>
              <select
                value={filterState.designation}
                onChange={(e) => setFilterState((prev) => ({ ...prev, designation: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-medium"
              >
                <option value="">All Designations</option>
                {designations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 3. MOBILE CARD LIST (Optimized specifically for mobile phone view) */}
      <div className="md:hidden space-y-3">
        {filteredEmployees.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-xs">
            <p className="font-semibold text-slate-700">No staff members found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search or filters</p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-xs cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredEmployees.map((emp) => {
            const todayScore = emp[todayField];
            const isRated = todayScore !== null && todayScore !== undefined;

            return (
              <div
                key={emp.employeeCode}
                className={`bg-white rounded-2xl border transition-all shadow-xs p-4 space-y-3 ${
                  isRated ? 'border-slate-200/90' : 'border-amber-200 bg-amber-50/15'
                }`}
              >
                {/* Employee Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/70">
                        {emp.employeeCode}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {emp.location} · {emp.attendanceMode}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedEmployeeForHistory(emp)}
                      className="text-base font-bold text-slate-900 hover:text-sky-700 text-left mt-1 block truncate cursor-pointer"
                    >
                      {emp.employeeName}
                    </button>
                    <div className="text-xs text-slate-600 truncate">{emp.designation}</div>
                  </div>

                  {/* 7-Day History Button */}
                  <button
                    onClick={() => setSelectedEmployeeForHistory(emp)}
                    className="p-2 text-slate-400 hover:text-sky-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="View 7-day history ledger"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>

                {/* Score Status Strip */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 block font-medium">
                      Today's Rank (D{rankingDay})
                    </span>
                    {isRated ? (
                      <span className="font-mono font-bold text-emerald-700 text-sm flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{todayScore} / 10</span>
                      </span>
                    ) : (
                      <span className="font-medium text-amber-700 text-xs flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Not Rated</span>
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-right">
                    <span className="text-[11px] text-slate-500 block font-medium">
                      Rank Average
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                      {emp.rankAvg !== null ? `${emp.rankAvg} / 10` : '-'}
                    </span>
                  </div>
                </div>

                {/* Fast Action Button */}
                <button
                  onClick={() => openRatingModal(emp, rankingDay)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                    isRated
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                      : 'bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white shadow-sky-200'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${isRated ? 'text-amber-500 fill-amber-500' : 'text-white'}`} />
                  <span>{isRated ? `Change Score (${todayScore}/10)` : 'Give Daily Ranking (1-10)'}</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 4. DESKTOP HIGH-DENSITY TABLE */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Employee Code</th>
              <th className="py-3.5 px-4">Employee Name</th>
              <th className="py-3.5 px-4">Designation</th>
              <th className="py-3.5 px-4">Location</th>
              <th className="py-3.5 px-4 text-center">Today Rank (Day {rankingDay})</th>
              <th className="py-3.5 px-4 text-right">Rank Avg</th>
              <th className="py-3.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="max-w-xs mx-auto">
                    <p className="font-semibold text-slate-700">No staff members found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Adjust your search or filter options.
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const todayScore = emp[todayField];
                const isRated = todayScore !== null && todayScore !== undefined;

                return (
                  <tr
                    key={emp.employeeCode}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Code */}
                    <td className="py-3 px-4 font-mono font-bold text-sky-900">
                      {emp.employeeCode}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedEmployeeForHistory(emp)}
                          className="font-bold text-slate-900 hover:text-sky-700 text-left cursor-pointer"
                        >
                          {emp.employeeName}
                        </button>
                        <button
                          onClick={() => setSelectedEmployeeForHistory(emp)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                          title="View 7-day history ledger"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{emp.attendanceMode}</span>
                        <span>·</span>
                        <span>{emp.incentiveCategory}</span>
                        {currentRole === 'ADMIN' && (
                          <>
                            <span>·</span>
                            <span className="text-sky-700 font-semibold">HOD: {emp.hodName}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Designation */}
                    <td className="py-3 px-4 text-slate-700 font-medium">{emp.designation}</td>

                    {/* Location */}
                    <td className="py-3 px-4 text-slate-600">{emp.location}</td>

                    {/* Today Rank */}
                    <td className="py-3 px-4 text-center">
                      {isRated ? (
                        <div className="inline-flex items-center gap-1.5 text-emerald-800 font-mono font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{todayScore} / 10</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-amber-800 font-medium text-xs bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Not Rated</span>
                        </div>
                      )}
                    </td>

                    {/* Rank Avg */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {emp.rankAvg !== null ? (
                        <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-lg">
                          {emp.rankAvg} / 10
                        </span>
                      ) : (
                        <span className="text-slate-300 font-sans">-</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openRatingModal(emp, rankingDay)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          isRated
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            : 'bg-sky-700 hover:bg-sky-800 text-white shadow-xs'
                        }`}
                      >
                        {isRated ? 'Edit Score' : 'Give Score'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
