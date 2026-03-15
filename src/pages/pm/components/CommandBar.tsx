import React, { useState, useEffect } from 'react';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

export type Tab = 'command' | 'team' | 'tasks' | 'activity' | 'alerts' | 'chat';

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onLogout: () => void;
  token: string;
}

interface TabDef {
  id: Tab;
  icon: string;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'command',  icon: '🎯', label: 'Command'  },
  { id: 'team',     icon: '👥', label: 'Team'     },
  { id: 'tasks',    icon: '📋', label: 'Tasks'    },
  { id: 'activity', icon: '📊', label: 'Activity' },
  { id: 'alerts',   icon: '🚨', label: 'Alerts'   },
  { id: 'chat',     icon: '💬', label: 'Chat'     },
];

const CommandBar: React.FC<Props> = ({ activeTab, onTabChange, onLogout, token }) => {
  const [alertCount, setAlertCount] = useState(0);

  const headers = { Authorization: `Bearer ${token}` };

  // Refresh unacknowledged alert count on tab change + every 60 seconds
  useEffect(() => {
    const fetchAlerts = () => {
      fetch(`${PM_API}/alerts`, { headers })
        .then(r => r.json())
        .then(data => setAlertCount((data.alerts ?? []).length))
        .catch(() => {});
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(interval);
  }, [activeTab, token]);

  return (
    <header className="pm-command-bar" role="banner">
      {/* Brand */}
      <div
        className="pm-command-bar__brand"
        onClick={() => onTabChange('command')}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onTabChange('command')}
        aria-label="Go to Command Center"
        style={{ cursor: 'pointer' }}
      >
        <span className="pm-command-bar__logo" aria-hidden="true">⬡</span>
        <span className="pm-command-bar__brand-text">PM Command Center</span>
      </div>

      <div className="pm-command-bar__separator" aria-hidden="true" />

      {/* Tab navigation */}
      <nav className="pm-command-bar__nav" aria-label="Dashboard navigation">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`pm-command-bar__tab${activeTab === tab.id ? ' pm-command-bar__tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="pm-command-bar__tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="pm-command-bar__tab-label">{tab.label}</span>
            {tab.id === 'alerts' && alertCount > 0 && (
              <span className="pm-command-bar__badge" aria-label={`${alertCount} unacknowledged alerts`}>
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Right actions */}
      <div className="pm-command-bar__actions">
        <button
          className="pm-command-bar__icon-btn"
          aria-label="Settings (coming soon)"
          title="Settings"
          disabled
        >
          ⚙
        </button>
        <button
          className="pm-command-bar__logout"
          onClick={onLogout}
          aria-label="Logout"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default CommandBar;
