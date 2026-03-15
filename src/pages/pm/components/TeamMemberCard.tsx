import React from 'react';
import StatusBadge from './StatusBadge';

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  email?: string;
  github_handle?: string;
  slack_id?: string;
  avatar_url?: string;
  capacity_hours?: number;
  is_active?: number;
  // Enriched client-side
  current_task?: string;
  current_task_status?: string;
  days_on_task?: number;
}

interface Props {
  member: TeamMember;
}

function daysColor(days: number): 'green' | 'yellow' | 'red' {
  if (days < 3) return 'green';
  if (days <= 5) return 'yellow';
  return 'red';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const TeamMemberCard: React.FC<Props> = ({ member }) => {
  const days = member.days_on_task ?? 0;

  return (
    <div className="team-card">
      <div className="team-card__header">
        <div className="team-card__avatar">
          {member.avatar_url
            ? <img src={member.avatar_url} alt={member.name} />
            : getInitials(member.name)
          }
        </div>
        <div className="team-card__meta">
          <div className="team-card__name-row">
            <h3 className="team-card__name">{member.name}</h3>
            <span
              className={`team-card__status-dot team-card__status-dot--${member.is_active ? 'active' : 'inactive'}`}
            />
          </div>
          <p className="team-card__role">{member.role}</p>
          {member.github_handle && (
            <p className="team-card__github">@{member.github_handle}</p>
          )}
        </div>
      </div>

      <div className="team-card__task">
        {member.current_task ? (
          <>
            <p className="team-card__task-name" title={member.current_task}>
              {member.current_task}
            </p>
            <span className={`team-card__days team-card__days--${daysColor(days)}`}>
              {days}d
            </span>
          </>
        ) : (
          <p className="team-card__no-task">No active task</p>
        )}
      </div>

      {member.current_task_status && (
        <StatusBadge status={member.current_task_status} size="sm" />
      )}
    </div>
  );
};

export default TeamMemberCard;
