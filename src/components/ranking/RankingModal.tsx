import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Check, AlertCircle, Sparkles, Star, ChevronRight } from 'lucide-react';
import { getDayLabel, calculateRankAvg } from '../../utils/rankingUtils';
import { Employee } from '../../types';

export const RankingModal: React.FC = () => {
  const { ratingModal, closeRatingModal, rateEmployee, currentHod } = useApp();
  const { isOpen, employee, day } = ratingModal;

  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (employee) {
      const currentScore = employee[`day${day}` as keyof Employee] as number | null;
      setSelectedScore(currentScore !== null && currentScore !== undefined ? currentScore : null);
      setIsConfirming(false);
    }
  }, [employee, day, isOpen]);

  if (!isOpen || !employee) return null;

  const currentScore = employee[`day${day}` as keyof Employee] as number | null;
  const isAlreadyRated = currentScore !== null && currentScore !== undefined;

  const previewEmployee: Employee = {
    ...employee,
    [`day${day}`]: selectedScore
  };
  const previewAvg = selectedScore !== null ? calculateRankAvg(previewEmployee) : employee.rankAvg;

  const getScoreDescriptor = (score: number) => {
    switch (score) {
      case 10: return 'Outstanding / उत्कृष्ट';
      case 9: return 'Excellent / बहुत बढ़िया';
      case 8: return 'Very Good / अच्छा';
      case 7: return 'Good / संतोषजनक';
      case 6: return 'Above Average';
      case 5: return 'Average / सामान्य';
      case 4: return 'Below Average';
      case 3: return 'Needs Attention';
      case 2: return 'Poor / कमजोर';
      case 1: return 'Critical / अति कमजोर';
      default: return '';
    }
  };

  const handleScoreClick = (score: number) => {
    setSelectedScore(score);
    setIsConfirming(true);
  };

  const handleConfirm = async () => {
    if (selectedScore === null) return;
    setIsSubmitting(true);
    const success = await rateEmployee(employee.employeeCode, selectedScore, day);
    setIsSubmitting(false);
    if (success) {
      closeRatingModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile pull handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <div className="text-[11px] font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded inline-block">
              {employee.employeeCode} · {employee.location}
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Daily Evaluation: {getDayLabel(day)}
            </h2>
          </div>
          <button
            onClick={closeRatingModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Employee Card */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 rounded-2xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-slate-900">
                  {employee.employeeName}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {employee.designation} · {employee.company}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-medium">Rank Avg</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {employee.rankAvg !== null ? `${employee.rankAvg}/10` : '-'}
                </span>
              </div>
            </div>

            {isAlreadyRated && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Existing score for Day {day}:</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  {currentScore}/10 (Rated)
                </span>
              </div>
            )}
          </div>

          {/* 1 to 10 Grid Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Choose Score (1 to 10):
              </label>
              {selectedScore !== null && (
                <span className="text-xs font-bold text-sky-800 font-mono">
                  {getScoreDescriptor(selectedScore)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                const isSelected = selectedScore === score;
                const isHigh = score >= 8;
                const isMid = score >= 6;
                const isAvg = score >= 4;

                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => handleScoreClick(score)}
                    className={`h-12 sm:h-11 rounded-xl text-base font-bold font-mono transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-sky-700 text-white shadow-md ring-2 ring-sky-700 ring-offset-2 scale-105'
                        : isHigh
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80'
                        : isMid
                        ? 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200/80'
                        : isAvg
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200/80'
                    }`}
                  >
                    <span>{score}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Impact preview */}
          {selectedScore !== null && (
            <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-3 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-sky-950 block">Updated Rank Avg will be:</span>
                <span className="text-[11px] text-sky-700">
                  Only Day {day} is modified; other days remain preserved.
                </span>
              </div>
              <span className="font-mono text-lg font-bold text-sky-900 tabular-nums">
                {previewAvg !== null ? `${previewAvg}/10` : '-'}
              </span>
            </div>
          )}

          {/* Section 8 Requirement: Confirmation */}
          {isConfirming && selectedScore !== null && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs space-y-1 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Give {selectedScore}/10 ranking to {employee.employeeName}?</span>
              </div>
              <p className="text-[11px] text-amber-800 pl-5.5">
                Click Confirm below to save.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 pb-safe">
          <button
            type="button"
            onClick={closeRatingModal}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>

          {isConfirming ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || selectedScore === null}
              className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm ({selectedScore}/10)</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={selectedScore === null}
              onClick={() => setIsConfirming(true)}
              className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Select Score
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
