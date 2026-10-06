import { Employee, RankingDay } from '../types';

/**
 * Calculates Rank Avg strictly by averaging non-blank, non-null days (Day 1 - Day 7).
 * Rule: Blank days are NOT counted as zero!
 * Example: Day1=8, Day2=9, Day3=null -> 8.5
 */
export function calculateRankAvg(employee: Partial<Employee>): number | null {
  const scores: number[] = [];
  const days: (keyof Employee)[] = ['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'];

  for (const d of days) {
    const val = employee[d];
    if (typeof val === 'number' && !isNaN(val) && val >= 1 && val <= 10) {
      scores.push(val);
    }
  }

  if (scores.length === 0) return null;

  const sum = scores.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / scores.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Returns how many days have been rated for an employee (0 to 7)
 */
export function getRatedDaysCount(employee: Employee): number {
  let count = 0;
  const days: (keyof Employee)[] = ['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'];
  for (const d of days) {
    const val = employee[d];
    if (typeof val === 'number' && !isNaN(val) && val >= 1 && val <= 10) {
      count++;
    }
  }
  return count;
}

/**
 * Checks if an employee has completed all 7 days of the weekly cycle
 */
export function isWeeklyRecordComplete(employee: Employee): boolean {
  const days: (keyof Employee)[] = ['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'];
  return days.every(d => {
    const val = employee[d];
    return typeof val === 'number' && !isNaN(val) && val >= 1 && val <= 10;
  });
}

/**
 * Get current week ID in standard format (e.g. 2026-W40)
 */
export function getCurrentWeekId(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Thursday in current week decides the year.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Gets start and end dates for a given week ID
 */
export function getWeekDateRange(weekId: string): { startDate: string; endDate: string } {
  // All math in UTC so the local timezone (e.g. IST) can't shift the dates by a day
  const fmt = (dt: Date) => dt.toISOString().split('T')[0];
  const parts = weekId.split('-W');
  const year = parseInt(parts[0], 10);
  const week = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(week)) {
    const today = toLocalIsoDate(new Date());
    return { startDate: today, endDate: today };
  }

  // 4th January is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Monday = new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86400000);
  const start = new Date(week1Monday.getTime() + (week - 1) * 7 * 86400000);
  const end = new Date(start.getTime() + 6 * 86400000);
  return { startDate: fmt(start), endDate: fmt(end) };
}

/** Local calendar date as "yyyy-MM-dd" */
export function toLocalIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Date ("yyyy-MM-dd") of Day 1-7 (Monday = Day 1) in the given week */
export function getDateForWeekDay(weekId: string, day: RankingDay): string {
  const { startDate } = getWeekDateRange(weekId);
  const start = new Date(startDate + 'T00:00:00Z');
  return new Date(start.getTime() + (day - 1) * 86400000).toISOString().split('T')[0];
}

/**
 * Auto-detect current ranking day (1 = Day1, 2 = Day2 ... 7 = Day7)
 * By default: Monday is Day 1, Sunday is Day 7.
 */
export function detectCurrentDay(cycleStartDay: number = 1): RankingDay {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday

  // Calculate offset from cycleStartDay (1 = Monday)
  let dayIndex = ((currentDayOfWeek - cycleStartDay + 7) % 7) + 1;
  if (dayIndex < 1) dayIndex = 1;
  if (dayIndex > 7) dayIndex = 7;
  return dayIndex as RankingDay;
}

/**
 * Returns human-readable day name for a ranking day
 */
export function getDayLabel(day: RankingDay): string {
  const labels: Record<RankingDay, string> = {
    1: 'Day 1 (Mon)',
    2: 'Day 2 (Tue)',
    3: 'Day 3 (Wed)',
    4: 'Day 4 (Thu)',
    5: 'Day 5 (Fri)',
    6: 'Day 6 (Sat)',
    7: 'Day 7 (Sun)'
  };
  return labels[day] || `Day ${day}`;
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return '-';
  return `${score}/10`;
}
