import React, { useState, useEffect } from 'react';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

interface ActivityItem {
  id: number;
  member_id?: number;
  member_name?: string;
  source: string;
  activity_type: string;
  title?: string;
  summary?: string;
  external_url?: string;
  timestamp: string;
}

const SOURCE_ICONS: Record<string, string> = {
  github: '⚙',
  slack:  '💬',
  gmail:  '✉',
  manual: '✏',
};

interface Props {
  token: string;
}

const ActivitySkeleton = () => (
  <div className="activity-list">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="activity-item">
        <div className="skeleton skeleton-avatar" style={{ borderRadius: '8px', flexShrink: 0 }} />
        <div className="activity-item__body">
          <div className="skeleton skeleton-title" style={{ width: `${40 + i * 10}%` }} />
          <div className="skeleton skeleton-text" style={{ width: '35%' }} />
        </div>
      </div>
    ))}
  </div>
);

const ActivityFeed: React.FC<Props> = ({ token }) => {
  const [items, setItems]     = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${PM_API}/activity`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setItems(d.activity ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="activity-feed">
      <div className="pm-section-header">
        <h2 className="pm-section-title">Activity</h2>
      </div>
      <ActivitySkeleton />
    </div>
  );

  return (
    <div className="activity-feed">
      <div className="pm-section-header">
        <h2 className="pm-section-title">Activity</h2>
      </div>

      {items.length === 0 ? (
        <p className="pm-empty">No activity yet.</p>
      ) : (
        <div className="activity-list">
          {items.map(item => (
            <div key={item.id} className="activity-item">
              <div className={`activity-item__icon activity-item__icon--${item.source}`}>
                {SOURCE_ICONS[item.source] ?? '•'}
              </div>
              <div className="activity-item__body">
                <p className="activity-item__title">
                  {item.member_name && <strong>{item.member_name}</strong>}
                  {item.member_name ? ' — ' : ''}
                  {item.title ?? item.activity_type.replace(/_/g, ' ')}
                </p>
                {item.summary && (
                  <p className="activity-item__summary">{item.summary}</p>
                )}
                <p className="activity-item__time">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </div>
              {item.external_url && (
                <a
                  href={item.external_url}
                  className="activity-item__link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
