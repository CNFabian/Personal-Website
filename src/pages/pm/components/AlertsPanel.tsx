import React, { useState, useEffect, useCallback } from 'react';
import AlertCard, { Alert } from './AlertCard';
import { useToast } from './Toast';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

interface Props {
  token: string;
}

const AlertsSkeleton = () => (
  <div className="alerts-list">
    {[1, 2, 3].map(i => (
      <div key={i} className="alert-card alert-card--medium">
        <div className="alert-card__body">
          <div className="skeleton skeleton-title" style={{ width: '55%', marginBottom: '8px' }} />
          <div className="skeleton skeleton-text" style={{ width: '90%' }} />
          <div className="skeleton skeleton-text" style={{ width: '65%' }} />
        </div>
      </div>
    ))}
  </div>
);

const AlertsPanel: React.FC<Props> = ({ token }) => {
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAlerts = useCallback(() => {
    fetch(`${PM_API}/alerts`, { headers })
      .then(r => r.json())
      .then(d => setAlerts(d.alerts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleAck = async (id: number) => {
    await fetch(`${PM_API}/alerts/${id}/ack`, { method: 'PATCH', headers });
    fetchAlerts();
    showToast('Alert acknowledged');
  };

  if (loading) return (
    <div className="alerts-panel">
      <div className="pm-section-header">
        <h2 className="pm-section-title">Alerts</h2>
      </div>
      <AlertsSkeleton />
    </div>
  );

  const activeCount = alerts.filter(a => !a.is_acknowledged).length;

  return (
    <div className="alerts-panel">
      <div className="pm-section-header">
        <h2 className="pm-section-title">Alerts</h2>
        <span className="pm-badge">{activeCount} active</span>
      </div>

      {alerts.length === 0 ? (
        <p className="pm-empty">No active alerts.</p>
      ) : (
        <div className="alerts-list">
          {alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} onAck={handleAck} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
