import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  History,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { isWeeklyRecordComplete, getRatedDaysCount } from '../../utils/rankingUtils';
import { Employee, WeeklyRecord } from '../../types';

export const WeeklyRecordsPage: React.FC = () => {
  const {
    currentHod,
    currentRole,
    myHodEmployees,
    employees,
    weeklyRecords,
    settings,
    submitWeeklyCycle,
    resetCurrentWeekCycle,
    updateSettings,
    setSelectedEmployeeForHistory
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'CURRENT_REVIEW' | 'HISTORICAL'>('CURRENT_REVIEW');
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Relevant employee pool for current submission
  const currentPool = currentRole === 'HOD' ? myHodEmployees : employees;

  // Check which employees already have a record for this week in Records sheet
  const existingSubmittedKeys = useMemo(() => {
    return new Set(
      weeklyRecords
        .filter((r) => r.weekId.toLowerCase() === settings.currentWeekId.toLowerCase())
        .map((r) => r.employeeCode.toUpperCase())
    );
  }, [weeklyRecords, settings.currentWeekId]);

  // Split into Complete, Incomplete, and Already Submitted
  const completedUnsubmitted = currentPool.filter((e) => {
    const isSubmitted = existingSubmittedKeys.has(e.employeeCode.toUpperCase());
    const isComplete = isWeeklyRecordComplete(e);
    return isComplete && !isSubmitted;
  });

  const incompleteUnsubmitted = currentPool.filter((e) => {
    const isSubmitted = existingSubmittedKeys.has(e.employeeCode.toUpperCase());
    const isComplete = isWeeklyRecordComplete(e);
    return !isComplete && !isSubmitted;
  });

  const alreadySubmittedList = currentPool.filter((e) =>
    existingSubmittedKeys.has(e.employeeCode.toUpperCase())
  );

  const eligibleToSubmit = settings.allowIncompleteWeeklySubmission
    ? [...completedUnsubmitted, ...incompleteUnsubmitted]
    : completedUnsubmitted;

  // Filter historical records
  const uniqueHistoricalWeeks = Array.from(new Set(weeklyRecords.map((r) => r.weekId))).sort().reverse();

  const filteredHistory = useMemo(() => {
    return weeklyRecords.filter((rec) => {
      // Role lock
      if (currentRole === 'HOD' && rec.hodName.toLowerCase() !== currentHod.name.toLowerCase()) {
        return false;
      }

      if (selectedWeekFilter && rec.weekId.toLowerCase() !== selectedWeekFilter.toLowerCase()) {
        return false;
      }

      if (historySearch) {
        const q = historySearch.toLowerCase().trim();
        const mCode = rec.employeeCode.toLowerCase().includes(q);
        const mName = rec.employeeName.toLowerCase().includes(q);
        const mDes = rec.designation.toLowerCase().includes(q);
        if (!mCode && !mName && !mDes) return false;
      }

      return true;
    });
  }, [weeklyRecords, currentRole, currentHod.name, selectedWeekFilter, historySearch]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await submitWeeklyCycle(eligibleToSubmit);
    setIsSubmitting(false);
    setIsSubmitModalOpen(false);
  };

  const handleResetCycle = async () => {
    setIsSubmitting(true);
    await resetCurrentWeekCycle();
    setIsSubmitting(false);
    setIsResetModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Weekly Records & Archive</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-800">
                {currentRole === 'HOD' ? `HOD: ${currentHod.name}` : 'Organization Master'}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Weekly Ranking Cycle: {settings.currentWeekId}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Completed 7-day rankings are archived permanently into the <code className="font-mono font-semibold bg-slate-100 px-1 py-0.5 rounded">Records</code> sheet. Duplicate submissions are strictly prevented.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={eligibleToSubmit.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Weekly Records ({eligibleToSubmit.length})</span>
            </button>

            {currentRole === 'ADMIN' && (
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
                title="Reset active day scores for next week"
              >
                Start New Week
              </button>
            )}
          </div>
        </div>

        {/* Cycle Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <span className="text-slate-500 block text-[11px]">Total Eligible Staff</span>
            <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {currentPool.length}
            </span>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/60">
            <span className="text-emerald-700 block text-[11px] font-medium">Ready (Completed 7 Days)</span>
            <span className="text-lg font-bold font-mono text-emerald-800 tabular-nums">
              {completedUnsubmitted.length}
            </span>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200/60">
            <span className="text-amber-700 block text-[11px] font-medium">Incomplete Days</span>
            <span className="text-lg font-bold font-mono text-amber-800 tabular-nums">
              {incompleteUnsubmitted.length}
            </span>
          </div>

          <div className="bg-sky-50/70 p-3 rounded-lg border border-sky-200/60">
            <span className="text-sky-700 block text-[11px] font-medium">Already Submitted</span>
            <span className="text-lg font-bold font-mono text-sky-800 tabular-nums">
              {alreadySubmittedList.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs: Current Week Review vs Historical Archive */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('CURRENT_REVIEW')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'CURRENT_REVIEW'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Current Week Submission Queue ({eligibleToSubmit.length})
        </button>
        <button
          onClick={() => setActiveSubTab('HISTORICAL')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'HISTORICAL'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Historical Records Archive ({filteredHistory.length})
        </button>
      </div>

      {/* 3. Tab Content: Current Week Review */}
      {activeSubTab === 'CURRENT_REVIEW' && (
        <div className="space-y-4">
          {/* Admin Policy Toggle */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-900 block">
                Weekly Submission Policy (Section 27)
              </span>
              <span className="text-slate-500 text-[11px]">
                {settings.allowIncompleteWeeklySubmission
                  ? 'Permissive Mode: Incomplete rankings (less than 7 days) are permitted to submit.'
                  : 'Strict Default: Only employees with all 7 days evaluated can be submitted.'}
              </span>
            </div>
            {currentRole === 'ADMIN' && (
              <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowIncompleteWeeklySubmission}
                  onChange={(e) => updateSettings({ allowIncompleteWeeklySubmission: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
                <span>Allow Incomplete Weekly Records</span>
              </label>
            )}
          </div>

          {/* Table of Employees for this week */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Staff Weekly Ranking Status
              </h2>
              <span className="text-xs text-slate-500">
                Week: <strong className="font-mono text-slate-800">{settings.currentWeekId}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4 text-center">Day 1</th>
                    <th className="py-3 px-4 text-center">Day 2</th>
                    <th className="py-3 px-4 text-center">Day 3</th>
                    <th className="py-3 px-4 text-center">Day 4</th>
                    <th className="py-3 px-4 text-center">Day 5</th>
                    <th className="py-3 px-4 text-center">Day 6</th>
                    <th className="py-3 px-4 text-center">Day 7</th>
                    <th className="py-3 px-4 text-right">Rank Avg</th>
                    <th className="py-3 px-4 text-center">Submission Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {currentPool.map((emp) => {
                    const isSubmitted = existingSubmittedKeys.has(emp.employeeCode.toUpperCase());
                    const isComplete = isWeeklyRecordComplete(emp);
                    const ratedCount = getRatedDaysCount(emp);

                    return (
                      <tr key={emp.employeeCode} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-sans">
                          <button
                            onClick={() => setSelectedEmployeeForHistory(emp)}
                            className="font-bold text-slate-900 hover:text-sky-700 text-left"
                          >
                            {emp.employeeName}
                          </button>
                          <div className="text-[11px] font-mono text-slate-400">
                            {emp.employeeCode} · {emp.designation}
                          </div>
                        </td>

                        {[emp.day1, emp.day2, emp.day3, emp.day4, emp.day5, emp.day6, emp.day7].map(
                          (val, idx) => (
                            <td key={idx} className="py-3 px-4 text-center tabular-nums">
                              {val !== null && val !== undefined ? (
                                <span className={val >= 8 ? 'text-emerald-700 font-bold' : 'text-slate-700'}>
                                  {val}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          )
                        )}

                        <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                          {emp.rankAvg !== null ? `${emp.rankAvg}` : '-'}
                        </td>

                        <td className="py-3 px-4 text-center font-sans">
                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1 text-emerald-800 text-[11px] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Submitted</span>
                            </span>
                          ) : isComplete ? (
                            <span className="inline-flex items-center gap-1 text-sky-800 text-[11px] font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Ready</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-800 text-[11px] font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Incomplete ({ratedCount}/7)</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Tab Content: Historical Records Sheet Archive */}
      {activeSubTab === 'HISTORICAL' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter historical records by Name or Code..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-slate-500 font-medium">Week Filter:</label>
                <select
                  value={selectedWeekFilter}
                  onChange={(e) => setSelectedWeekFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-800 font-mono"
                >
                  <option value="">All Archived Weeks</option>
                  {uniqueHistoricalWeeks.map((wk) => (
                    <option key={wk} value={wk}>{wk}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Historical Records Table (Section 28) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Archived Weekly Ledger (Sheet: 'Records')
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanent historical database. Records cannot be overwritten.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {filteredHistory.length} Record{filteredHistory.length === 1 ? '' : 's'} Found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Week ID</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">HOD</th>
                    <th className="py-3 px-4 text-center">D1</th>
                    <th className="py-3 px-4 text-center">D2</th>
                    <th className="py-3 px-4 text-center">D3</th>
                    <th className="py-3 px-4 text-center">D4</th>
                    <th className="py-3 px-4 text-center">D5</th>
                    <th className="py-3 px-4 text-center">D6</th>
                    <th className="py-3 px-4 text-center">D7</th>
                    <th className="py-3 px-4 text-right">Rank Avg</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submitted Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-8 text-center text-slate-500 font-sans">
                        No historical weekly records found matching the filter.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((rec, i) => (
                      <tr key={rec.id || i} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-sky-800">{rec.weekId}</td>
                        <td className="py-3 px-4 font-sans">
                          <div className="font-bold text-slate-900">{rec.employeeName}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {rec.employeeCode} · {rec.designation}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-700">{rec.hodName}</td>
                        <td className="py-3 px-4 text-center">{rec.day1 ?? '-'}</td>
                        <td className="py-3 px-4 text-center">{rec.day2 ?? '-'}</td>
                        <td className="py-3 px-4 text-center">{rec.day3 ?? '-'}</td>
                        <td className="py-3 px-4 text-center">{rec.day4 ?? '-'}</td>
                        <td className="py-3 px-4 text-center">{rec.day5 ?? '-'}</td>
                        <td className="py-3 px-4 text-center">{rec.day6 ?? '-'}</td>
                        <td className="py-3 px-4 text-center">{rec.day7 ?? '-'}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {rec.rankAvg !== null ? `${rec.rankAvg}` : '-'}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span className="text-emerald-800 text-[11px] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Submitted
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-500 text-[11px]">
                          {rec.submittedDate}
                          <div className="text-[10px] text-slate-400">By: {rec.submittedBy}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Weekly Submission (Section 24) */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Submit Weekly Records
                </h3>
                <div className="text-xs text-slate-500 font-mono">
                  Target Sheet: Records · Week: {settings.currentWeekId}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to submit this week's ranking records to <strong>Records</strong> sheet?
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Eligible Records:</span>
                <span className="font-bold text-slate-900 font-mono">{eligibleToSubmit.length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Duplicate Protection:</span>
                <span className="font-semibold text-emerald-700">Active (Week + Code)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>HOD Scope:</span>
                <span className="font-semibold text-slate-800">
                  {currentRole === 'HOD' ? currentHod.name : 'All HODs (Admin)'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Weekly Records'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resetting Cycle */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Start New Weekly Cycle?
                </h3>
                <div className="text-xs text-slate-500">
                  Archived records will be preserved
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will clear Day 1 to Day 7 scores in the current active sheet for evaluating next week. Historical rows in the <strong>Records</strong> sheet remain permanent and will not be touched.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResetModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetCycle}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Starting...' : 'Start New Week'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
