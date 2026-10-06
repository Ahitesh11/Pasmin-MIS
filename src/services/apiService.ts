import { Employee, WeeklyRecord, RankingDay, ApiResponse, AuthUser, DailyRankEntry } from '../types';
import { getWeekDateRange } from '../utils/rankingUtils';

/**
 * All data comes live from the Google Sheet via the Apps Script Web App.
 * There is no local/demo fallback.
 */
const MAX_ATTEMPTS = 3;
const BUSY_MESSAGE = 'Server is busy right now. Please try again in a moment.';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class ApiService {
  /** Session token from login; sent with every request except login/test */
  private token = '';
  /** Called when the backend rejects the session (expired or invalid token) */
  private onAuthError: (() => void) | null = null;

  setToken(token: string) {
    this.token = token || '';
  }

  setAuthErrorHandler(handler: (() => void) | null) {
    this.onAuthError = handler;
  }

  private checkAuth<R extends { code?: string }>(json: R): R {
    if (json && json.code === 'AUTH') this.onAuthError?.();
    return json;
  }

  /**
   * Apps Script sometimes answers with an HTML error page (e.g. a 404 on the
   * script.googleusercontent.com redirect right after a deploy or under load).
   * Retry those with a short backoff. All actions are idempotent (upserts or
   * duplicate-guarded), so retrying a POST is safe.
   */
  private async request<T>(input: string, init: RequestInit): Promise<ApiResponse<T> & Record<string, any>> {
    let lastError = '';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(input, init);
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          lastError = BUSY_MESSAGE;
          console.warn(`Apps Script returned non-JSON (HTTP ${res.status}), attempt ${attempt}/${MAX_ATTEMPTS}`);
        }
      } catch (err: any) {
        lastError = err?.message || 'Network error. Please check your internet connection.';
        console.warn(`Apps Script request failed, attempt ${attempt}/${MAX_ATTEMPTS}:`, err);
      }
      if (attempt < MAX_ATTEMPTS) await sleep(800 * attempt);
    }
    return { status: 'error', message: lastError || BUSY_MESSAGE };
  }

  private async get<T = any>(scriptUrl: string, params: Record<string, string>): Promise<ApiResponse<T>> {
    if (!scriptUrl) return { status: 'error', message: 'Server is not configured.' };
    const url = new URL(scriptUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    if (this.token) url.searchParams.set('token', this.token);
    return this.checkAuth(await this.request<T>(url.toString(), { method: 'GET' }));
  }

  private async post<T = any>(scriptUrl: string, payload: Record<string, any>): Promise<ApiResponse<T> & Record<string, any>> {
    if (!scriptUrl) return { status: 'error', message: 'Server is not configured.' };
    const body = payload.action === 'login' ? payload : { ...payload, token: this.token };
    return this.checkAuth(
      await this.request<T>(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain avoids CORS preflight
        body: JSON.stringify(body)
      })
    );
  }

  async testConnection(scriptUrl: string): Promise<ApiResponse> {
    if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com')) {
      return {
        status: 'error',
        message: 'Invalid Google Apps Script URL. It must begin with https://script.google.com/macros/s/...'
      };
    }
    return this.get(scriptUrl, { action: 'test' });
  }

  async login(scriptUrl: string, userId: string, password: string, remember: boolean): Promise<ApiResponse<AuthUser>> {
    return this.post<AuthUser>(scriptUrl, { action: 'login', userId, password, remember });
  }

  /** Extend the current session; returns a fresh token */
  async renewSession(scriptUrl: string): Promise<ApiResponse<{ token: string }>> {
    return this.get<{ token: string }>(scriptUrl, { action: 'renewSession' });
  }

  async fetchEmployees(scriptUrl: string): Promise<Employee[]> {
    const json = await this.get<Employee[]>(scriptUrl, { action: 'getEmployees' });
    if (json.status === 'success' && Array.isArray(json.data)) return json.data;
    throw new Error(json.message || 'Failed to load staff.');
  }

  async fetchWeeklyRecords(scriptUrl: string): Promise<WeeklyRecord[]> {
    const json = await this.get<WeeklyRecord[]>(scriptUrl, { action: 'getWeeklyRecords' });
    if (json.status === 'success' && Array.isArray(json.data)) return json.data;
    throw new Error(json.message || 'Failed to load weekly records.');
  }

  /**
   * Save Daily Ranking. The sheet validates that the employee belongs to this HOD.
   */
  async saveRanking(
    scriptUrl: string,
    employeeCode: string,
    hodName: string,
    day: RankingDay,
    rank: number,
    date: string
  ): Promise<ApiResponse<{ rankAvg: number | null }>> {
    // Saved to the Daily Log with this date, and to the Staff Day column
    return this.post(scriptUrl, { action: 'saveRanking', employeeCode, hodName, day, rank, date });
  }

  /**
   * Submit Weekly Records to the 'Records' sheet (duplicates are skipped server-side)
   */
  async submitWeeklyRecords(
    scriptUrl: string,
    weekId: string,
    hodName: string,
    employees: Employee[],
    submittedBy: string
  ): Promise<ApiResponse> {
    const { startDate, endDate } = getWeekDateRange(weekId);
    const records = employees.map(emp => ({
      ...emp,
      weekStartDate: startDate,
      weekEndDate: endDate
    }));

    const json = await this.post(scriptUrl, {
      action: 'submitWeeklyRecords',
      weekId,
      hodName,
      records,
      submittedBy
    });

    if (json.status === 'success') {
      const dupes: string[] = json.skippedDuplicates || [];
      if (json.insertedCount === 0) {
        return {
          status: 'error',
          message: dupes.length > 0
            ? `All selected records for ${weekId} were already submitted.`
            : 'No eligible records were submitted.'
        };
      }
      return {
        status: 'success',
        message: `Submitted ${json.insertedCount} weekly records for ${weekId}${dupes.length ? ` (${dupes.length} duplicates skipped)` : ''}.`
      };
    }
    return json;
  }

  /**
   * Month-wise daily ranking ('Daily Log' sheet)
   */
  async fetchMonthlyRanks(scriptUrl: string, month: string, hodName?: string): Promise<DailyRankEntry[]> {
    const params: Record<string, string> = { action: 'getMonthlyRanks', month };
    if (hodName) params.hodName = hodName;
    const json = await this.get<DailyRankEntry[]>(scriptUrl, params);
    if (json.status === 'success' && Array.isArray(json.data)) return json.data;
    throw new Error(json.message || 'Failed to load monthly ranks.');
  }

  /** rank = null clears that date */
  async saveDailyRank(
    scriptUrl: string,
    employeeCode: string,
    hodName: string,
    date: string,
    rank: number | null
  ): Promise<ApiResponse> {
    return this.post(scriptUrl, { action: 'saveDailyRank', employeeCode, hodName, date, rank });
  }

  /** Save many (employee, date, rank) cells in one request */
  async saveDailyRanksBulk(
    scriptUrl: string,
    hodName: string,
    entries: DailyRankEntry[]
  ): Promise<ApiResponse & { savedCount?: number; skipped?: string[] }> {
    return this.post(scriptUrl, { action: 'saveDailyRanksBulk', hodName, entries });
  }

  async resetWeekCycle(scriptUrl: string): Promise<ApiResponse> {
    return this.post(scriptUrl, { action: 'resetWeekCycle' });
  }
}

export const apiService = new ApiService();
