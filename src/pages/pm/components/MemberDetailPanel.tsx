import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Task } from './TaskCard';
import StatusBadge from './StatusBadge';
import SlackComposer from './SlackComposer';
import EmailComposer from './EmailComposer';
import AISuggestions from './AISuggestions';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

// ── Types ─────────────────────────────────────────────────────

interface TeamMemberFull {
  id: number;
  name: string;
  role: string;
  email?: string;
  github_handle?: string;
  is_active?: number;
  capacity_hours?: number;
}

interface ActivityItem {
  id: number;
  source: string;
  activity_type: string;
  title?: string;
  summary?: string;
  external_url?: string;
  timestamp: string;
}

interface Props {
  memberId: number;
  token: string;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function getRoleKey(role: string): string {
  const r = role.toLowerCase();
  if (r.includes('front'))                      return 'frontend';
  if (r.includes('back'))                       return 'backend';
  if (r.includes('full'))                       return 'fullstack';
  if (r.includes('design') || r.includes('ux')) return 'design';
  if (r.includes('data')   || r.includes('ml')) return 'data';
  return 'default';
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60)  return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)  return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1)    return 'Yesterday';
  if (days < 7)      return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000));
}

function getProgressPct(task: Task): number | null {
  if (!task.estimated_hours || !task.actual_hours) return null;
  return Math.min(100, Math.round((task.actual_hours / task.estimated_hours) * 100));
}

const SOURCE_ICONS: Record<string, string> = {
  github: '🔀',
  slack:  '💬',
  gmail:  '📧',
  manual: '📝',
};

const STATUS_ORDER = ['IN_PROGRESS', 'IN_REVIEW', 'BACKLOG', 'DONE'] as const;

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  IN_REVIEW:   'In Review',
  BACKLOG:     'Backlog',
  DONE:        'Done',
};

// ── Component ─────────────────────────────────────────────────

