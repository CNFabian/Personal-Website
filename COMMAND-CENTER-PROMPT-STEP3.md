# Claude Code Prompt — Build Quick Actions: SlackComposer, EmailComposer, AISuggestions (Step 3 of 8)

Paste this into Claude Code.

---

## Prompt

Read `PM-GAME-VIEW-SPEC.md` and `CLAUDE.md` first. Then build the **Quick Actions** system — three components that open from the MemberDetailPanel when clicking the Slack, Email, or AI Suggest buttons. This is step 3 of the build order.

### Backend endpoints already exist

These routes are already implemented in `server/routes/pm.js` — you do NOT need to modify backend code:

```
GET  /api/pm/slack/channels       → { success, channels: [{ id, name }] }
POST /api/pm/slack/send           → body: { channel, text }  → { success, ts, channel }
POST /api/pm/email/send           → body: { to, subject, body } → { success, messageId }
POST /api/pm/ai/suggest-action    → body: { memberId } → { success, suggestions: [{ type, label, draft, reasoning }], overall_assessment }
```

### What to build

**1. `src/pages/pm/components/SlackComposer.tsx`**

An inline composer that appears inside the MemberDetailPanel when the user clicks "💬 Slack".

Props:
```ts
interface Props {
  memberName: string;
  token: string;
  onClose: () => void;
  onSent: () => void;  // callback after successful send
}
```

Behavior:
- On mount, fetch channel list from `GET /api/pm/slack/channels`
- Show a **channel dropdown** (default to first channel, or let user pick)
- **Textarea** for the message body, pre-filled with a friendly check-in: `"Hey {memberName}, "`
- **AI Draft button** — calls `POST /api/pm/ai/suggest-action` with the member's ID... actually, simpler: just prepend a note "(AI drafts come in a future update)" for now. Wire it as a disabled button with tooltip.
  - Actually, we CAN wire it: when clicked, call the AI suggest endpoint, then take the first suggestion with type "slack" and populate the textarea with its draft text.
  - Show a small loading spinner while the AI is generating.
- **Send button** — calls `POST /api/pm/slack/send` with selected channel and text
- Show success toast or inline "Sent ✓" confirmation, then call `onSent()`
- Show error message inline if send fails
- **Cancel button** returns to the quick actions view

**2. `src/pages/pm/components/EmailComposer.tsx`**

Similar to SlackComposer but for email.

Props:
```ts
interface Props {
  memberName: string;
  memberEmail: string;
  token: string;
  onClose: () => void;
  onSent: () => void;
}
```

Behavior:
- **To field** — pre-filled with `memberEmail`, editable
- **Subject field** — empty, user fills in
- **Body textarea** — pre-filled with `"Hi {memberName},\n\n\n\nBest,\nChris"`
- **AI Draft button** — same pattern as SlackComposer: calls suggest-action, takes the first "email" type suggestion, populates subject + body
- **Send button** — calls `POST /api/pm/email/send` with to, subject, body
- Success/error handling same as SlackComposer
- **Cancel button** returns to quick actions view

**3. `src/pages/pm/components/AISuggestions.tsx`**

A panel that shows AI-generated suggestions for interacting with a team member.

Props:
```ts
interface Props {
  memberId: number;
  memberName: string;
  token: string;
  onSendSlack: (draft: string) => void;   // opens SlackComposer with this text
  onSendEmail: (draft: string) => void;   // opens EmailComposer with this text
  onClose: () => void;
}
```

Behavior:
- On mount, calls `POST /api/pm/ai/suggest-action` with `{ memberId }`
- Shows a **loading state** with a pulsing skeleton (3-4 lines) while AI processes
- Once loaded, displays:
  - **Overall assessment** at the top (1-2 sentences, styled like an info callout)
  - Each suggestion as a **card** showing:
    - Icon: 💬 for slack, 📧 for email
    - Label (e.g. "Check-in message")
    - Draft text in a quoted/muted style
    - Reasoning in small muted text below
    - Two buttons: `[Send to Slack]` or `[Send Email]` (based on type) and `[Edit first]`
  - `[Send to Slack]` calls `onSendSlack(draft)` which should open SlackComposer pre-filled
  - `[Send Email]` calls `onSendEmail(draft)` which should open EmailComposer pre-filled
  - `[Edit first]` does the same thing (opens the composer so the user can edit before sending)
