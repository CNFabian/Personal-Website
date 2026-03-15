import React from 'react';
import { Task } from './TaskCard';

export type StationStatus = 'active' | 'warning' | 'blocked' | 'inactive';

export interface StationMember {
  id: number;
  name: string;
  role: string;
  is_active?: number;
  github_handle?: string;
  email?: string;
}

interface Props {
  member: StationMember;
  currentTask?: Task;
  status: StationStatus;
  daysInStatus: number;
  openPRs: number;
  slackMessages: number;
  onSelect: (memberId: number) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getRoleKey(role: string): string {
  const r = role.toLowerCase();
  if (r.includes('front')) return 'frontend';
  if (r.includes('back'))  return 'backend';
  if (r.includes('full'))  return 'fullstack';
  if (r.includes('design') || r.includes('ux')) return 'design';
  if (r.includes('data')   || r.includes('ml')) return 'data';
  return 'default';
}

function getProgressPct(task: Task): number | null {
  if (!task.estimated_hours || !task.actual_hours) return null;
  return Math.min(100, Math.round((task.actual_hours / task.estimated_hours) * 100));
}

function getTimeLabel(task: Task): string | null {
  if (!task.started_at) return null;
  const daysElapsed  = Math.max(1, Math.round(
    (Date.now() - new Date(task.started_at).getTime()) / 86_400_000,
  ));
  const estDays = task.estimated_hours
    ? Math.max(1, Math.ceil(task.estimated_hours / 8))
    : null;
  return estDays ? `Day ${daysElapsed} of ~${estDays}` : `Day ${daysElapsed}`;
}

const STATUS_LABELS: Record<StationStatus, string> = {
  active:   'Active',
  warning:  'Idle',
  blocked:  'Stale',
  inactive: 'Away',
};

const MemberStation: React.FC<Props> = ({ member, currentTask, status, daysInStatus, openPRs, slackMessages, onSelect }) => {
  const initials    = getInitials(member.name);
  const roleKey     = getRoleKey(member.role);
  const progressPct = currentTask ? getProgressPct(currentTask) : null;
  const timeLabel   = currentTask ? getTimeLabel(currentTask) : null;

  // Derive basic stats from task data (PRs come in Phase 2 with GitHub integration)
  const blockerCount = status === 'blocked' ? 1 : 0;

  return (
    <div
      className={`pm-station pm-station--${status}`}
      onClick={() => onSelect(member.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect(member.id)}
    >
      {/* Header row: avatar + name/role */}
      <div className="pm-station__header">
        <div className={`pm-station__avatar pm-station__avatar--${roleKey}`}>
          {initials}
        </div>
        <div className="pm-station__identity">
          <span className="pm-station__name">{member.name}</span>
          <span className="pm-station__role">{member.role}</span>
        </div>
        <div className="pm-station__status-wrap">
          <span className={`pm-station__dot pm-station__dot--${status}`} />
          <span className={`pm-station__status-label pm-station__status-label--${status}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      {/* Current task */}
      <div className="pm-station__task">
        {currentTask ? (
          <span className="pm-station__task-name">{currentTask.title}</span>
        ) : (
          <span className="pm-station__task-empty">No active task</span>
        )}
      </div>

      {/* Progress bar */}
      {progressPct !== null && (
        <div className="pm-station__progress-wrap">
          <div className="pm-station__progress-bar">
            <div
              className="pm-station__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="pm-station__progress-pct">{progressPct}%</span>
        </div>
      )}

      {/* Time tracking */}
      {timeLabel && (
        <span className="pm-station__time">{timeLabel}</span>
      )}

      {/* Bottom stats */}
      <div className="pm-station__stats">
        <span className="pm-station__stat" title="Days in status">
          🕐 {daysInStatus}d
        </span>
        <span className="pm-station__stat" title="Slack messages today">
          💬 {slackMessages}
        </span>
        <span className="pm-station__stat" title="Open PRs">
          🔀 {openPRs}
        </span>
        <span
          className={`pm-station__stat${blockerCount > 0 ? ' pm-station__stat--alert' : ''}`}
          title="Blockers"
        >
          ⚠ {blockerCount}
        </span>
      </div>
    </div>
  );
};

export default MemberStation;
