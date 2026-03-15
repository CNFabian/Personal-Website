import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const LABELS: Record<string, string> = {
  BACKLOG:     'Backlog',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW:   'In Review',
  DONE:        'Done',
  PLANNING:    'Planning',
  ACTIVE:      'Active',
  COMPLETED:   'Completed',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const cls = status.toLowerCase().replace(/_/g, '-');
  return (
    <span className={`status-badge status-badge--${cls} status-badge--${size}`}>
      {LABELS[status] ?? status}
    </span>
  );
};

export default StatusBadge;
