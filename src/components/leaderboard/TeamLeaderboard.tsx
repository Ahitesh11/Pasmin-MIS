import React from 'react';
import { useApp } from '../../context/AppContext';
import { Trophy, Medal, Award, TrendingUp, Users, Star, ArrowUpRight } from 'lucide-react';
import { getRatedDaysCount } from '../../utils/rankingUtils';

export const TeamLeaderboard: React.FC = () => {
  const { currentHod, myHodEmployees, setSelectedEmployeeForHistory, openRatingModal, rankingDay } = useApp();

  // Sort employees strictly under this HOD by Rank Avg descending
  const sortedTeam = [...myHodEmployees].sort((a, b) => {
    if (a.rankAvg === null && b.rankAvg === null) return 0;
    if (a.rankAvg === null) return 1;
    if (b.rankAvg === null) return -1;
    return b.rankAvg - a.rankAvg;
  });

  const topThree = sortedTeam.filter((e) => e.rankAvg !== null).slice(0, 3);

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-bold mb-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Team Performance Standings</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-700">{currentHod.name}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              HOD Team Leaderboard
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Rankings calculated strictly from completed daily scores. Other HODs' staff are excluded.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs shrink-0 self-start sm:self-auto">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600">Department:</span>
            <span className="font-bold text-slate-900">{currentHod.department}</span>
          </div>
        </div>

        {/* 2. Top 3 Podium Highlights (if available) */}
        {topThree.length >= 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100">
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="order-2 sm:order-1 bg-slate-50/80 rounded-2xl p-4 border border-slate-200 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center font-mono">
                      2
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      2nd Place
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-1">
                    {topThree[1].employeeName}
                  </div>
                  <div className="text-[11px] text-slate-500">{topThree[1].designation}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-bold text-slate-800 tabular-nums">
                    {topThree[1].rankAvg}/10
                  </span>
                </div>
              </div>
            )}

            {/* Rank 1 */}
            {topThree[0] && (
              <div className="order-1 sm:order-2 bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-2xl p-4 border border-amber-200/90 flex items-center justify-between shadow-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center font-mono shadow-xs">
                      1
                    </span>
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>Top Performer</span>
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-base mt-1">
                    {topThree[0].employeeName}
                  </div>
                  <div className="text-[11px] text-amber-800/80 font-medium">{topThree[0].designation}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-bold text-amber-950 tabular-nums">
                    {topThree[0].rankAvg}/10
                  </span>
                  <div className="text-[10px] text-amber-700 font-semibold font-mono">Highest Rank</div>
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="order-3 sm:order-3 bg-slate-50/80 rounded-2xl p-4 border border-slate-200 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-900 text-xs font-bold flex items-center justify-center font-mono">
                      3
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      3rd Place
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-1">
                    {topThree[2].employeeName}
                  </div>
                  <div className="text-[11px] text-slate-500">{topThree[2].designation}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-bold text-slate-800 tabular-nums">
                    {topThree[2].rankAvg}/10
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Full Leaderboard List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Full Team Ranking Standings ({sortedTeam.length} Members)
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Sorted by Rank Avg
          </span>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {sortedTeam.map((emp, index) => {
            const position = index + 1;
            const ratedDays = getRatedDaysCount(emp);

            return (
              <div key={emp.employeeCode} className="p-4 flex items-center gap-3">
                {/* Position Badge */}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 bg-slate-100 text-slate-800">
                  {position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : position}
                </div>

                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setSelectedEmployeeForHistory(emp)}
                    className="font-bold text-slate-900 hover:text-sky-700 text-left block truncate"
                  >
                    {emp.employeeName}
                  </button>
                  <div className="text-[11px] text-slate-500 truncate">
                    {emp.designation} · <span className="font-mono">{ratedDays}/7 days rated</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {emp.rankAvg !== null ? (
                    <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                      {emp.rankAvg} / 10
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-sans">Unranked</span>
                  )}
                  <button
                    onClick={() => setSelectedEmployeeForHistory(emp)}
                    className="text-[11px] text-sky-700 font-bold block hover:underline"
                  >
                    Details
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
                <th className="py-3.5 px-4 w-20 text-center">Rank</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Designation</th>
                <th className="py-3.5 px-4">Rated Days</th>
                <th className="py-3.5 px-4 text-right">Rank Avg</th>
                <th className="py-3.5 px-4 text-center">Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTeam.map((emp, index) => {
                const position = index + 1;
                const ratedDays = getRatedDaysCount(emp);

                return (
                  <tr
                    key={emp.employeeCode}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      position === 1 && emp.rankAvg !== null ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-xs px-2 py-1 rounded bg-slate-100 text-slate-800">
                        #{position}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedEmployeeForHistory(emp)}
                        className="font-bold text-slate-900 hover:text-sky-700 text-left cursor-pointer"
                      >
                        {emp.employeeName}
                      </button>
                      <div className="text-[11px] font-mono text-slate-400">
                        {emp.employeeCode} · {emp.location}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{emp.designation}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{ratedDays} / 7 days</td>
                    <td className="py-3 px-4 text-right">
                      {emp.rankAvg !== null ? (
                        <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                          {emp.rankAvg} / 10
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Unranked</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedEmployeeForHistory(emp)}
                        className="text-xs font-bold text-sky-700 hover:text-sky-900 underline cursor-pointer"
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
    </div>
  );
};
