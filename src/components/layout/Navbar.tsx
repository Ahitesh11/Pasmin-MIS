import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Wifi, ChevronDown, LogOut, Shield, Eye, Calendar } from 'lucide-react';
import { getDayLabel } from '../../utils/rankingUtils';
import { getInitials } from './Sidebar';
import { SoundToggle } from '../common/SoundToggle';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Team overview for the current cycle' },
  dailyRanking: { title: 'Daily Ranking', subtitle: 'Rate your staff for today' },
  monthlyRanking: { title: 'Monthly Ranking', subtitle: 'Date-wise ranking for the whole month' },
  leaderboard: { title: 'Team Leaderboard', subtitle: 'Top performers by average rank' },
  weeklyRecords: { title: 'Weekly Records', subtitle: 'Submitted weekly ranking history' },
  adminConsole: { title: 'Admin Console', subtitle: 'Organization-wide ranking oversight' },
  appsScriptSetup: { title: 'Settings', subtitle: 'Connection settings' }
};

export const Navbar: React.FC = () => {
  const {
    authUser,
    logout,
    currentRole,
    setCurrentRole,
    currentHod,
    setCurrentHod,
    availableHods,
    rankingDay,
    settings,
    activeTab,
    setActiveTab
  } = useApp();

  const [isHodModalOpen, setIsHodModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const isAdmin = authUser?.role === 'ADMIN';
  const page = PAGE_TITLES[activeTab] || PAGE_TITLES.dashboard;

  useEffect(() => {
    if (!isProfileOpen) return;
    const close = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isProfileOpen]);

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
    <>
      <header className="shrink-0 z-30 bg-white/85 backdrop-blur-xl">
        {/* Top bar: mobile only (desktop uses the sidebar) */}
        <div className="md:hidden h-16 px-3 sm:px-6 flex items-center justify-between gap-3 border-b border-slate-200/80">
          {/* Left: mobile brand / desktop page title */}
          <div className="min-w-0 flex items-center gap-3">
            <img
              src="/icons.png"
              alt="Pasmin"
              className="md:hidden w-9 h-9 rounded-xl bg-white p-1 border border-slate-200 shadow-sm object-contain"
            />
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-extrabold tracking-tight text-slate-900 truncate">{page.title}</h1>
              <p className="hidden md:block text-xs font-medium text-slate-500 truncate">{page.subtitle}</p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 h-10 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-indigo-600" />
              {getDayLabel(rankingDay)}
              <span className="font-mono text-slate-400">· {settings.currentWeekId}</span>
            </div>

            <div
              className={`hidden sm:flex items-center gap-2 px-3 h-10 rounded-xl border text-xs font-bold whitespace-nowrap ${
                settings.scriptUrl
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
              title={settings.scriptUrl ? 'Connected' : 'Not connected'}
            >
              <Wifi className="w-4 h-4" />
              {settings.scriptUrl ? 'Live' : 'Offline'}
              <span className={`w-2 h-2 rounded-full ${settings.scriptUrl ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </div>

            {isAdmin && (
              <>
                <div className="hidden sm:block relative">
                  <select
                    value={currentRole === 'ADMIN' ? '__admin__' : currentHod.name}
                    onChange={e => handleViewAs(e.target.value)}
                    className="appearance-none h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl pl-3.5 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[210px]"
                    title="View the app as a HOD"
                  >
                    <option value="__admin__">Admin View (All Staff)</option>
                    {availableHods.map(h => (
                      <option key={h.name} value={h.name}>
                        View as {h.name} ({h.totalStaff})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                  onClick={() => setIsHodModalOpen(true)}
                  className="sm:hidden flex items-center gap-1 px-2.5 h-9 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl"
                  aria-label="View as HOD"
                >
                  <Eye className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>
              </>
            )}

            {/* Profile menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(v => !v)}
                className="flex items-center gap-2.5 h-10 pl-1 pr-2 sm:pr-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
              >
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center justify-center">
                  {getInitials(authUser?.name || '')}
                </span>
                <span className="hidden xl:block text-left leading-tight max-w-[140px]">
                  <span className="block text-xs font-bold text-slate-900 truncate">{authUser?.name}</span>
                  <span className="block text-[10px] font-semibold text-slate-500">{isAdmin ? 'Administrator' : 'HOD'}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 p-2 z-50"
                >
                  <div className="flex items-center gap-3 p-3">
                    <span className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-sm font-bold flex items-center justify-center">
                      {getInitials(authUser?.name || '')}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{authUser?.name}</div>
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                        {isAdmin && <Shield className="w-3 h-3 text-amber-500" />}
                        {isAdmin ? 'Administrator' : 'Head of Department'}
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100 my-1" />
                  <SoundToggle variant="menu" />
                  <button
                    role="menuitem"
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin impersonation banner */}
        {isAdmin && currentRole === 'HOD' && (
          <div className="bg-amber-50 border-t border-amber-200 text-amber-900 text-xs">
            <div className="px-3 sm:px-6 lg:px-10 py-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Eye className="w-3.5 h-3.5" /> Viewing as HOD: <b>{currentHod.name}</b>
              </span>
              <button onClick={() => handleViewAs('__admin__')} className="font-bold underline cursor-pointer">
                Back to Admin
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile admin "view as" sheet */}
      {isHodModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-3 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">View as</h3>
              <button
                onClick={() => setIsHodModalOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 p-1"
              >
                Close
              </button>
            </div>
            {[
              { name: '__admin__', label: 'Admin View (All Staff)', count: undefined as number | undefined },
              ...availableHods.map(h => ({ name: h.name, label: h.name, count: h.totalStaff }))
            ].map(item => {
              const selected =
                item.name === '__admin__'
                  ? currentRole === 'ADMIN'
                  : currentRole === 'HOD' && currentHod.name === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    handleViewAs(item.name);
                    setIsHodModalOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-sm transition-colors cursor-pointer ${
                    selected
                      ? 'bg-indigo-50 border-indigo-300 font-bold text-indigo-950'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {item.count} staff
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
