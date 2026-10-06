import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { HodDashboard } from './components/dashboard/HodDashboard';
import { DailyRankingTable } from './components/ranking/DailyRankingTable';
import { TeamLeaderboard } from './components/leaderboard/TeamLeaderboard';
import { WeeklyRecordsPage } from './components/weekly/WeeklyRecordsPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AppsScriptSetupModal } from './components/settings/AppsScriptSetupModal';
import { RankingModal } from './components/ranking/RankingModal';
import { HistoryModal } from './components/ranking/HistoryModal';
import { NotificationToast } from './components/common/NotificationToast';
import { LoginPage } from './components/auth/LoginPage';
import { MonthlyRankingPage } from './components/monthly/MonthlyRankingPage';
import { Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeTab, authUser, currentRole, isLoading, employees } = useApp();

  if (!authUser) {
    return (
      <>
        <LoginPage />
        <NotificationToast />
      </>
    );
  }

  if (isLoading && employees.length === 0) {
    return (
      <div className="h-dvh app-bg flex flex-col items-center justify-center gap-4 text-slate-600">
        <img src="/icons.png" alt="Pasmin" className="w-16 h-16 rounded-2xl bg-white p-2 border border-slate-200 shadow-lg object-contain animate-pulse" />
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          Loading your data…
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden app-bg flex font-sans text-slate-900">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <Navbar />

        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="max-w-[1400px] mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
            {activeTab === 'dashboard' && <HodDashboard />}
            {activeTab === 'dailyRanking' && <DailyRankingTable />}
            {activeTab === 'monthlyRanking' && <MonthlyRankingPage />}
            {activeTab === 'leaderboard' && <TeamLeaderboard />}
            {activeTab === 'weeklyRecords' && <WeeklyRecordsPage />}
            {activeTab === 'adminConsole' && currentRole === 'ADMIN' && <AdminDashboard />}
            {activeTab === 'appsScriptSetup' && authUser.role === 'ADMIN' && <AppsScriptSetupModal />}
          </div>
        </main>
      </div>

      {/* Mobile Floating Bottom Bar */}
      <BottomNav />

      {/* Global Modals & Notifications */}
      <RankingModal />
      <HistoryModal />
      <NotificationToast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
