import React, { useState, useEffect, useCallback } from 'react';
import TeamMemberCard, { TeamMember } from './TeamMemberCard';
import { useToast } from './Toast';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

interface RawTask {
  id: number;
  title: string;
  assignee_id?: number;
  status: string;
  started_at?: string;
  updated_at?: string;
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000));
}

interface Props {
  token: string;
}

const TeamSkeleton = () => (
  <div className="team-grid">
    {[1, 2, 3].map(i => (
      <div key={i} className="team-card">
        <div className="team-card__header">
          <div className="skeleton skeleton-avatar" />
          <div className="team-card__meta">
            <div className="skeleton skeleton-title" style={{ width: '120px' }} />
            <div className="skeleton skeleton-text" style={{ width: '80px' }} />
          </div>
        </div>
        <div className="skeleton skeleton-text" style={{ width: '100%' }} />
        <div className="skeleton skeleton-badge" />
      </div>
    ))}
  </div>
);

const TeamOverview: React.FC<Props> = ({ token }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', github_handle: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [teamRes, tasksRes] = await Promise.all([
        fetch(`${PM_API}/team`, { headers }),
        fetch(`${PM_API}/tasks?status=IN_PROGRESS`, { headers }),
      ]);
      const teamData = await teamRes.json();
      const tasksData = await tasksRes.json();

      const taskByAssignee: Record<number, RawTask> = {};
      (tasksData.tasks ?? []).forEach((t: RawTask) => {
        if (t.assignee_id) taskByAssignee[t.assignee_id] = t;
      });

      const enriched: TeamMember[] = (teamData.members ?? []).map((m: TeamMember) => {
        const task = taskByAssignee[m.id];
        return {
          ...m,
          current_task:        task?.title,
          current_task_status: task?.status,
          days_on_task:        task ? daysSince(task.started_at ?? task.updated_at) : undefined,
        };
      });

      setMembers(enriched);
    } catch {
      setError('Failed to load team.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${PM_API}/team`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: '', role: '', github_handle: '', email: '' });
        fetchData();
        showToast(`${form.name} added to team`);
      } else {
        const d = await res.json();
        setError(d.error ?? 'Failed to add member.');
        showToast('Failed to add member', 'error');
      }
    } catch {
      setError('Failed to add member.');
      showToast('Connection error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="team-overview">
      <div className="pm-section-header">
        <h2 className="pm-section-title">Team</h2>
        <div className="skeleton" style={{ width: '90px', height: '32px', borderRadius: '8px' }} />
      </div>
      <TeamSkeleton />
    </div>
  );

  return (
    <div className="team-overview">
      <div className="pm-section-header">
        <h2 className="pm-section-title">Team</h2>
        <button className="pm-btn pm-btn--primary" onClick={() => setShowForm(true)}>
          Add Member
        </button>
      </div>

      {error && <p className="pm-error">{error}</p>}

      {showForm && (
        <div className="pm-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="pm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="pm-modal__title">Add Team Member</h3>
            <form onSubmit={handleAdd} className="pm-form">
              <input
                className="pm-input"
                placeholder="Name *"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
              <input
                className="pm-input"
                placeholder="Role *"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                required
              />
              <input
                className="pm-input"
                placeholder="GitHub handle"
                value={form.github_handle}
                onChange={e => setForm({ ...form, github_handle: e.target.value })}
              />
              <input
                className="pm-input"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
              <div className="pm-form__actions">
                <button
                  type="button"
                  className="pm-btn pm-btn--ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="pm-btn pm-btn--primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <p className="pm-empty">No team members yet. Add your first member.</p>
      ) : (
        <div className="team-grid">
          {members.map(m => (
            <TeamMemberCard key={m.id} member={m} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamOverview;
