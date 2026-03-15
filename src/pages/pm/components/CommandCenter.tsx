import React, { useState, useEffect, useCallback } from 'react';
import MemberStation, { StationMember, StationStatus } from './MemberStation';
import MemberDetailPanel from './MemberDetailPanel';
import DailyQuestsPanel from './DailyQuestsPanel';
import { Task } from './TaskCard';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

interface Props {
  token: string;
}

interface EnrichedMember {
  member: StationMember;
  currentTask?: Task;
  status: StationStatus;
  daysInStatus: number;
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86_400_000,
  ));
}

function deriveStatus(member: StationMember, task?: Task): StationStatus {
  if (!member.is_active) return 'inactive';
  if (!task) return 'inactive';
  const days = daysSince(task.updated_at);
  if (days >= 5) return 'blocked';
  if (days >= 2) return 'warning';
  return 'active';
}

const CommandCenterSkeleton = () => (
  <div className="pm-command-center__grid">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="pm-station pm-station--inactive">
        <div className="pm-station__header">
          <div className="skeleton skeleton-avatar" style={{ borderRadius: '50%' }} />
          <div className="pm-station__identity">
            <div className="skeleton skeleton-title" style={{ width: '100px' }} />
            <div className="skeleton skeleton-text"  style={{ width: '70px' }} />
          </div>
        </div>
        <div className="skeleton skeleton-text" style={{ width: '90%' }} />
        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
      </div>
    ))}
  </div>
);

const CommandCenter: React.FC<Props> = ({ token }) => {
  const [enriched, setEnriched] = useState<EnrichedMember[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [memberRes, taskRes] = await Promise.all([
        fetch(`${PM_API}/team`,  { headers }),
        fetch(`${PM_API}/tasks`, { headers }),
      ]);
      const memberData = await memberRes.json();
      const taskData   = await taskRes.json();

      const allTasks: Task[]    = taskData.tasks ?? [];
      const members: StationMember[] = memberData.members ?? [];

      // Map each member to their first IN_PROGRESS task
      const taskByAssignee: Record<number, Task> = {};
      allTasks
        .filter(t => t.status === 'IN_PROGRESS')
        .forEach(t => {
          if (t.assignee_id && !taskByAssignee[t.assignee_id]) {
            taskByAssignee[t.assignee_id] = t;
          }
        });

      const result: EnrichedMember[] = members.map(m => {
        const task   = taskByAssignee[m.id];
        const status = deriveStatus(m, task);
        const days   = task ? daysSince(task.updated_at) : 0;
        return { member: m, currentTask: task, status, daysInStatus: days };
      });

      // Sort: blocked first, then warning, active, inactive
      const ORDER: Record<StationStatus, number> = {
        blocked: 0, warning: 1, active: 2, inactive: 3,
      };
      result.sort((a, b) => ORDER[a.status] - ORDER[b.status]);

      setEnriched(result);
    } catch {
      setError('Failed to load team data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSelect = useCallback((memberId: number) => {
    setSelectedId(prev => prev === memberId ? null : memberId);
  }, []);

  const activeCount  = enriched.filter(e => e.status === 'active').length;
  const blockedCount = enriched.filter(e => e.status === 'blocked').length;

  if (loading) return (
    <div className="pm-command-center">
      <div className="pm-command-center__meta">
        <div className="skeleton skeleton-text" style={{ width: '160px' }} />
      </div>
      <CommandCenterSkeleton />
    </div>
  );

  return (
    <>
    {selectedId !== null && (
      <MemberDetailPanel
        memberId={selectedId}
        token={token}
        onClose={() => setSelectedId(null)}
      />
    )}
    <div className="pm-command-center">
      {/* Status bar */}
      <div className="pm-command-center__meta">
        <span className="pm-command-center__stat pm-command-center__stat--active">
          {activeCount} active
        </span>
        {blockedCount > 0 && (
          <span className="pm-command-center__stat pm-command-center__stat--blocked">
            {blockedCount} stale
          </span>
        )}
        <span className="pm-command-center__stat">
          {enriched.length} engineers
        </span>
      </div>

      {error && <p className="pm-error">{error}</p>}

      {enriched.length === 0 ? (
        <p className="pm-empty">No team members yet. Add members from the Team tab.</p>
      ) : (
        <div className="pm-command-center__grid">
          {enriched.map(({ member, currentTask, status, daysInStatus }) => (
            <MemberStation
              key={member.id}
              member={member}
              currentTask={currentTask}
              status={status}
              daysInStatus={daysInStatus}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      <DailyQuestsPanel token={token} />
    </div>
    </>
  );
};

export default CommandCenter;
