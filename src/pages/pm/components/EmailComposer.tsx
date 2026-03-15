import React, { useState, useEffect, useRef } from 'react';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

interface Props {
  memberId: number;
  memberName: string;
  memberEmail: string;
  token: string;
  onClose: () => void;
  onSent: () => void;
  initialSubject?: string;
  initialBody?: string;
}

const EmailComposer: React.FC<Props> = ({
  memberId, memberName, memberEmail, token, onClose, onSent,
  initialSubject, initialBody,
}) => {
  const [to, setTo]           = useState(memberEmail);
  const [subject, setSubject] = useState(initialSubject ?? '');
  const [body, setBody]       = useState(
    initialBody ?? `Hi ${memberName},\n\n\n\nBest,\nChris`,
  );
  const [loadingAI, setLoadingAI] = useState(false);
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [error, setError]         = useState('');

  const headers = { Authorization: `Bearer ${token}` };
  const subjectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    subjectRef.current?.focus();
  }, []);

  const handleAIDraft = async () => {
    setLoadingAI(true);
    setError('');
    try {
      const res = await fetch(`${PM_API}/ai/suggest-action`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      const emailSuggestion = (data.suggestions ?? []).find(
        (s: { type: string; draft: string; label?: string }) => s.type === 'email',
      );
      if (emailSuggestion?.draft) {
        setBody(emailSuggestion.draft);
        if (emailSuggestion.label) setSubject(emailSuggestion.label);
        subjectRef.current?.focus();
      } else {
        setError('No email suggestion from AI. Try editing manually.');
      }
    } catch {
      setError('AI draft failed. Try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${PM_API}/email/send`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Send failed');
      setSent(true);
      setTimeout(onSent, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="pm-composer">
        <p className="pm-composer__success">✓ Email sent</p>
      </div>
    );
  }

  return (
    <div className="pm-composer">
      <div className="pm-composer__header">
        <span className="pm-composer__title">📧 Email {memberName}</span>
      </div>

      <div className="pm-composer__field">
        <label className="pm-composer__label">To</label>
        <input
          className="pm-composer__input"
          type="email"
          value={to}
          onChange={e => setTo(e.target.value)}
          disabled={sending}
        />
      </div>

      <div className="pm-composer__field">
        <label className="pm-composer__label">Subject</label>
        <input
          ref={subjectRef}
          className="pm-composer__input"
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          disabled={sending || loadingAI}
          placeholder="Enter subject…"
        />
      </div>

      <div className="pm-composer__field">
        <label className="pm-composer__label">Body</label>
        <textarea
          className="pm-composer__textarea"
          value={body}
          onChange={e => setBody(e.target.value)}
          disabled={sending || loadingAI}
          rows={6}
        />
      </div>

      {error && <p className="pm-composer__error">{error}</p>}

      <div className="pm-composer__actions">
        <button
          className="pm-composer__ai-btn"
          onClick={handleAIDraft}
          disabled={sending || loadingAI}
        >
          {loadingAI ? (
            <span className="pm-composer__spinner" />
          ) : '🤖 AI Draft'}
        </button>
        <div className="pm-composer__actions-right">
          <button
            className="pm-composer__cancel-btn"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            className="pm-composer__send-btn"
            onClick={handleSend}
            disabled={sending || loadingAI || !to.trim() || !subject.trim() || !body.trim()}
          >
            {sending ? 'Sending…' : 'Send 📧'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;
