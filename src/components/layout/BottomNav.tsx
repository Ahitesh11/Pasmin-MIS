import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  LayoutDashboard,
  Trophy,
  CalendarCheck,
  CalendarDays,
  Shield
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, currentRole, myHodEmployees, rankingDay } = useApp();

  const todayField = `day${rankingDay}` as const;
  const pendingCount = myHodEmployees.filter(
    (e) => e[todayField] === null || e[todayField] === undefined
  ).length;

  const items = [
    {
      id: 'dailyRanking',
      label: 'Daily Rank',
      icon: Users,
      badge: pendingCount > 0 ? pendingCount : null
    },
    {
      id: 'monthlyRanking',
      label: 'Monthly',
      icon: CalendarDays,
      badge: null
    },
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'leaderboard',
      label: 'Leaders',
      icon: Trophy,
      badge: null
    },
    {
      id: 'weeklyRecords',
      label: 'Weekly',
      icon: CalendarCheck,
      badge: null
    },
    ...(currentRole === 'ADMIN'
      ? [{ id: 'adminConsole', label: 'Admin', icon: Shield, badge: null }]
      : [])
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg pb-safe">
      <nav className="flex items-center justify-around px-2 py-1.5 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
                isActive
                  ? 'text-sky-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-sky-700 stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />
                {item.badge !== null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-sky-800' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-4 h-0.5 rounded-full bg-sky-600 mt-0.5"></span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