const MemberDetailPanel: React.FC<Props> = ({ memberId, token, onClose }) => {
  const [visible, setVisible]   = useState(false);
  const [member, setMember]     = useState<TeamMemberFull | null>(null);
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading]   = useState(true);

  // Quick action state
  type QuickAction = 'none' | 'slack' | 'email' | 'ai';
  const [quickAction, setQuickAction] = useState<QuickAction>('none');
  const [slackDraft, setSlackDraft]   = useState('');
  const [emailDraft, setEmailDraft]   = useState('');
  const [emailSubject, setEmailSubject] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const headers  = { Authorization: `Bearer ${token}` };

  // Slide in on mount (one RAF ensures CSS transition plays)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${PM_API}/team`, { headers }).then(r => r.json()),
      fetch(`${PM_API}/activity/member/${memberId}?limit=10`, { headers }).then(r => r.json()),
      fetch(`${PM_API}/tasks`, { headers }).then(r => r.json()),
    ])
      .then(([teamData, activityData, taskData]) => {
        setMember((teamData.members ?? []).find((m: TeamMemberFull) => m.id === memberId) ?? null);
        setActivity(activityData.activity ?? []);
        setTasks((taskData.tasks ?? []).filter((t: Task) => t.assignee_id === memberId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [memberId, token]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Focus trap — re-run after loading finishes (new elements appear)
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || loading) return;

    const getFocusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ));

    getFocusable()[0]?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els   = getFocusable();
      const first = els[0];
      const last  = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    panel.addEventListener('keydown', trap);
    return () => panel.removeEventListener('keydown', trap);
  }, [loading]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 250); // wait for slide-out transition
  }, [onClose]);

  // Derived data
  const currentTask = tasks.find(t => t.status === 'IN_PROGRESS');
  const progressPct = currentTask ? getProgressPct(currentTask) : null;
  const initials    = member ? getInitials(member.name) : '?';
  const roleKey     = member ? getRoleKey(member.role) : 'default';

  const tasksByStatus = STATUS_ORDER.reduce((acc, s) => {
    const bucket = tasks.filter(t => t.status === s);
    acc[s] = s === 'DONE' ? bucket.slice(-5) : bucket;
    return acc;
  }, {} as Record<string, Task[]>);

  // ── Render ──────────────────────────────────────────────────

  return (
    <>
      <div className="pm-detail-backdrop" onClick={handleClose} />

      <div
        ref={panelRef}
        className={`pm-detail-panel${visible ? ' pm-detail-panel--visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={member?.name ?? 'Member detail'}
      >
        {/* Header */}
        <div className="pm-detail-panel__header">
          <div className={`pm-detail-panel__avatar pm-detail-panel__avatar--${roleKey}`}>
            {initials}
          </div>
          <div className="pm-detail-panel__identity">
            {loading || !member ? (
              <>
                <div className="skeleton skeleton-title" style={{ width: '130px' }} />
                <div className="skeleton skeleton-text"  style={{ width: '90px', marginTop: '4px' }} />
              </>
            ) : (
              <>
                <h2 className="pm-detail-panel__name">{member.name}</h2>
                <span className="pm-detail-panel__role">{member.role}</span>
                {member.email && (
                  <a className="pm-detail-panel__email" href={`mailto:${member.email}`}>
                    {member.email}
                  </a>
                )}
              </>
            )}
          </div>
          <button className="pm-detail-panel__close" onClick={handleClose} aria-label="Close panel">
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="pm-detail-panel__body">

          {/* Quick Actions */}
          {quickAction === 'none' && (
            <div className="pm-detail-panel__quick-actions">
              <button
                className="pm-detail-panel__action-btn"
                onClick={() => { setSlackDraft(''); setQuickAction('slack'); }}
                disabled={loading || !member}
              >
                💬 Slack
              </button>
              <button
                className="pm-detail-panel__action-btn"
                onClick={() => { setEmailDraft(''); setEmailSubject(''); setQuickAction('email'); }}
                disabled={loading || !member}
              >
                📧 Email
              </button>
              <button
                className="pm-detail-panel__action-btn"
                onClick={() => setQuickAction('ai')}
                disabled={loading || !member}
              >
                🤖 AI Suggest
              </button>
            </div>
          )}

          {quickAction === 'slack' && member && (
            <SlackComposer
              memberId={memberId}
              memberName={member.name}
              token={token}
              initialText={slackDraft || undefined}
              onClose={() => setQuickAction('none')}
              onSent={() => setQuickAction('none')}
            />
          )}

          {quickAction === 'email' && member && (
            <EmailComposer
              memberId={memberId}
              memberName={member.name}
              memberEmail={member.email ?? ''}
              token={token}
              initialSubject={emailSubject || undefined}
              initialBody={emailDraft || undefined}
              onClose={() => setQuickAction('none')}
              onSent={() => setQuickAction('none')}
            />
          )}

          {quickAction === 'ai' && member && (
            <AISuggestions
              memberId={memberId}
              memberName={member.name}
              token={token}
              onSendSlack={draft => {
                setSlackDraft(draft);
                setQuickAction('slack');
              }}
              onSendEmail={(draft, subject) => {
                setEmailDraft(draft);
                setEmailSubject(subject ?? '');
                setQuickAction('email');
              }}
              onClose={() => setQuickAction('none')}
            />
          )}

          {/* Current Work */}
          <div className="pm-detail-panel__section">
            <h3 className="pm-detail-panel__section-title">Current Work</h3>
            {loading ? (
              <>
                <div className="skeleton skeleton-title" style={{ width: '80%' }} />
                <div className="skeleton skeleton-text"  style={{ width: '55%' }} />
              </>
            ) : currentTask ? (
              <div className="pm-detail-panel__current-task">
                <p className="pm-detail-panel__task-title">{currentTask.title}</p>
                <div className="pm-detail-panel__task-meta">
                  <StatusBadge status={currentTask.status} size="sm" />
                  <span className={`priority-badge priority-badge--${currentTask.priority.toLowerCase()}`}>
                    {currentTask.priority}
                  </span>
                </div>
                {currentTask.started_at && (
                  <p className="pm-detail-panel__task-age">
                    Started {daysSince(currentTask.started_at)}d ago
                    {currentTask.estimated_hours
                      ? ` · Est: ${Math.ceil(currentTask.estimated_hours / 8)}d`
                      : ''}
                  </p>
                )}
                {progressPct !== null && (
                  <div className="pm-station__progress-wrap" style={{ marginTop: '10px' }}>
                    <div className="pm-station__progress-bar">
                      <div className="pm-station__progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="pm-station__progress-pct">{progressPct}%</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="pm-detail-panel__empty">No active task</p>
            )}
          </div>

          {/* Recent Activity */}
          <div className="pm-detail-panel__section">
            <h3 className="pm-detail-panel__section-title">Recent Activity</h3>
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="pm-detail-panel__activity-item">
                  <div className="skeleton" style={{ width: '2rem', height: '2rem', borderRadius: '8px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="skeleton skeleton-text" style={{ width: '85%' }} />
                    <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                  </div>
                </div>
              ))
            ) : activity.length === 0 ? (
              <p className="pm-detail-panel__empty">No recent activity</p>
            ) : (
              activity.map(item => (
                <div key={item.id} className="pm-detail-panel__activity-item">
                  <span className={`pm-detail-panel__activity-icon pm-detail-panel__activity-icon--${item.source}`}>
                    {SOURCE_ICONS[item.source] ?? '📝'}
                  </span>
                  <div className="pm-detail-panel__activity-body">
                    <p className="pm-detail-panel__activity-text">
                      {item.title ?? item.activity_type.replace(/_/g, ' ')}
                    </p>
                    {item.summary && (
                      <p className="pm-detail-panel__activity-summary">{item.summary}</p>
                    )}
                  </div>
                  <span className="pm-detail-panel__activity-time">
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* All Tasks */}
          <div className="pm-detail-panel__section">
            <h3 className="pm-detail-panel__section-title">Tasks</h3>
            {loading ? (
              [1, 2].map(i => (
                <div key={i} className="pm-detail-panel__task-item">
                  <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                  <div className="skeleton skeleton-badge" />
                </div>
              ))
            ) : tasks.length === 0 ? (
              <p className="pm-detail-panel__empty">No tasks assigned</p>
            ) : (
              STATUS_ORDER.map(s => {
                const bucket = tasksByStatus[s];
                if (!bucket?.length) return null;
                return (
                  <div key={s} className="pm-detail-panel__task-group">
                    <span className="pm-detail-panel__task-group-label">{STATUS_LABELS[s]}</span>
                    {bucket.map(t => (
                      <div key={t.id} className="pm-detail-panel__task-item">
                        <span className="pm-detail-panel__task-item-title">{t.title}</span>
                        <div className="pm-detail-panel__task-item-meta">
                          <StatusBadge status={t.status} size="sm" />
                          <span className="pm-detail-panel__task-item-age">
                            {daysSince(t.updated_at)}d
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>

        </div>{/* /body */}
      </div>
    </>
  );
};

export default MemberDetailPanel;
