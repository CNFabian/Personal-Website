import React, { useState, useEffect } from 'react';
import { Task } from './TaskCard';
import { TeamMember } from './TeamMemberCard';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const STATUSES   = ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;

interface Props {
  task?: Task | null;
  token: string;
  onClose: () => void;
  onSave: () => void;
}

const TaskModal: React.FC<Props> = ({ task, token, onClose, onSave }) => {
  const [form, setForm] = useState({
    title:           task?.title           ?? '',
    description:     task?.description     ?? '',
    assignee_id:     task?.assignee_id?.toString() ?? '',
    priority:        task?.priority        ?? 'MEDIUM',
    status:          task?.status          ?? 'BACKLOG',
    estimated_hours: task?.estimated_hours?.toString() ?? '',
  });
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${PM_API}/team`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setMembers(d.members ?? []))
      .catch(() => {});
  }, [token]);

  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        title:           form.title,
        description:     form.description || null,
        assignee_id:     form.assignee_id ? parseInt(form.assignee_id) : null,
        priority:        form.priority,
        status:          form.status,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      };
      const url    = task ? `${PM_API}/tasks/${task.id}` : `${PM_API}/tasks`;
      const method = task ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) { onSave(); onClose(); }
    } catch {
      // silent — parent can refetch
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pm-modal-overlay" onClick={onClose}>
      <div className="pm-modal pm-modal--wide" onClick={e => e.stopPropagation()}>
        <h3 className="pm-modal__title">{task ? 'Edit Task' : 'New Task'}</h3>
        <form onSubmit={handleSubmit} className="pm-form">
          <input
            className="pm-input"
            placeholder="Title *"
            value={form.title}
            onChange={e => set({ title: e.target.value })}
            required
            autoFocus
          />
          <textarea
            className="pm-input pm-input--textarea"
            placeholder="Description"
            value={form.description}
            onChange={e => set({ description: e.target.value })}
            rows={3}
          />
          <select
            className="pm-select"
            value={form.assignee_id}
            onChange={e => set({ assignee_id: e.target.value })}
          >
            <option value="">Unassigned</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <div className="pm-form__row">
            <select
              className="pm-select"
              value={form.priority}
              onChange={e => set({ priority: e.target.value })}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              className="pm-select"
              value={form.status}
              onChange={e => set({ status: e.target.value })}
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <input
            className="pm-input"
            type="number"
            placeholder="Estimated hours"
            value={form.estimated_hours}
            onChange={e => set({ estimated_hours: e.target.value })}
            min="0"
            step="0.5"
          />
          <div className="pm-form__actions">
            <button
              type="button"
              className="pm-btn pm-btn--ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pm-btn pm-btn--primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
