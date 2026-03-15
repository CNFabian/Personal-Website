import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/pages/_pm.scss';
import CommandBar, { Tab } from './components/CommandBar';
import CommandCenter from './components/CommandCenter';
import TeamOverview  from './components/TeamOverview';
import TaskBoard     from './components/TaskBoard';
import ActivityFeed  from './components/ActivityFeed';
import AlertsPanel   from './components/AlertsPanel';
import PMChat        from './components/PMChat';
import { ToastProvider } from './components/Toast';

const PMDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('command');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('pm_auth_token')) {
      navigate('/pm/login');
    }
  }, [navigate]);

  // Alt+1–5: keyboard tab switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.altKey && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const tabs: Tab[] = ['command', 'team', 'tasks', 'activity', 'alerts', 'chat'];
        const idx = parseInt(e.key) - 1;
        if (tabs[idx]) setActiveTab(tabs[idx]);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const token = localStorage.getItem('pm_auth_token') ?? '';

  const handleLogout = () => {
    localStorage.removeItem('pm_auth_token');
    navigate('/pm/login');
  };

  if (!token) return null;

  return (
    <ToastProvider>
      <div className="pm-dashboard">
        <CommandBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={handleLogout}
          token={token}
        />

        <main className="pm-content">
          <div key={activeTab} className="pm-tab-content">
            {activeTab === 'command'  && <CommandCenter token={token} />}
            {activeTab === 'team'     && <TeamOverview  token={token} />}
            {activeTab === 'tasks'    && <TaskBoard     token={token} />}
            {activeTab === 'activity' && <ActivityFeed  token={token} />}
            {activeTab === 'alerts'   && <AlertsPanel   token={token} />}
            {activeTab === 'chat'     && <PMChat        token={token} />}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
};

export default PMDashboard;
