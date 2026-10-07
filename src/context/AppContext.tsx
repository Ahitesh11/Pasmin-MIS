import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Employee, WeeklyRecord, HODProfile, UserRole, RankingDay, AppSettings, FilterState, AuthUser } from '../types';
import { detectCurrentDay, getCurrentWeekId, calculateRankAvg, getDateForWeekDay, isHolidayDay } from '../utils/rankingUtils';
import { apiService } from '../services/apiService';
import { playError, playSuccess } from '../utils/sound';

interface AppContextType {
  authUser: AuthUser | null;
  login: (userId: string, password: string, remember: boolean) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentHod: HODProfile;
  setCurrentHod: (hodName: string) => void;
  availableHods: HODProfile[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  employees: Employee[];
  myHodEmployees: Employee[];
  filteredEmployees: Employee[];
  weeklyRecords: WeeklyRecord[];
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  rankingDay: RankingDay;
  setRankingDay: (day: RankingDay) => void;
  isLoading: boolean;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  rateEmployee: (employeeCode: string, rank: number, day?: RankingDay) => Promise<boolean>;
  submitWeeklyCycle: (employeesToSubmit?: Employee[]) => Promise<boolean>;
  resetCurrentWeekCycle: () => Promise<boolean>;
  refreshAllData: () => Promise<void>;
  reloadStaff: () => Promise<void>;
  selectedEmployeeForHistory: Employee | null;
  setSelectedEmployeeForHistory: (emp: Employee | null) => void;
  ratingModal: { isOpen: boolean; employee: Employee | null; day: RankingDay };
  openRatingModal: (employee: Employee, day?: RankingDay) => void;
  closeRatingModal: () => void;
}

const ENV_SCRIPT_URL: string = (import.meta.env.VITE_APPS_SCRIPT_URL || '').trim();
const SETTINGS_STORAGE_KEY = 'hod_ranking_settings_v1';
const AUTH_STORAGE_KEY = 'pasmin_ranking_auth_v1';

const defaultSettings: AppSettings = {
  scriptUrl: ENV_SCRIPT_URL,
  isLiveBackend: !!ENV_SCRIPT_URL,
  currentRankingDay: detectCurrentDay(1),
  autoDetectDay: true,
  weekCycleStartDay: 1, // Monday
  currentWeekId: getCurrentWeekId(),
  allowIncompleteWeeklySubmission: false
};

const defaultFilterState: FilterState = {
  search: '',
  company: '',
  location: '',
  designation: '',
  attendanceMode: '',
  incentiveCategory: '',
  hodName: '',
  statusFilter: 'ALL'
};

// Last data fetched from the sheet, shown instantly on reload while fresh data loads
const DATA_CACHE_KEY = 'pasmin_ranking_data_cache_v1';

const loadDataCache = (): { employees: Employee[]; weeklyRecords: WeeklyRecord[] } => {
  try {
    const raw = localStorage.getItem(DATA_CACHE_KEY);
    if (raw && loadSavedAuth()?.remember) {
      const parsed = JSON.parse(raw);
      return { employees: parsed.employees || [], weeklyRecords: parsed.weeklyRecords || [] };
    }
  } catch {
    // Ignore unreadable cache
  }
  return { employees: [], weeklyRecords: [] };
};

const saveDataCache = (employees: Employee[], weeklyRecords: WeeklyRecord[]) => {
  // Only cache staff data on devices where the user chose "Keep me signed in"
  if (!loadSavedAuth()?.remember) return;
  try {
    localStorage.setItem(DATA_CACHE_KEY, JSON.stringify({ employees, weeklyRecords }));
  } catch {
    // Storage full or blocked: caching is optional
  }
};

/** Remembered sessions live in localStorage; others only for this browser session */
const loadSavedAuth = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    const saved: AuthUser | null = raw ? JSON.parse(raw) : null;
    // Sessions saved before token-based login must sign in again
    return saved && saved.token ? saved : null;
  } catch {
    return null;
  }
};

const storeAuth = (user: AuthUser | null) => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    if (user) (user.remember ? localStorage : sessionStorage).setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Storage blocked: the user simply stays signed in until the tab closes
  }
};

/** Milliseconds until the token expires (0 if unreadable) */
const tokenTimeLeft = (token: string): number => {
  try {
    const part = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const data = JSON.parse(atob(part + '==='.slice((part.length + 3) % 4)));
    return Math.max(0, (data.exp || 0) - Date.now());
  } catch {
    return 0;
  }
};

