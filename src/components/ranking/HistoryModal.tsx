import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Calendar, Building2, User, Award, CheckCircle2 } from 'lucide-react';
import { formatScore, getDayLabel } from '../../utils/rankingUtils';
import { RankingDay } from '../../types';

export const HistoryModal: React.FC = () => {
  const { selectedEmployeeForHistory, setSelectedEmployeeForHistory, openRatingModal } = useApp();

  if (!selectedEmployeeForHistory) return null;

  const emp = selectedEmployeeForHistory;
  const days: { day: RankingDay; score: number | null }[] = [
    { day: 1, score: emp.day1 },
    { day: 2, score: emp.day2 },
    { day: 3, score: emp.day3 },
    { day: 4, score: emp.day4 },
    { day: 5, score: emp.day5 },
    { day: 6, score: emp.day6 },
    { day: 7, score: emp.day7 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <div className="text-[11px] font-mono text-slate-400">
              7-Day Performance Ledger
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              {emp.employeeName}
            </h2>
          </div>
          <button
            onClick={() => setSelectedEmployeeForHistory(null)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Metadata Grid */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/90 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Code</span>
              <span className="font-mono font-bold text-sky-900">{emp.employeeCode}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Designation</span>
              <span className="font-semibold text-slate-800 truncate block">{emp.designation}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">HOD Name</span>
              <span className="font-bold text-slate-800">{emp.hodName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
              <span className="font-semibold text-slate-800">{emp.location} · {emp.company}</span>
            </div>
          </div>

          {/* Section 13 Table: Day | Rank */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 sm:px-4">Day</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">Score</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">Status</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {days.map(({ day, score }) => {
                  const isRated = score !== null && score !== undefined;
                  return (
                    <tr key={day} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 sm:px-4 font-sans font-semibold text-slate-800">
                        {getDayLabel(day)}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-right font-bold tabular-nums">
                        {isRated ? (
                          <span className={score >= 8 ? 'text-emerald-700' : score >= 5 ? 'text-slate-800' : 'text-rose-700'}>
                            {score} / 10
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center font-sans">
                        {isRated ? (
                          <span className="text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Rated</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Blank</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center font-sans">
                        <button
                          onClick={() => {
                            setSelectedEmployeeForHistory(null);
                            openRatingModal(emp, day);
                          }}
                          className="text-xs text-sky-700 hover:text-sky-900 font-bold underline cursor-pointer"
                        >
                          {isRated ? 'Edit' : 'Rate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Bottom: Rank Average (Requirement 13) */}
            <div className="bg-slate-50/80 p-3.5 sm:p-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Rank Average: {emp.rankAvg !== null ? `${emp.rankAvg} / 10` : '-'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Calculated from completed days only (blanks ignored)
                </div>
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-sky-950 tabular-nums">
                {emp.rankAvg !== null ? `${emp.rankAvg}/10` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 sm:py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end pb-safe">
          <button
            onClick={() => setSelectedEmployeeForHistory(null)}
            className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
