import React from 'react';

export interface Alert {
  id: number;
  task_id?: number;
  member_id?: number;
  alert_type: string;
  severity: string;
  message: string;
  suggested_action?: string;
  is_acknowledged: number;
  created_at: string;
}

interface Props {
  alert: Alert;
  onAck: (id: number) => void;
}

const AlertCard: React.FC<Props> = ({ alert, onAck }) => (
  <div className={`alert-card alert-card--${alert.severity}`}>
    <div className="alert-card__body">
      <div className="alert-card__header">
        <span className={`alert-severity--${alert.severity}`}>
          {alert.severity.toUpperCase()}
        </span>
        <span className="alert-card__type">
          {alert.alert_type.replace(/_/g, ' ')}
        </span>
        <span className="alert-card__time">
          {new Date(alert.created_at).toLocaleDateString()}
        </span>
      </div>
      <p className="alert-card__message">{alert.message}</p>
      {alert.suggested_action && (
        <p className="alert-card__action">→ {alert.suggested_action}</p>
      )}
    </div>
    {!alert.is_acknowledged && (
      <button
        className="pm-btn pm-btn--sm pm-btn--ghost"
        onClick={() => onAck(alert.id)}
      >
        Acknowledge
      </button>
    )}
  </div>
);

export default AlertCard;