// Comparison key for names: lowercase letters and digits only (ignores extra/hidden spaces)
export const nameKey = (value: string) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const buildHodProfile = (name: string, staff: Employee[]): HODProfile => {
  const team = staff.filter(e => nameKey(e.hodName) === nameKey(name));
  const companyCounts = new Map<string, number>();
  team.forEach(e => e.company && companyCounts.set(e.company, (companyCounts.get(e.company) || 0) + 1));
  const company = [...companyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  return { name, company, department: 'Head of Department', email: '', totalStaff: team.length };
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(loadSavedAuth);
  // Every API call carries the current session token
  apiService.setToken(authUser?.token || '');
  // Admins can temporarily view the app as a specific HOD
  const [adminViewHod, setAdminViewHod] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>(() =>
    loadSavedAuth()?.role === 'ADMIN' ? 'adminConsole' : 'dashboard'
  );
  const [employees, setEmployees] = useState<Employee[]>(() => loadDataCache().employees);
  const [weeklyRecords, setWeeklyRecords] = useState<WeeklyRecord[]>(() => loadDataCache().weeklyRecords);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        const merged = { ...defaultSettings, ...JSON.parse(saved) };
        // Fall back to the .env URL when no URL has been saved in the browser
        if (!merged.scriptUrl && ENV_SCRIPT_URL) {
          merged.scriptUrl = ENV_SCRIPT_URL;
          merged.isLiveBackend = true;
        }
        return merged;
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);
  // Start in loading state when a saved session exists, so the empty UI never flashes
  const [isLoading, setIsLoading] = useState<boolean>(() => !!loadSavedAuth());
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<Employee | null>(null);
  const [ratingModal, setRatingModal] = useState<{ isOpen: boolean; employee: Employee | null; day: RankingDay }>({
    isOpen: false,
    employee: null,
    day: settings.currentRankingDay
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    if (type === 'success') playSuccess();
    else if (type === 'error') playError();
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const setRankingDay = (day: RankingDay) => {
    updateSettings({ currentRankingDay: day, autoDetectDay: false });
    showNotification(`Ranking day set to Day ${day}`, 'info');
  };

  const isAdmin = authUser?.role === 'ADMIN';
  const currentRole: UserRole = isAdmin && !adminViewHod ? 'ADMIN' : 'HOD';
  // HOD list comes straight from the 'HOD Name' column of the Staff sheet
  const availableHods = useMemo(() => {
    const names = new Map<string, string>();
    employees.forEach(e => {
      const n = e.hodName.trim();
      if (n && !names.has(nameKey(n))) names.set(nameKey(n), n);
    });
    return [...names.values()]
      .sort((a, b) => a.localeCompare(b))
      .map(n => buildHodProfile(n, employees));
  }, [employees]);

  // Use the Staff sheet's spelling of the HOD name, even if the Login sheet differs in spaces/case
  const rawHodName = isAdmin ? adminViewHod : authUser?.hodName || '';
  const activeHodName =
    availableHods.find(h => rawHodName && nameKey(h.name) === nameKey(rawHodName))?.name || rawHodName;

  const currentHod = useMemo<HODProfile>(
    () => buildHodProfile(activeHodName || (isAdmin ? 'Administrator' : ''), employees),
    [activeHodName, isAdmin, employees]
  );

  // Only admins may switch role or view the app as a HOD
  const setCurrentRole = (role: UserRole) => {
    if (!isAdmin) return;
    if (role === 'ADMIN') {
      setAdminViewHod('');
    } else if (!adminViewHod && availableHods[0]) {
      setAdminViewHod(availableHods[0].name);
    }
  };

  const setCurrentHod = (hodName: string) => {
    if (!isAdmin) return;
    setAdminViewHod(hodName);
    showNotification(`Viewing as HOD: ${hodName}`, 'info');
  };

  const login = async (userId: string, password: string, remember: boolean) => {
    const res = await apiService.login(settings.scriptUrl, userId.trim(), password, remember);
    if (res.status === 'success' && res.data) {
      setNotification(null);
      setIsLoading(true);
      setAuthUser(res.data);
      res.data.remember = remember;
      storeAuth(res.data);
      setAdminViewHod('');
      setActiveTab(res.data.role === 'ADMIN' ? 'adminConsole' : 'dashboard');
      return { ok: true };
    }
    return { ok: false, message: res.message || 'Login failed' };
  };

  const logout = () => {
    storeAuth(null);
    localStorage.removeItem(DATA_CACHE_KEY);
    setAuthUser(null);
    setAdminViewHod('');
    setEmployees([]);
    setWeeklyRecords([]);
    setFilterState(defaultFilterState);
    setIsLoading(false);
  };

  // "Keep me signed in": quietly extend the session (at most once a day) so it never runs out while in use
  useEffect(() => {
    if (!authUser?.remember || !authUser.token) return;
    const RENEW_WHEN_LEFT_MS = 179 * 24 * 60 * 60 * 1000;
    if (tokenTimeLeft(authUser.token) > RENEW_WHEN_LEFT_MS) return;
    apiService.renewSession(settings.scriptUrl).then(res => {
      if (res.status === 'success' && res.data?.token) {
        const renewed = { ...authUser, token: res.data.token };
        storeAuth(renewed);
        setAuthUser(renewed);
      }
    });
  }, [authUser?.userId]);

  // Backend rejected the session (expired or invalid token): sign out
  useEffect(() => {
    apiService.setAuthErrorHandler(() => {
      logout();
      showNotification('Your session has expired. Please sign in again.', 'error');
    });
    return () => apiService.setAuthErrorHandler(null);
  }, []);

  const resetFilters = () => {
    setFilterState(defaultFilterState);
  };

  // Load staff and weekly records from the Google Sheet.
  // Each is applied independently, so one failing does not hide the other.
  const loadData = async () => {
    setIsLoading(true);
    const [staffRes, recordsRes] = await Promise.allSettled([
      apiService.fetchEmployees(settings.scriptUrl),
      apiService.fetchWeeklyRecords(settings.scriptUrl)
    ]);

    if (staffRes.status === 'fulfilled') setEmployees(staffRes.value);
    if (recordsRes.status === 'fulfilled') setWeeklyRecords(recordsRes.value);

    if (staffRes.status === 'fulfilled' || recordsRes.status === 'fulfilled') {
      saveDataCache(
        staffRes.status === 'fulfilled' ? staffRes.value : employees,
        recordsRes.status === 'fulfilled' ? recordsRes.value : weeklyRecords
      );
    }

    const failed = [staffRes, recordsRes].find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (failed) {
      console.error('Data load error:', failed.reason);
      showNotification(failed.reason?.message || 'Failed to load data', 'error');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (authUser) loadData();
  }, [settings.scriptUrl, authUser?.userId]);

  // Keep Day and Week ID in sync with the calendar when auto-detect is on
  // (re-checked every minute, so an open app rolls over at midnight / on Monday)
  useEffect(() => {
    if (!settings.autoDetectDay) return;
    const sync = () => {
      const day = detectCurrentDay(settings.weekCycleStartDay);
      const weekId = getCurrentWeekId();
      setSettings(prev => {
        if (prev.currentRankingDay === day && prev.currentWeekId === weekId) return prev;
        const updated = { ...prev, currentRankingDay: day, currentWeekId: weekId };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    };
    sync();
    const timer = setInterval(sync, 60_000);
    return () => clearInterval(timer);
  }, [settings.autoDetectDay, settings.weekCycleStartDay]);

  // Employees belonging strictly to the active HOD
  const myHodEmployees = useMemo(() => {
    if (!activeHodName) return [];
    return employees.filter(e => nameKey(e.hodName) === nameKey(activeHodName));
  }, [employees, activeHodName]);

  // Filtered employees for viewing (HOD view is locked to myHodEmployees; Admin sees all)
  const filteredEmployees = useMemo(() => {
    const baseList = currentRole === 'HOD' ? myHodEmployees : employees;

    return baseList.filter(emp => {
      if (currentRole === 'ADMIN' && filterState.hodName) {
        if (emp.hodName.toLowerCase() !== filterState.hodName.toLowerCase()) return false;
      }

      if (filterState.search) {
        const q = filterState.search.toLowerCase().trim();
        const matchesName = emp.employeeName.toLowerCase().includes(q);
        const matchesCode = emp.employeeCode.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }

      if (filterState.company && emp.company.toLowerCase() !== filterState.company.toLowerCase()) return false;
      if (filterState.location && emp.location.toLowerCase() !== filterState.location.toLowerCase()) return false;
      if (filterState.designation && emp.designation.toLowerCase() !== filterState.designation.toLowerCase()) return false;
      if (filterState.attendanceMode && emp.attendanceMode.toLowerCase() !== filterState.attendanceMode.toLowerCase()) return false;
      if (filterState.incentiveCategory && emp.incentiveCategory.toLowerCase() !== filterState.incentiveCategory.toLowerCase()) return false;

      if (filterState.statusFilter !== 'ALL') {
        const todayScore = emp[`day${settings.currentRankingDay}` as keyof Employee];
        const isRated = todayScore !== null && todayScore !== undefined;
        if (filterState.statusFilter === 'RATED' && !isRated) return false;
        if (filterState.statusFilter === 'PENDING' && isRated) return false;
      }

      return true;
    });
  }, [currentRole, myHodEmployees, employees, filterState, settings.currentRankingDay]);

  // Rate an employee (saved directly to the Staff sheet)
  const rateEmployee = async (employeeCode: string, rank: number, day?: RankingDay): Promise<boolean> => {
    const targetDay = day || settings.currentRankingDay;
    if (isHolidayDay(targetDay)) {
      showNotification('Sunday is a holiday. Ranking cannot be given or changed.', 'info');
      return false;
    }
    const date = getDateForWeekDay(settings.currentWeekId, targetDay);
    const res = await apiService.saveRanking(settings.scriptUrl, employeeCode, currentHod.name, targetDay, rank, date);

    if (res.status === 'success') {
      setEmployees(prev =>
        prev.map(e => {
          if (e.employeeCode.toUpperCase() !== employeeCode.toUpperCase()) return e;
          const updated = { ...e, [`day${targetDay}`]: rank } as Employee;
          updated.rankAvg = res.data?.rankAvg ?? calculateRankAvg(updated);
          return updated;
        })
      );
      showNotification(res.message || 'Ranking saved successfully', 'success');
      return true;
    }
    showNotification(res.message || 'Failed to save ranking', 'error');
    return false;
  };

  // Submit weekly cycle
  const submitWeeklyCycle = async (employeesToSubmit?: Employee[]): Promise<boolean> => {
    const list = employeesToSubmit || (currentRole === 'HOD' ? myHodEmployees : employees);

    const finalEligible = settings.allowIncompleteWeeklySubmission
      ? list
      : list.filter(e =>
          [e.day1, e.day2, e.day3, e.day4, e.day5, e.day6, e.day7].every(s => s !== null && s !== undefined)
        );

    if (finalEligible.length === 0) {
      showNotification('No complete weekly records to submit. Please complete Day 1 to Day 7 rankings first.', 'error');
      return false;
    }

    const res = await apiService.submitWeeklyRecords(
      settings.scriptUrl,
      settings.currentWeekId,
      currentRole === 'HOD' ? currentHod.name : '',
      finalEligible,
      currentRole === 'HOD' ? currentHod.name : authUser?.name || 'Admin'
    );

    if (res.status === 'success') {
      showNotification(res.message || 'Weekly records submitted successfully', 'success');
      try {
        setWeeklyRecords(await apiService.fetchWeeklyRecords(settings.scriptUrl));
      } catch {
        // Records will refresh on next load
      }
      return true;
    }
    showNotification(res.message || 'Submission failed', 'error');
    return false;
  };

  // Reset week cycle
  const resetCurrentWeekCycle = async (): Promise<boolean> => {
    const res = await apiService.resetWeekCycle(settings.scriptUrl);
    if (res.status === 'success') {
      showNotification(res.message || 'New week cycle initiated', 'info');
      await loadData();
      return true;
    }
    showNotification(res.message || 'Failed to reset cycle', 'error');
    return false;
  };

  // Quietly re-read the Staff sheet (e.g. after monthly ranks synced this week's Day columns)
  const reloadStaff = async () => {
    try {
      const staff = await apiService.fetchEmployees(settings.scriptUrl);
      setEmployees(staff);
      saveDataCache(staff, weeklyRecords);
    } catch {
      // Next full refresh will pick it up
    }
  };

  const refreshAllData = async () => {
    await loadData();
    showNotification('Data refreshed', 'info');
  };

  const openRatingModal = (employee: Employee, day?: RankingDay) => {
    if (isHolidayDay(day || settings.currentRankingDay)) {
      showNotification('Sunday is a holiday. Ranking cannot be given or changed.', 'info');
      return;
    }
    setRatingModal({ isOpen: true, employee, day: day || settings.currentRankingDay });
  };

  const closeRatingModal = () => {
    setRatingModal({ isOpen: false, employee: null, day: settings.currentRankingDay });
  };

  return (
    <AppContext.Provider
      value={{
        authUser,
        login,
        logout,
        currentRole,
        setCurrentRole,
        currentHod,
        setCurrentHod,
        availableHods,
        activeTab,
        setActiveTab,
        employees,
        myHodEmployees,
        filteredEmployees,
        weeklyRecords,
        settings,
        updateSettings,
        filterState,
        setFilterState,
        resetFilters,
        rankingDay: settings.currentRankingDay,
        setRankingDay,
        isLoading,
        notification,
        showNotification,
        rateEmployee,
        submitWeeklyCycle,
        resetCurrentWeekCycle,
        refreshAllData,
        reloadStaff,
        selectedEmployeeForHistory,
        setSelectedEmployeeForHistory,
        ratingModal,
        openRatingModal,
        closeRatingModal
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
