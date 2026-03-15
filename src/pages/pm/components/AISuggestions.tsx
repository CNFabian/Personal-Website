import React, { useState, useEffect } from 'react';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

interface Suggestion {
  type: 'slack' | 'email';
  label: string;
  draft: string;
  reasoning: string;
}

interface Props {
  memberId: number;
  memberName: string;
  token: string;
  onSendSlack: (draft: string) => void;
  onSendEmail: (draft: string, subject?: string) => void;
  onClose: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  slack: '💬',
  email: '📧',
};

const AISuggestions: React.FC<Props> = ({
  memberId, memberName, token, onSendSlack, onSendEmail, onClose,
}) => {
  const [loading, setLoading]         = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [assessment, setAssessment]   = useState('');
  const [error, setError]             = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchSuggestions = () => {
    setLoading(true);
    setError('');
    fetch(`${PM_API}/ai/suggest-action`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) throw new Error(data.error ?? 'AI call failed');
        setSuggestions(data.suggestions ?? []);
        setAssessment(data.overall_assessment ?? '');
      })
      .catch(err => setError(err.message ?? 'Failed to load AI suggestions.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSuggestions(); }, [memberId]);

  // ── Loading ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="pm-ai-suggestions">
        <div className="pm-ai-suggestions__header">
          <span className="pm-ai-suggestions__title">🤖 AI Suggestions for {memberName}</span>
        </div>
        <div className="pm-ai-suggestions__loading">
          {[80, 55, 70, 40].map((w, i) => (
            <div
              key={i}
              className="skeleton skeleton-text"
              style={{ width: `${w}%`, marginBottom: '8px' }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────

  if (error) {
    return (
      <div className="pm-ai-suggestions">
        <div className="pm-ai-suggestions__header">
          <span className="pm-ai-suggestions__title">🤖 AI Suggestions</span>
        </div>
        <p className="pm-ai-suggestions__error">{error}</p>
        <div className="pm-composer__actions">
          <div className="pm-composer__actions-right">
            <button className="pm-composer__cancel-btn" onClick={onClose}>Close</button>
            <button className="pm-composer__send-btn" onClick={fetchSuggestions}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────

  return (
    <div className="pm-ai-suggestions">
      <div className="pm-ai-suggestions__header">
        <span className="pm-ai-suggestions__title">🤖 AI Suggestions for {memberName}</span>
        <button className="pm-detail-panel__close" onClick={onClose} aria-label="Close suggestions">✕</button>
      </div>

      {assessment && (
        <div className="pm-ai-suggestions__assessment">
          {assessment}
        </div>
      )}

      {suggestions.length === 0 ? (
        <p className="pm-detail-panel__empty">No suggestions at this time.</p>
      ) : (
        suggestions.map((s, i) => (
          <div key={i} className="pm-ai-suggestions__card">
            <div className="pm-ai-suggestions__card-header">
              <span className="pm-ai-suggestions__type-icon">
                {TYPE_ICONS[s.type] ?? '📝'}
              </span>
              <span className="pm-ai-suggestions__label">{s.label}</span>
            </div>
            <p className="pm-ai-suggestions__draft">{s.draft}</p>
            {s.reasoning && (
              <p className="pm-ai-suggestions__reasoning">{s.reasoning}</p>
            )}
            <div className="pm-ai-suggestions__card-actions">
              {s.type === 'slack' ? (
                <button
                  className="pm-composer__send-btn pm-composer__send-btn--sm"
                  onClick={() => onSendSlack(s.draft)}
                >
                  Send to Slack
                </button>
              ) : (
                <button
                  className="pm-composer__send-btn pm-composer__send-btn--sm"
                  onClick={() => onSendEmail(s.draft, s.label)}
                >
                  Send Email
                </button>
              )}
              <button
                className="pm-composer__cancel-btn pm-composer__cancel-btn--sm"
                onClick={() => {
                  if (s.type === 'slack') onSendSlack(s.draft);
                  else onSendEmail(s.draft, s.label);
                }}
              >
                Edit first
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AISuggestions;
