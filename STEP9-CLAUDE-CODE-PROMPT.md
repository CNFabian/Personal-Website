# Step 9: AI PM Chat — Conversational Assistant Tab

## Context

The backend is ready:
- `server/services/ai.js` has `pmChat(userMessage, conversationHistory)` which builds full project context (team, tasks, activity, alerts) and calls Claude with conversation history. It auto-saves messages to `pm_chat_history`.
- **New routes just added to `server/routes/pm.js`:**
  - `POST /api/pm/chat` — send `{ message }`, returns `{ success, configured, response }`
  - `GET /api/pm/chat/history` — returns `{ success, messages: [{ id, role, message, created_at }], total }`
  - `DELETE /api/pm/chat/history` — clears conversation, returns `{ success, deleted }`
- `pm_chat_history` table: `id, role ('user'|'assistant'), message, created_at`

The spec nav includes `[💬 Chat]` as a tab. Currently CommandBar has 5 tabs — we're adding a 6th.

## What to Build

### Component: PMChat.tsx

**File:** `src/pages/pm/components/PMChat.tsx`

```tsx
interface Props {
  token: string;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  message: string;
  created_at: string;
}
```

**Layout:**

```
┌──────────────────────────────────────────────────┐
│  AI PM Assistant                    [Clear Chat]  │  ← header
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ 🤖 Hey Chris! I'm your PM assistant. I have │  │  ← welcome message (shown when no history)
│  │ full context on your team, tasks, activity,  │  │
│  │ and alerts. Ask me anything about your       │  │
│  │ project — I can help with status summaries,  │  │
│  │ risk assessment, drafting messages, and more. │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  You: How's the sprint looking?                   │  ← user message (right-aligned)
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ 🤖 Based on the current data...             │  │  ← assistant message (left-aligned)
│  │                                              │  │
│  │ **On Track (3):**                            │  │
│  │ - Sarah: Auth UI (Day 2 of 5)               │  │
│  │ - Jordan: API Endpoints (Day 1)              │  │
│  │ ...                                          │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ● ● ● (typing indicator when waiting)            │
│                                                   │
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  [Send]   │  ← input bar
│  │ Ask about your team, tasks...      │           │
│  └────────────────────────────────────┘           │
└──────────────────────────────────────────────────┘
```

**Behavior:**

1. On mount, fetch `GET /api/pm/chat/history` to load existing conversation
2. If no history, show a welcome message (not from the API — a static local welcome)
3. User types a message and presses Enter or clicks Send
4. User message appears immediately in the chat (optimistic)
5. Show a typing indicator (3 bouncing dots) while waiting for the AI response
6. When response arrives, add it to the messages list and auto-scroll to bottom
7. AI response text should render with basic markdown formatting:
   - **Bold** text (wrap in `<strong>`)
   - Line breaks (preserve `\n` as `<br>`)
   - Bullet points (lines starting with `- ` or `* `)
   - Code snippets (backtick-wrapped text in `<code>`)
   - Don't use a full markdown library — a simple regex-based formatter is fine
8. "Clear Chat" button in the header calls `DELETE /api/pm/chat/history` and resets local state
9. Input is disabled while waiting for a response (prevent double-send)
10. If `configured: false` in the response, show a notice that ANTHROPIC_API_KEY needs to be set
11. Auto-scroll to bottom when new messages arrive (use `scrollIntoView`)
12. Messages list should scroll independently (overflow-y: auto on the messages container)

**Suggested quick prompts (shown when chat is empty, below the welcome message):**

```tsx
const QUICK_PROMPTS = [
  'How is the sprint looking?',
  'Who needs attention today?',
  'Draft a standup summary',
  'What are the biggest risks right now?',
  'Summarize recent activity',
];
```

Render these as clickable pill buttons. Clicking one sends it as a message.

**Simple markdown renderer (inline, no library):**

```tsx
function renderMarkdown(text: string): React.ReactNode {
  // Split into paragraphs by double newline
  return text.split('\n').map((line, i) => {
    // Bold: **text**
    let formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Inline code: `text`
    formatted = formatted.replace(/`(.+?)`/g, '<code>$1</code>');
    // Bullet points
    if (formatted.match(/^[-*]\s/)) {
      formatted = formatted.replace(/^[-*]\s/, '');
      return <li key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
    }
    return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
  });
}
```

**API pattern:**
```typescript
const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;
const headers = { Authorization: `Bearer ${token}` };
```

---

### Integration: CommandBar.tsx

Add 'chat' to the Tab type and TABS array:

1. Update the type:
   ```tsx
   export type Tab = 'command' | 'team' | 'tasks' | 'activity' | 'alerts' | 'chat';
   ```

