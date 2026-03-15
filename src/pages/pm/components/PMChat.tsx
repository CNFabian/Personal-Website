import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './Toast';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  message: string;
  created_at: string;
}

interface Props {
  token: string;
}

const QUICK_PROMPTS = [
  'Who is currently blocked?',
  'Summarize today\'s activity',
  'What tasks are overdue?',
  'Draft a standup update',
  'Any alerts I should know about?',
];

// Simple markdown → HTML: bold, inline code, bullets
function renderMarkdown(text: string): string {
  return text
    // Code blocks (``` ... ```)
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Bullet lines starting with - or *
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> blocks in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Line breaks
    .replace(/\n/g, '<br/>');
}

let _nextOptimisticId = -1;
function nextOptimisticId() { return _nextOptimisticId--; }

const PMChat: React.FC<Props> = ({ token }) => {
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  const headers = { Authorization: `Bearer ${token}` };

  // ── Fetch history ──────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const res  = await fetch(`${PM_API}/chat/history`, { headers });
      const data = await res.json();
      if (data.success) setMessages(data.messages ?? []);
    } catch {
      // silent — empty state will show
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Auto-scroll on new messages ───────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // ── Textarea auto-grow ────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  // ── Send message ──────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const optimisticId = nextOptimisticId();
    const optimistic: ChatMessage = {
      id: optimisticId,
      role: 'user',
      message: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);
    setInput('');
    setSending(true);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res  = await fetch(`${PM_API}/chat`, {
        method:  'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();

      if (!data.configured) {
        setUnconfigured(true);
        // Remove optimistic message
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        return;
      }

      if (data.success) {
        // Replace optimistic + append assistant reply via fresh history
        await fetchHistory();
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        showToast('Failed to get response', 'error');
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      showToast('Connection error', 'error');
    } finally {
      setSending(false);
    }
  }, [sending, token, fetchHistory, showToast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Clear chat ────────────────────────────────────────────
  const clearChat = async () => {
    try {
      await fetch(`${PM_API}/chat/history`, { method: 'DELETE', headers });
      setMessages([]);
      showToast('Chat cleared');
    } catch {
      showToast('Failed to clear chat', 'error');
    }
  };

  // ── Render ────────────────────────────────────────────────
  const isEmpty = !loading && messages.length === 0 && !unconfigured;

  return (
    <div className="pm-chat">
      {/* Header */}
      <div className="pm-section-header">
        <h2 className="pm-section-title">AI Assistant</h2>
        {messages.length > 0 && (
          <button className="pm-btn pm-btn--ghost" onClick={clearChat}>
            Clear Chat
          </button>
        )}
      </div>

      {/* Unconfigured notice */}
      {unconfigured && (
        <div className="pm-chat__notice">
          <span className="pm-chat__notice-icon">⚠️</span>
          <div>
            <p className="pm-chat__notice-title">AI not configured</p>
            <p className="pm-chat__notice-body">
              Set <code>ANTHROPIC_API_KEY</code> in your server environment to enable the AI assistant.
            </p>
          </div>
        </div>
      )}

      {/* Message list */}
      <div className="pm-chat__messages">
        {loading && (
          <div className="pm-chat__loading">
            <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            <div className="skeleton skeleton-text" style={{ width: '45%' }} />
          </div>
        )}

        {isEmpty && (
          <div className="pm-chat__welcome">
            <span className="pm-chat__welcome-icon">🤖</span>
            <p className="pm-chat__welcome-title">PM Assistant</p>
            <p className="pm-chat__welcome-body">
              Ask me about your team, tasks, or blockers. I have context from your dashboard.
            </p>
            <div className="pm-chat__quick-prompts">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  className="pm-chat__quick-pill"
                  onClick={() => sendMessage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`pm-chat__message pm-chat__message--${msg.role}`}
          >
            <span className="pm-chat__message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </span>
            <div className="pm-chat__message-bubble">
              {msg.role === 'assistant' ? (
                <div
                  className="pm-chat__message-text pm-chat__message-text--md"
                  // eslint-disable-line
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.message) }}
                />
              ) : (
                <p className="pm-chat__message-text">{msg.message}</p>
              )}
              <time className="pm-chat__message-time">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="pm-chat__message pm-chat__message--assistant">
            <span className="pm-chat__message-avatar">🤖</span>
            <div className="pm-chat__message-bubble pm-chat__message-bubble--typing">
              <span className="pm-chat__typing-dot" />
              <span className="pm-chat__typing-dot" />
              <span className="pm-chat__typing-dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="pm-chat__input-row">
        <textarea
          ref={textareaRef}
          className="pm-chat__input"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your team, tasks, or blockers… (Enter to send)"
          rows={1}
          disabled={sending || unconfigured}
        />
        <button
          className="pm-chat__send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || sending || unconfigured}
          aria-label="Send message"
        >
          ↑
        </button>
      </div>

      {!isEmpty && messages.length > 0 && (
        <div className="pm-chat__quick-prompts pm-chat__quick-prompts--bottom">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              className="pm-chat__quick-pill"
              onClick={() => sendMessage(p)}
              disabled={sending}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PMChat;
