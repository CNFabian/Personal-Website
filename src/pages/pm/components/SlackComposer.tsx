import React, { useState, useEffect, useRef } from 'react';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

interface Channel {
  id: string;
  name: string;
}

interface Props {
  memberId: number;
  memberName: string;
  token: string;
  onClose: () => void;
  onSent: () => void;
  initialText?: string;
}

const SlackComposer: React.FC<Props> = ({
  memberId, memberName, token, onClose, onSent, initialText,
}) => {
  const [channels, setChannels]           = useState<Channel[]>([]);
  const [selectedChannel, setChannel]     = useState('');
  const [text, setText]                   = useState(initialText ?? `Hey ${memberName}, `);
  const [loadingChannels, setLoadingChan] = useState(true);
  const [loadingAI, setLoadingAI]         = useState(false);
  const [sending, setSending]             = useState(false);
  const [sent, setSent]                   = useState(false);
  const [error, setError]                 = useState('');

  const headers = { Authorization: `Bearer ${token}` };
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`${PM_API}/slack/channels`, { headers })
      .then(r => r.json())
      .then(data => {
        const list: Channel[] = data.channels ?? [];
        setChannels(list);
        if (list.length > 0) setChannel(list[0].id);
      })
      .catch(() => setError('Could not load channels.'))
      .finally(() => setLoadingChan(false));
  }, []);

  // Focus textarea on mount
  useEffect(() => {
    if (!loadingChannels) textareaRef.current?.focus();
  }, [loadingChannels]);

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
      const slackSuggestion = (data.suggestions ?? []).find(
        (s: { type: string; draft: string }) => s.type === 'slack',
      );
      if (slackSuggestion?.draft) {
        setText(slackSuggestion.draft);
        textareaRef.current?.focus();
      } else {
        setError('No Slack suggestion from AI. Try editing manually.');
      }
    } catch {
      setError('AI draft failed. Try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSend = async () => {
    if (!selectedChannel || !text.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${PM_API}/slack/send`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: selectedChannel, text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Send failed');
      setSent(true);
      setTimeout(onSent, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="pm-composer">
        <p className="pm-composer__success">✓ Sent to Slack</p>
      </div>
    );
  }

  return (
    <div className="pm-composer">
      <div className="pm-composer__header">
        <span className="pm-composer__title">💬 Message {memberName}</span>
      </div>

      {loadingChannels ? (
        <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: '8px' }} />
      ) : (
        <div className="pm-composer__field">
          <label className="pm-composer__label">Channel</label>
          <select
            className="pm-composer__select"
            value={selectedChannel}
            onChange={e => setChannel(e.target.value)}
            disabled={sending}
          >
            {channels.length === 0 && (
              <option value="">No channels available</option>
            )}
            {channels.map(ch => (
              <option key={ch.id} value={ch.id}>#{ch.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="pm-composer__field">
        <label className="pm-composer__label">Message</label>
        <textarea
          ref={textareaRef}
          className="pm-composer__textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={sending || loadingAI}
          rows={4}
          placeholder="Write your message…"
        />
      </div>

      {error && <p className="pm-composer__error">{error}</p>}

      <div className="pm-composer__actions">
        <button
          className="pm-composer__ai-btn"
          onClick={handleAIDraft}
          disabled={sending || loadingAI || loadingChannels}
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
            disabled={sending || loadingAI || !selectedChannel || !text.trim()}
          >
            {sending ? 'Sending…' : 'Send 💬'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlackComposer;