- If the AI call fails, show an error message with a "Retry" button

**4. Update `src/pages/pm/components/MemberDetailPanel.tsx`**

Replace the three console.log quick-action buttons with real state-driven interaction:

- Add state: `quickAction: 'none' | 'slack' | 'email' | 'ai'` (default: `'none'`)
- When `quickAction === 'none'`, show the three action buttons (current behavior)
- When `quickAction === 'slack'`, render `<SlackComposer>` in place of the buttons
- When `quickAction === 'email'`, render `<EmailComposer>` in place of the buttons
- When `quickAction === 'ai'`, render `<AISuggestions>` in place of the buttons
- AISuggestions' `onSendSlack` should: set a `slackDraft` state, switch to `quickAction = 'slack'`, and pass that draft as initial text to SlackComposer
- AISuggestions' `onSendEmail` should: set an `emailDraft` state, switch to `quickAction = 'email'`, and pass that draft as initial body to EmailComposer
- Each composer's `onClose` sets `quickAction` back to `'none'`
- Each composer's `onSent` sets `quickAction` back to `'none'` (optionally show a brief success indicator)

Also pass `memberId` to AISuggestions — you can get it from the `memberId` prop already on MemberDetailPanel.

**5. Add all styles to `src/styles/pages/_pm.scss`**

Add under the existing `// COMMAND CENTER` comment block. Key new classes:

```
Composer container (.pm-composer):
- Background: $pm-bg (deeper dark)
- Border: 1px solid $pm-border
- Border-radius: $radius-lg
- Padding: $space-4

Input/select fields (.pm-composer__input, .pm-composer__select):
- Same styling as .pm-login__input — dark bg, border, rounded
- Focus: $pm-accent border

Textarea (.pm-composer__textarea):
- Min-height: 100px, resize: vertical
- Same styling as inputs

Composer buttons row (.pm-composer__actions):
- Display flex, gap $space-2, justify-content flex-end
- Send button: $pm-accent background, dark text, bold
- Cancel button: transparent, $pm-text-muted color
- AI Draft button: outlined style, $color-info border

AI Suggestions panel (.pm-ai-suggestions):
- Same container style as composer

Overall assessment (.pm-ai-suggestions__assessment):
- Background: oklch from $color-info at 0.1 opacity
- Border-left: 3px solid $color-info
- Padding: $space-3
- Border-radius: $radius-md

Suggestion card (.pm-ai-suggestions__card):
- Background: $pm-card-hover
- Border: 1px solid $pm-border-subtle
- Border-radius: $radius-md
- Padding: $space-3
- Margin-bottom: $space-2

Draft text (.pm-ai-suggestions__draft):
- Font-style: italic, $pm-text-muted color
- Border-left: 2px solid $pm-border
- Padding-left: $space-3

Reasoning text (.pm-ai-suggestions__reasoning):
- Font-size: $text-xs, $pm-text-dim color

Sent confirmation (.pm-composer__success):
- Color: $color-success, font-weight 600
- Brief fade-in animation
```

### Important constraints

- Do NOT modify any backend files — the routes are already done
- Do NOT add npm packages
- Use the same API URL pattern: `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`
- Use the same auth header pattern: `{ Authorization: \`Bearer ${token}\` }`
- BEM class naming: `.pm-composer`, `.pm-composer__textarea`, `.pm-ai-suggestions__card`, etc.
- All styles use OKLCH design system variables from `_pm.scss` — never hardcode colors
- Keep the composers compact — they render inside the detail panel's scrollable body area
- Each composer should be self-contained (own loading/error states)
- Conservative: sending requires explicit button click. No auto-send, no auto-dismiss.