2. Add to TABS array (between alerts and the end):
   ```tsx
   const TABS: TabDef[] = [
     { id: 'command',  icon: '🎯', label: 'Command'  },
     { id: 'team',     icon: '👥', label: 'Team'     },
     { id: 'tasks',    icon: '📋', label: 'Tasks'    },
     { id: 'activity', icon: '📊', label: 'Activity' },
     { id: 'alerts',   icon: '🚨', label: 'Alerts'   },
     { id: 'chat',     icon: '💬', label: 'Chat'     },
   ];
   ```

### Integration: PMDashboard.tsx

1. Import PMChat:
   ```tsx
   import PMChat from './components/PMChat';
   ```

2. Add to the tab content rendering:
   ```tsx
   {activeTab === 'chat' && <PMChat token={token} />}
   ```

3. Update the keyboard shortcut to support Alt+6:
   ```tsx
   if (e.altKey && e.key >= '1' && e.key <= '6') {
     e.preventDefault();
     const tabs: Tab[] = ['command', 'team', 'tasks', 'activity', 'alerts', 'chat'];
     const idx = parseInt(e.key) - 1;
     if (tabs[idx]) setActiveTab(tabs[idx]);
   }
   ```

---

### SCSS Styles

Add to `src/styles/pages/_pm.scss` (before the reduced-motion section):

```scss
// ── AI Chat ───────────────────────────────────────────────

.pm-chat {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 52px - 3rem); // viewport minus command bar minus content padding
  max-width: 800px;
  margin: 0 auto;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: $space-4;
    border-bottom: 1px solid $pm-border;
    margin-bottom: $space-4;
    flex-shrink: 0;
  }

  &__title {
    font-size: $text-sm;
    font-weight: 700;
    color: $pm-text;
    letter-spacing: 0.02em;
  }

  &__clear-btn {
    background: transparent;
    border: 1px solid $pm-border;
    border-radius: $radius-md;
    color: $pm-text-dim;
    font-size: $text-xs;
    padding: $space-1 $space-3;
    cursor: pointer;
    transition: color 150ms ease, border-color 150ms ease;

    &:hover {
      color: $color-error;
      border-color: $color-error;
    }
  }

  // Messages area
  &__messages {
    flex: 1;
    overflow-y: auto;
    padding-right: $space-2; // scrollbar clearance
    display: flex;
    flex-direction: column;
    gap: $space-4;

    &::-webkit-scrollbar       { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: $pm-border; border-radius: 2px; }
  }

  // Individual message bubble
  &__message {
    max-width: 85%;
    padding: $space-3 $space-4;
    border-radius: $radius-lg;
    font-size: $text-sm;
    line-height: 1.6;

    &--user {
      align-self: flex-end;
      background: oklch(from #{$pm-accent} l c h / 0.12);
      color: $pm-text;
      border-bottom-right-radius: $radius-sm;
    }

    &--assistant {
      align-self: flex-start;
      background: $pm-card;
      border: 1px solid $pm-border;
      color: $pm-text;
      border-bottom-left-radius: $radius-sm;
    }

    // Markdown formatting within messages
    p {
      margin: 0 0 $space-2;
      &:last-child { margin-bottom: 0; }
    }

    strong { color: $pm-text; font-weight: 600; }

    code {
      background: $pm-card-hover;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.9em;
    }

    ul, ol {
      margin: $space-2 0;
      padding-left: $space-5;
    }

    li {
      margin-bottom: $space-1;
      &::marker { color: $pm-text-muted; }
    }
  }

  &__message-time {
    font-size: 10px;
    color: $pm-text-dim;
    margin-top: $space-1;
  }

  // Welcome message
  &__welcome {
    text-align: center;
    padding: $space-6 $space-4;
    color: $pm-text-muted;
    font-size: $text-sm;
    line-height: 1.6;

    &-icon {
      font-size: 2rem;
      display: block;
      margin-bottom: $space-3;
    }

    &-title {
      font-weight: 600;
      color: $pm-text;
      margin-bottom: $space-2;
      font-size: $text-base;
    }
  }

  // Quick prompt pills
  &__prompts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: $space-2;
    margin-top: $space-4;
  }

  &__prompt-pill {
    background: $pm-card;
    border: 1px solid $pm-border;
    border-radius: $radius-full;
    padding: $space-1_5 $space-3;
    font-size: $text-xs;
    color: $pm-text-muted;
    cursor: pointer;
    transition: color 150ms ease, border-color 150ms ease, background 150ms ease;

    &:hover {
      color: $pm-accent;
      border-color: $pm-accent;
      background: oklch(from #{$pm-accent} l c h / 0.06);
    }
  }

  // Typing indicator
  &__typing {
    align-self: flex-start;
    display: flex;
    gap: 4px;
    padding: $space-3 $space-4;
    background: $pm-card;
    border: 1px solid $pm-border;
    border-radius: $radius-lg;
    border-bottom-left-radius: $radius-sm;
  }

  &__typing-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $pm-text-muted;
    animation: chat-typing 1.4s ease-in-out infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }

  // Unconfigured notice
  &__notice {
    text-align: center;
    padding: $space-4;
    background: oklch(from #{$color-warning} l c h / 0.08);
    border: 1px solid oklch(from #{$color-warning} l c h / 0.2);
    border-radius: $radius-md;
    color: $color-warning;
    font-size: $text-xs;
    line-height: 1.5;

    code {
      background: oklch(from #{$color-warning} l c h / 0.12);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 10px;
    }
  }

  // Input bar
  &__input-bar {
    display: flex;
    align-items: flex-end;
    gap: $space-2;
    padding-top: $space-4;
    border-top: 1px solid $pm-border;
    margin-top: $space-4;
    flex-shrink: 0;
  }

  &__input {
    flex: 1;
    padding: $space-2_5 $space-3;
    background: $pm-bg;
    border: 1px solid $pm-border;
    border-radius: $radius-md;
    color: $pm-text;
    font-size: $text-sm;
    font-family: inherit;
    resize: none;
    min-height: 40px;
    max-height: 120px;
    line-height: 1.5;
    outline: none;
    transition: border-color 150ms ease;

    &::placeholder { color: $pm-text-dim; }
    &:focus { border-color: $pm-accent; }
    &:disabled { opacity: 0.5; }
  }

  &__send-btn {
    flex-shrink: 0;
    background: $pm-accent;
    border: none;
    border-radius: $radius-md;
    color: oklch(0.1 0.01 45); // dark text on accent
    font-size: $text-sm;
    font-weight: 600;
    padding: $space-2_5 $space-4;
    cursor: pointer;
    transition: background 150ms ease, opacity 150ms ease;
    height: 40px;
    white-space: nowrap;

    &:hover:not(:disabled) { background: $pm-accent-dim; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
}

@keyframes chat-typing {
  0%, 60%, 100% { transform: translateY(0);    opacity: 0.4; }
  30%           { transform: translateY(-4px); opacity: 1; }
}
```

