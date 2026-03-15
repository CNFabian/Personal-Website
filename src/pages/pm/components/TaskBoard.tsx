import React, { useState, useEffect, useCallback } from 'react';
import TaskCard, { Task } from './TaskCard';
import TaskModal from './TaskModal';
import { useToast } from './Toast';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

const COLUMNS = [
  { status: 'BACKLOG',     label: 'Backlog'     },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'IN_REVIEW',   label: 'In Review'   },
  { status: 'DONE',        label: 'Done'        },
] as const;

type ColStatus = typeof COLUMNS[number]['status'];

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000));
}

interface Props {
  token: string;
}

const BoardSkeleton = () => (
  <div className="task-board">
    {([3, 2, 1, 1] as number[]).map((count, i) => (
      <div key={i} className="task-column">
        <div className="task-column__header">
          <div className="skeleton skeleton-text" style={{ width: '80px' }} />
          <div className="skeleton skeleton-badge" />
        </div>
        <div className="task-column__cards">
          {Array.from({ length: count }, (_, j) => (
            <div key={j} className="task-card">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              <div className="skeleton skeleton-text" style={{ width: '35%' }} />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const TaskBoard: React.FC<Props> = ({ token }) => {
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask]   = useState(false);
  const { showToast } = useToast();

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${PM_API}/tasks`, { headers });
      if (res.ok) {
        const data = await res.json();
        const enriched: Task[] = (data.tasks ?? []).map((t: Task) => ({
          ...t,
          days_in_status: daysSince(t.updated_at),
        }));
        setTasks(enriched);
      }
    } catch {
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleMove = useCallback(async (task: Task, newStatus: string) => {
    try {
      const res = await fetch(`${PM_API}/tasks/${task.id}/move`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Moved to ${newStatus.replace(/_/g, ' ').toLowerCase()}`);
        fetchTasks();
      } else {
        showToast('Failed to move task', 'error');
      }
    } catch {
      showToast('Connection error', 'error');
    }
  }, [token, fetchTasks, showToast]);

  if (loading) return (
    <div className="task-board-wrapper">
      <div className="pm-section-header">
        <h2 className="pm-section-title">Task Board</h2>
        <div className="skeleton" style={{ width: '80px', height: '32px', borderRadius: '8px' }} />
      </div>
      <BoardSkeleton />
    </div>
  );

  return (
    <div className="task-board-wrapper">
      <div className="pm-section-header">
        <h2 className="pm-section-title">Task Board</h2>
        <button className="pm-btn pm-btn--primary" onClick={() => setShowNewTask(true)}>
          New Task
        </button>
      </div>

      {error && <p className="pm-error">{error}</p>}

      <div className="task-board">
        {COLUMNS.map((col, colIdx) => {
          const colTasks   = tasks.filter(t => t.status === col.status);
          const prevStatus = colIdx > 0 ? COLUMNS[colIdx - 1].status : null;
          const nextStatus = colIdx < COLUMNS.length - 1 ? COLUMNS[colIdx + 1].status : null;
          return (
            <div key={col.status} className="task-column">
              <div className="task-column__header">
                <span className="task-column__label">{col.label}</span>
                <span className="task-column__count">{colTasks.length}</span>
              </div>
              <div className="task-column__cards">
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={t => setSelectedTask(t)}
                    onMove={handleMove}
                    prevStatus={prevStatus}
                    nextStatus={nextStatus}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          token={token}
          onClose={() => setSelectedTask(null)}
          onSave={() => { showToast('Task updated'); fetchTasks(); }}
        />
      )}

      {showNewTask && (
        <TaskModal
          token={token}
          onClose={() => setShowNewTask(false)}
          onSave={() => { showToast('Task created'); fetchTasks(); }}
        />
      )}
    </div>
  );
};

export default TaskBoard;
