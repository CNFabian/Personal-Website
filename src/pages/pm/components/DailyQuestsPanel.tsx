import React, { useState, useEffect, useCallback, useRef } from 'react';
import QuestItem, { Quest } from './QuestItem';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

interface Streak {
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  total_quests_completed: number;
}

interface Props {
  token: string;
}

const DEFAULT_STREAK: Streak = {
  current_streak: 0,
  longest_streak: 0,
  last_completed_date: null,
  total_quests_completed: 0,
};

const SECTION_ORDER = ['ai_priority', 'drive_checklist', 'manual'] as const;

const SECTION_LABELS: Record<string, string> = {
  ai_priority:     'AI Priorities',
  drive_checklist: 'Google Drive',
  manual:          'Manual',
};

const DailyQuestsPanel: React.FC<Props> = ({ token }) => {
  const [quests, setQuests]     = useState<Quest[]>([]);
  const [streak, setStreak]     = useState<Streak>(DEFAULT_STREAK);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [adding, setAdding]     = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const headers  = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`${PM_API}/quests/daily`, { headers })
      .then(r => r.json())
      .then(data => {
        setQuests(data.quests ?? []);
        setStreak(data.streak ?? DEFAULT_STREAK);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Focus add input shortly after drawer opens
  useEffect(() => {
    if (expanded) {
      const id = setTimeout(() => inputRef.current?.focus(), 320);
      return () => clearTimeout(id);
    }
  }, [expanded]);

  const handleToggle = async (id: number) => {
    const prevQuests = quests;
    // Optimistic update
    setQuests(qs =>
      qs.map(q => q.id === id ? { ...q, is_completed: q.is_completed ? 0 : 1 } : q),
    );
    try {
      const res = await fetch(`${PM_API}/quests/${id}/toggle`, { method: 'PATCH', headers });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();
      // Sync exact server state
      setQuests(qs => qs.map(q => q.id === id ? data.quest : q));
      if (data.streak) setStreak(data.streak);
    } catch {
      setQuests(prevQuests);
    }
  };

  const handleDelete = async (id: number) => {
    const prevQuests = quests;
    setQuests(qs => qs.filter(q => q.id !== id));
    try {
      const res = await fetch(`${PM_API}/quests/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error();
    } catch {
      setQuests(prevQuests);
    }
  };

  const handleAdd = async () => {
    const title = addInput.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`${PM_API}/quests`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();
      setQuests(qs => [...qs, data.quest]);
      setAddInput('');
      inputRef.current?.focus();
    } catch {
      // silently ignore — user can retry
    } finally {
      setAdding(false);
    }
  };

  // Derived stats
  const total  = quests.length;
  const done   = quests.filter(q => q.is_completed).length;
  const allDone = total > 0 && done === total;
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;

  const questsByType = SECTION_ORDER.reduce((acc, type) => {
    acc[type] = quests.filter(q => q.quest_type === type);
    return acc;
  }, {} as Record<string, Quest[]>);

  return (
    <div className="pm-quests-panel">

      {/* Drawer — slides up above the bar */}
      <div className={`pm-quests-drawer${expanded ? ' pm-quests-drawer--open' : ''}`}>
        {loading ? (
          <div className="pm-quests-drawer__loading">
            {[75, 55, 65, 45].map((w, i) => (
              <div
                key={i}
                className="skeleton skeleton-text"
                style={{ width: `${w}%`, marginBottom: '10px' }}
              />
            ))}
          </div>
        ) : (
          <>
            {allDone && (
              <p className="pm-quests-drawer__all-clear">All done for today! 🎉</p>
            )}

            {SECTION_ORDER.map(type => {
              const bucket = questsByType[type];
              if (!bucket.length) return null;
              return (
                <div key={type} className="pm-quests-drawer__section">
                  <span className="pm-quests-drawer__section-title">
                    {SECTION_LABELS[type]}
                  </span>
                  {bucket.map(q => (
                    <QuestItem
                      key={q.id}
                      quest={q}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              );
            })}

            <div className="pm-quests-drawer__add">
              <input
                ref={inputRef}
                className="pm-composer__input pm-quests-drawer__add-input"
                type="text"
                value={addInput}
                onChange={e => setAddInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Add a quest…"
                disabled={adding}
              />
              <button
                className="pm-quests-drawer__add-btn"
                onClick={handleAdd}
                disabled={adding || !addInput.trim()}
                aria-label="Add quest"
              >
                +
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bar — always visible */}
      <div
        className="pm-quests-bar"
        onClick={() => setExpanded(e => !e)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setExpanded(ex => !ex)}
      >
        {/* Background progress fill */}
        <div className="pm-quests-bar__progress" style={{ width: `${pct}%` }} />

        <span className="pm-quests-bar__label">Daily Quests</span>

        {loading ? (
          <div className="skeleton skeleton-text" style={{ width: '60px' }} />
        ) : (
          <span className="pm-quests-bar__count">{done}/{total} done</span>
        )}

        <span className={`pm-quests-bar__streak${streak.current_streak > 0 ? ' pm-quests-bar__streak--active' : ''}`}>
          🔥 {streak.current_streak}
        </span>

        <span className="pm-quests-bar__chevron" aria-hidden="true">
          {expanded ? '▾' : '▴'}
        </span>
      </div>
    </div>
  );
};

export default DailyQuestsPanel;
