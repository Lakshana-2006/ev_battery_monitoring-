import React, { useState } from 'react';
import { BatteryProvider, useBattery } from './context/BatteryContext';
import { Header } from './components/Header';
import { Sidebar, TabId } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { BatteryHealthPage } from './pages/BatteryHealthPage';
import { AIAnalyticsPage } from './pages/AIAnalyticsPage';
import { AlertsEventsPage } from './pages/AlertsEventsPage';
import { HistoricalDataPage } from './pages/HistoricalDataPage';
import { DeviceStatusPage } from './pages/DeviceStatusPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { alerts } = useBattery();

  const activeAlertCount = alerts.filter(a => a.status === 'ACTIVE').length;

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPage />;
      case 'live':
        return <LiveMonitoringPage />;
      case 'health':
        return <BatteryHealthPage />;
      case 'ai':
        return <AIAnalyticsPage />;
      case 'alerts':
        return <AlertsEventsPage />;
      case 'history':
        return <HistoricalDataPage />;
      case 'device':
        return <DeviceStatusPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-navy-950 text-slate-100 selection:bg-cyan-500 selection:text-navy-950">
      {/* Top Header */}
      <Header />

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeAlertCount={activeAlertCount}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BatteryProvider>
      <AppContent />
    </BatteryProvider>
  );
};

export default App;
