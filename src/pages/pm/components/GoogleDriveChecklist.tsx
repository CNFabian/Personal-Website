import React, { useState, useEffect, useCallback } from 'react';
import QuestItem, { Quest } from './QuestItem';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

interface Props {
  token: string;
  onItemToggled?: () => void;
}

const GoogleDriveChecklist: React.FC<Props> = ({ token, onItemToggled }) => {
  const [items, setItems]           = useState<Quest[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchItems = useCallback(() => {
    setLoading(true);
    fetch(`${PM_API}/drive/checklist`, { headers })
      .then(r => r.json())
      .then(data => {
        setConfigured(data.configured !== false);
        setItems(data.items ?? []);
      })
      .catch(() => setConfigured(false))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${PM_API}/drive/checklist/sync`, { method: 'POST', headers });
      const data = await res.json();
      if (data.items) setItems(data.items);
    } catch {
      // silently ignore — user can retry
    } finally {
      setSyncing(false);
    }
  };

  const handleToggle = async (id: number) => {
    const prev = items;
    setItems(its => its.map(i => i.id === id ? { ...i, is_completed: i.is_completed ? 0 : 1 } : i));
    try {
      const res = await fetch(`${PM_API}/drive/checklist/${id}/toggle`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();
      setItems(its => its.map(i => i.id === id ? data.quest : i));
      onItemToggled?.();
    } catch {
      setItems(prev);
    }
  };

  const handleDelete = async (id: number) => {
    const prev = items;
    setItems(its => its.filter(i => i.id !== id));
    try {
      const res = await fetch(`${PM_API}/quests/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error();
      onItemToggled?.();
    } catch {
      setItems(prev);
    }
  };

  // Derived stats
  const total = items.length;
  const done  = items.filter(i => i.is_completed).length;

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="pm-drive-checklist">
      <div className="pm-drive-checklist__header">
        <span className="pm-drive-checklist__title">Google Drive</span>
        <div className="pm-drive-checklist__meta">
          {!loading && configured && total > 0 && (
            <span className="pm-drive-checklist__count">{done}/{total} done</span>
          )}
          {configured && (
            <button
              className={`pm-drive-checklist__sync-btn${syncing ? ' pm-drive-checklist__sync-btn--syncing' : ''}`}
              onClick={handleSync}
              disabled={syncing || loading}
              aria-label="Sync from Google Drive"
              title="Sync from Google Drive"
            >
              🔄
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ paddingBottom: '12px' }}>
          {[70, 50, 60].map((w, i) => (
            <div
              key={i}
              className="skeleton skeleton-text"
              style={{ width: `${w}%`, marginBottom: '8px' }}
            />
          ))}
        </div>
      ) : !configured ? (
        <p className="pm-drive-checklist__unconfigured">
          Drive not configured — set <code>DRIVE_CHECKLIST_DOC_ID</code> in your server&nbsp;.env to enable syncing.
        </p>
      ) : total === 0 ? (
        <p className="pm-drive-checklist__empty">No checklist items found. Try syncing.</p>
      ) : (
        items.map(item => (
          <QuestItem
            key={item.id}
            quest={item}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
};

export default GoogleDriveChecklist;
