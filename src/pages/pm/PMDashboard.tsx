import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/pages/_pm.scss';
import TeamOverview  from './components/TeamOverview';
import TaskBoard     from './components/TaskBoard';
import ActivityFeed  from './components/ActivityFeed';
import AlertsPanel   from './components/AlertsPanel';
import { ToastProvider } from './components/Toast';

type Tab = 'team' | 'tasks' | 'activity' | 'alerts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'team',     label: 'Team'     },
  { id: 'tasks',    label: 'Tasks'    },
  { id: 'activity', label: 'Activity' },
  { id: 'alerts',   label: 'Alerts'   },
];

const PMDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('team');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('pm_auth_token')) {
      navigate('/pm/login');
    }
  }, [navigate]);

  const token = localStorage.getItem('pm_auth_token') ?? '';

  const handleLogout = () => {
    localStorage.removeItem('pm_auth_token');
    navigate('/pm/login');
  };

  if (!token) return null;

  return (
    <ToastProvider>
      <div className="pm-dashboard">
        <header className="pm-header">
          <h1 className="pm-header__title">PM Dashboard</h1>
          <button className="pm-header__logout" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <nav className="pm-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`pm-tab${activeTab === tab.id ? ' pm-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="pm-content">
          <div key={activeTab} className="pm-tab-content">
            {activeTab === 'team'     && <TeamOverview token={token} />}
            {activeTab === 'tasks'    && <TaskBoard    token={token} />}
            {activeTab === 'activity' && <ActivityFeed token={token} />}
            {activeTab === 'alerts'   && <AlertsPanel  token={token} />}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
};

export default PMDashboard;
