import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Trophy,
  CalendarCheck,
  Shield,
  Calendar,
  CalendarDays,
  RefreshCw,
  LogOut,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getDayLabel } from '../../utils/rankingUtils';
import { SoundToggle } from '../common/SoundToggle';

const COLLAPSE_KEY = 'pasmin_sidebar_collapsed_v1';

export const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || '?';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    authUser,
    logout,
    currentRole,
    setCurrentRole,
    currentHod,
    setCurrentHod,
    availableHods,
    rankingDay,
    settings,
    myHodEmployees,
    refreshAllData,
    isLoading
  } = useApp();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      try {
        localStorage.setItem(COLLAPSE_KEY, prev ? '0' : '1');
      } catch {
        // Preference just won't persist
      }
      return !prev;
    });
  };

  const isAdmin = authUser?.role === 'ADMIN';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'dailyRanking', label: 'Daily Ranking', icon: Users, badge: `${myHodEmployees.length}` },
    { id: 'monthlyRanking', label: 'Monthly Ranking', icon: CalendarDays },
    { id: 'leaderboard', label: 'Team Leaderboard', icon: Trophy },
    { id: 'weeklyRecords', label: 'Weekly Records', icon: CalendarCheck },
    ...(currentRole === 'ADMIN' ? [{ id: 'adminConsole', label: 'Admin Console', icon: Shield }] : [])
  ];

  const handleViewAs = (value: string) => {
    if (value === '__admin__') {
      setCurrentRole('ADMIN');
      setActiveTab('adminConsole');
    } else {
      setCurrentHod(value);
      if (activeTab === 'adminConsole' || activeTab === 'appsScriptSetup') setActiveTab('dashboard');
    }
  };

  return (
    <div className="hidden md:flex relative shrink-0 h-full">
      <aside
        className={`h-full flex flex-col overflow-hidden bg-white border-r border-slate-200/80 transition-[width] duration-200 ease-out ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {/* Brand */}
        <div className={`h-16 shrink-0 flex items-center gap-3 border-b border-slate-100 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
          <img
            src="/icons.png"
            alt="Pasmin"
            className="w-9 h-9 shrink-0 rounded-xl bg-white p-1 border border-slate-200 shadow-sm object-contain"
          />
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="text-[15px] font-extrabold tracking-tight text-slate-900 truncate">Pasmin MIS</div>
            </div>
          )}
        </div>

        <div className={`flex-1 min-h-0 flex flex-col gap-4 py-4 ${collapsed ? 'px-2.5' : 'px-3'}`}>
          {/* Cycle */}
          {collapsed ? (
            <button
              onClick={() => refreshAllData()}
              disabled={isLoading}
              className="shrink-0 w-full flex flex-col items-center gap-0.5 rounded-xl bg-indigo-50/70 border border-indigo-100 py-2 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-60"
              title={`${getDayLabel(rankingDay)} · ${settings.currentWeekId} · Refresh data`}
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-bold">D{rankingDay}</span>
            </button>
          ) : (
            <div className="shrink-0 flex items-center gap-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 px-3 py-2">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-xs font-bold text-indigo-950 truncate">{getDayLabel(rankingDay)}</div>
                <div className="text-[10px] font-mono text-indigo-600">{settings.currentWeekId}</div>
              </div>
              <button
                onClick={() => refreshAllData()}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-indigo-500 hover:text-indigo-800 hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh data"
                aria-label="Refresh data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          {/* Admin: view as HOD */}
          {isAdmin &&
            (collapsed ? (
              <button
                onClick={toggleCollapsed}
                className={`shrink-0 w-full h-10 flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                  currentRole === 'HOD'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
                title={currentRole === 'HOD' ? `Viewing as ${currentHod.name}` : 'View as HOD'}
                aria-label="View as HOD"
              >
                <Eye className="w-4 h-4" />
              </button>
            ) : (
              <div className="shrink-0 relative">
                <Eye className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  aria-label="View as"
                  value={currentRole === 'ADMIN' ? '__admin__' : currentHod.name}
                  onChange={e => handleViewAs(e.target.value)}
                  className="w-full appearance-none h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-9 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer truncate"
                  title="View the app as a HOD"
                >
                  <option value="__admin__">Admin View (All Staff)</option>
                  {availableHods.map(h => (
                    <option key={h.name} value={h.name}>
                      {h.name} ({h.totalStaff})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ))}

          {/* Navigation */}
          <nav className="flex-1 min-h-0 space-y-0.5">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">Menu</div>
            )}
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={`relative w-full h-10 flex items-center rounded-xl transition-colors cursor-pointer text-left text-[13px] ${
                    collapsed ? 'justify-center' : 'gap-3 px-3'
                  } ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/25'
                      : 'text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {item.badge !== undefined &&
                    (collapsed ? (
                      <span
                        className={`absolute top-1 right-1.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center tabular-nums ${
                          isActive ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      <span
                        className={`min-w-6 text-center text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ))}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile */}
        <div className="shrink-0 p-3 border-t border-slate-100">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative" title={`${authUser?.name} · ${isAdmin ? 'Administrator' : 'Head of Department'}`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center justify-center">
                  {getInitials(authUser?.name || '')}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <SoundToggle />
              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 transition-colors">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center justify-center">
                  {getInitials(authUser?.name || '')}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white"
                  title="Online"
                />
              </div>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-[13px] font-bold text-slate-900 truncate">{authUser?.name}</div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  {isAdmin && <Shield className="w-3 h-3 text-amber-500" />}
                  {isAdmin ? 'Administrator' : 'Head of Department'}
                </div>
              </div>
              <SoundToggle />
              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Collapse / expand handle on the sidebar edge */}
      <button
        onClick={toggleCollapsed}
        className="absolute top-5 -right-3 z-40 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center cursor-pointer transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
