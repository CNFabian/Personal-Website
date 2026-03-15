import React from 'react';

export interface Quest {
  id: number;
  date: string;
  quest_type: string;
  title: string;
  description: string | null;
  source_id: string | null;
  is_completed: number;  // 0 | 1
  completed_at: string | null;
  created_at: string;
}

interface Props {
  quest: Quest;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

const TYPE_LABELS: Record<string, string> = {
  ai_priority:     'AI',
  drive_checklist: 'Drive',
  manual:          'Manual',
};

const QuestItem: React.FC<Props> = ({ quest, onToggle, onDelete }) => {
  const done = quest.is_completed === 1;

  return (
    <div className={`pm-quest${done ? ' pm-quest--done' : ''}`}>
      <button
        className={`pm-quest__check${done ? ' pm-quest__check--done' : ''}`}
        onClick={() => onToggle(quest.id)}
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
        aria-pressed={done}
      >
        {done && <span className="pm-quest__check-mark">✓</span>}
      </button>

      <div className="pm-quest__content">
        <div className="pm-quest__title-row">
          <span className={`pm-quest__title${done ? ' pm-quest__title--done' : ''}`}>
            {quest.title}
          </span>
          <span className={`pm-quest__badge pm-quest__badge--${quest.quest_type}`}>
            {TYPE_LABELS[quest.quest_type] ?? quest.quest_type}
          </span>
        </div>
        {quest.description && (
          <p className="pm-quest__desc">{quest.description}</p>
        )}
      </div>

      <button
        className="pm-quest__delete"
        onClick={e => { e.stopPropagation(); onDelete(quest.id); }}
        aria-label="Delete quest"
      >
        ✕
      </button>
    </div>
  );
};

export default QuestItem;
