import React from 'react';

export interface Task {
  id: number;
  title: string;
  description?: string;
  assignee_id?: number;
  assignee_name?: string;
  status: string;
  priority: string;
  estimated_hours?: number;
  actual_hours?: number;
  sprint_id?: number;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  // Enriched client-side
  days_in_status?: number;
}

interface Props {
  task: Task;
  onClick: (task: Task) => void;
  onMove: (task: Task, newStatus: string) => void;
  prevStatus: string | null;
  nextStatus: string | null;
}

const TaskCard: React.FC<Props> = ({ task, onClick, onMove, prevStatus, nextStatus }) => {
  const days = task.days_in_status ?? 0;

  return (
    <div className="task-card" onClick={() => onClick(task)}>
      <p className="task-card__title">{task.title}</p>
      <div className="task-card__meta">
        <span className="task-card__assignee">
          {task.assignee_name ?? 'Unassigned'}
        </span>
        <span className={`priority-badge priority-badge--${task.priority.toLowerCase()}`}>
          {task.priority}
        </span>
      </div>
      <div className="task-card__footer">
        <span className="task-card__days">{days}d</span>
        <div className="task-card__move" onClick={e => e.stopPropagation()}>
          {prevStatus && (
            <button
              className="task-card__move-btn"
              title={`Move to ${prevStatus.replace(/_/g, ' ').toLowerCase()}`}
              onClick={() => onMove(task, prevStatus)}
            >
              ←
            </button>
          )}
          {nextStatus && (
            <button
              className="task-card__move-btn"
              title={`Move to ${nextStatus.replace(/_/g, ' ').toLowerCase()}`}
              onClick={() => onMove(task, nextStatus)}
            >
              →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
