export interface Employee {
  employeeCode: string; // Col 1: Unique ID
  employeeName: string; // Col 2
  company: string;      // Col 3
  dateOfJoining: string;// Col 4
  location: string;     // Col 5
  designation: string;  // Col 6
  attendanceMode: string; // Col 7 (Biometric, Face ID, Remote, Manual)
  incentiveCategory: string; // Col 8 (Category A, B, C, Executive)
  hodName: string;      // Col 9 (HOD Name)
  day1: number | null;  // Col 10
  day2: number | null;  // Col 11
  day3: number | null;  // Col 12
  day4: number | null;  // Col 13
  day5: number | null;  // Col 14
  day6: number | null;  // Col 15
  day7: number | null;  // Col 16
  rankAvg: number | null; // Col 17 (Calculated average ignoring blanks)
}

export interface WeeklyRecord {
  id?: string;
  weekId: string;          // e.g. "2026-W40"
  weekStartDate: string;   // e.g. "2026-09-28"
  weekEndDate: string;     // e.g. "2026-10-04"
  employeeCode: string;
  employeeName: string;
  company: string;
  dateOfJoining: string;
  location: string;
  designation: string;
  attendanceMode: string;
  incentiveCategory: string;
  hodName: string;
  day1: number | null;
  day2: number | null;
  day3: number | null;
  day4: number | null;
  day5: number | null;
  day6: number | null;
  day7: number | null;
  rankAvg: number | null;
  submittedDate: string;
  submittedBy: string;
}

export interface HODProfile {
  name: string;
  company: string;
  department: string;
  email: string;
  totalStaff?: number;
}

export type UserRole = 'HOD' | 'ADMIN';

export type RankingDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface AppSettings {
  scriptUrl: string;
  isLiveBackend: boolean;
  currentRankingDay: RankingDay;
  autoDetectDay: boolean;
  weekCycleStartDay: number; // 1 = Monday
  currentWeekId: string;
  allowIncompleteWeeklySubmission: boolean;
}

export interface FilterState {
  search: string;
  company: string;
  location: string;
  designation: string;
  attendanceMode: string;
  incentiveCategory: string;
  hodName: string; // Only editable in Admin mode
  statusFilter: 'ALL' | 'RATED' | 'PENDING';
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: string;
  code?: string; // 'AUTH' when the session token is missing, invalid or expired
}

export interface AuthUser {
  userId: string;
  name: string;
  role: UserRole;
  hodName: string; // Matches 'HOD Name' column in Staff sheet (blank for Admin)
  token: string; // Signed session token issued by the Apps Script backend
  remember?: boolean; // "Keep me signed in": stored across browser restarts and renewed while in use
}

export interface DailyRankEntry {
  date: string; // yyyy-MM-dd
  employeeCode: string;
  rank: number;
}