Also add to the reduced-motion section:
```scss
.pm-chat__typing-dot { animation: none; }
```

---

## Design Rules (CRITICAL)

- NEVER hardcode hex/rgb values — use `$pm-*` tokens and `$color-*` variables
- Class naming: BEM pattern `.pm-chat`, `.pm-chat__message`, etc.
- All styles in `_pm.scss`
- The chat should feel conversational, not form-like. Think iMessage/Slack DM.
- User messages right-aligned with subtle accent tint, assistant messages left-aligned with card background
- The input should be a `<textarea>` (not `<input>`) to support multi-line messages
  - Use `rows={1}` and auto-grow with a max-height
  - Enter sends, Shift+Enter adds a newline
- Keep the message rendering simple — no heavy markdown library. A few regexes for bold/code/bullets is enough.
- Max width 800px centered — chat shouldn't stretch full width on wide monitors

## File Tree After This Step

```
src/pages/pm/
├── PMDashboard.tsx              ← MODIFIED (add PMChat import + tab render + Alt+6)
├── components/
│   ├── PMChat.tsx               ← NEW
│   ├── CommandBar.tsx           ← MODIFIED (add 'chat' to Tab type + TABS array)
│   └── ... (all other components unchanged)
```

## Acceptance Criteria

1. Chat tab appears in CommandBar with 💬 icon
2. PMChat loads conversation history on mount
3. Empty state shows welcome message + quick prompt pills
4. Clicking a quick prompt sends it as a message
5. User messages appear right-aligned with accent tint
6. Assistant messages appear left-aligned with card background
7. Typing indicator (3 bouncing dots) shows while waiting for AI response
8. Auto-scrolls to bottom on new messages
9. Enter sends, Shift+Enter adds newline
10. "Clear Chat" button clears history and resets to welcome state
11. When AI not configured, shows a notice with env var instructions
12. Input is disabled while waiting for response
13. Basic markdown rendering: bold, code, bullet points, line breaks
14. Alt+6 keyboard shortcut works for the chat tab
15. Zero hardcoded colors — everything from OKLCH design system
16. Reduced motion: typing dots animation disabled
