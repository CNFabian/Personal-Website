---
name: dashboard-ui
description: "Dashboard UI design skill. Use when building dashboard components, designing data-dense interfaces, creating kanban boards, activity feeds, team overview panels, charts, status indicators, or any PM dashboard UI. Triggers on: dashboard, kanban, card, panel, widget, feed, chart, data visualization, layout, component design, UI, beautiful, clean interface."
---

# Dashboard UI Design Skill

## Design Philosophy

Build interfaces that look like **Linear**, **Vercel**, or **Raycast** — not like Jira.

Core principles:
- **Data density without clutter.** Show lots of information, but give it room to breathe.
- **Dark-first.** This is a tool for focus. Dark backgrounds, subtle borders, luminous accents.
- **Status at a glance.** Color communicates state instantly. No need to read labels to know something is urgent.
- **Typography hierarchy over size.** Use weight (300/500/700) and opacity to create depth, not font size jumps.
- **Motion is subtle.** 150ms ease transitions. No bouncing, no sliding panels. Things appear and change smoothly.
- **Every pixel earns its place.** If an element doesn't help make a decision, remove it.

## OKLCH Design System (MANDATORY)

NEVER use hardcoded hex/rgb values. Always use CSS custom properties from `_design-system.scss`.

### Backgrounds
```scss
--neutral-950    // page background (darkest)
--neutral-900    // card/panel background
--neutral-850    // elevated card or hover state
--neutral-800    // borders, dividers
```

### Text
```scss
--neutral-100    // primary text (headings, important)
--neutral-200    // secondary text (body)
--neutral-300    // tertiary text (labels, timestamps)
--neutral-400    // muted text (placeholders, disabled)
--neutral-500    // very muted (helper text)
```

### Semantic Colors
```scss
// Success (green) — done, active, healthy
--success-400    // text on dark bg
--success-500    // badges, dots
--success-600    // borders, accents
--success-900    // subtle background tint

// Warning (orange/yellow) — attention needed, medium risk
--warning-400    // text
--warning-500    // badges
--warning-600    // borders
--warning-900    // background tint

// Error (red) — critical, overdue, blocked
--error-400      // text
--error-500      // badges
--error-600      // borders
--error-900      // background tint

// Info (blue) — neutral info, in-review, links
--info-400       // text
--info-500       // badges
--info-600       // borders
--info-900       // background tint

// Accent (orange/gold) — primary action, in-progress, highlights
--accent-400     // text
--accent-500     // badges, buttons
--accent-600     // borders
--accent-900     // background tint
```

## Component Patterns

### Cards
```scss
.card {
  background: var(--neutral-900);
  border: 1px solid var(--neutral-800);
  border-radius: 12px;
  padding: 16px;
  transition: border-color 150ms ease, background 150ms ease;

  &:hover {
    border-color: var(--neutral-700);
    background: var(--neutral-850);
  }
}
```

### Status Badges
```scss
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;

  // Status dot before text
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  &--backlog {
    background: oklch(from var(--neutral-700) l c h / 0.3);
    color: var(--neutral-300);
    &::before { background: var(--neutral-500); }
  }

  &--in-progress {
    background: oklch(from var(--accent-500) l c h / 0.15);
    color: var(--accent-400);
    &::before { background: var(--accent-500); }
  }

  &--in-review {
    background: oklch(from var(--info-500) l c h / 0.15);
    color: var(--info-400);
    &::before { background: var(--info-500); }
  }

  &--done {
    background: oklch(from var(--success-500) l c h / 0.15);
    color: var(--success-400);
    &::before { background: var(--success-500); }
  }
}
```

### Priority Indicators
```scss
.priority {
  &--low      { color: var(--neutral-400); }
  &--medium   { color: var(--accent-400); }
  &--high     { color: var(--warning-400); }
  &--critical { color: var(--error-400); font-weight: 700; }
}
```

### Tab Navigation
```scss
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--neutral-800);
  margin-bottom: 24px;
}

.tab {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--neutral-400);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 150ms ease, border-color 150ms ease;

  &:hover { color: var(--neutral-200); }

  &--active {
    color: var(--neutral-100);
    border-bottom-color: var(--accent-500);
  }
}
```

### Kanban Board
```scss
.kanban {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  min-height: 500px;
}

.kanban-column {
  background: var(--neutral-950);
  border-radius: 12px;
  padding: 12px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 4px;
    margin-bottom: 12px;

    h3 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--neutral-400);
    }

    .count {
      font-size: 12px;
      color: var(--neutral-500);
      background: var(--neutral-800);
      padding: 2px 8px;
      border-radius: 10px;
    }
  }
}

.kanban-card {
  background: var(--neutral-900);
  border: 1px solid var(--neutral-800);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color 150ms ease, transform 100ms ease;

  &:hover {
    border-color: var(--neutral-700);
    transform: translateY(-1px);
  }

  &__title {
    font-size: 14px;
    font-weight: 500;
    color: var(--neutral-100);
    margin-bottom: 8px;
    line-height: 1.3;
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--neutral-400);
  }
}
```

### Activity Feed
```scss
.activity-feed {
  &__item {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--neutral-800);

    &:last-child { border-bottom: none; }
  }

  &__icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 14px;

    // Color by source
    &--github  { background: var(--neutral-800); color: var(--neutral-200); }
    &--slack   { background: oklch(from var(--accent-500) l c h / 0.15); color: var(--accent-400); }
    &--gmail   { background: oklch(from var(--error-500) l c h / 0.15); color: var(--error-400); }
    &--manual  { background: oklch(from var(--info-500) l c h / 0.15); color: var(--info-400); }
  }

  &__content {
    flex: 1;
    min-width: 0; // prevent overflow
  }

  &__summary {
    font-size: 14px;
    color: var(--neutral-200);
    line-height: 1.4;
  }

  &__timestamp {
    font-size: 12px;
    color: var(--neutral-500);
    margin-top: 2px;
  }
}
```

### Alert Cards
```scss
.alert-card {
  padding: 14px 16px;
  border-radius: 10px;
  border-left: 3px solid;
  margin-bottom: 8px;
  background: var(--neutral-900);

  &--low      { border-left-color: var(--info-500); }
  &--medium   { border-left-color: var(--warning-500); }
  &--high     { border-left-color: var(--error-500); }
  &--critical {
    border-left-color: var(--error-500);
    background: var(--error-900);
  }

  &__message {
    font-size: 14px;
    color: var(--neutral-100);
    font-weight: 500;
    margin-bottom: 6px;
  }

  &__action {
    font-size: 13px;
    color: var(--neutral-300);
    font-style: italic;
  }

  &__ack-btn {
    margin-top: 10px;
    padding: 4px 12px;
    font-size: 12px;
    border-radius: 6px;
    border: 1px solid var(--neutral-700);
    background: transparent;
    color: var(--neutral-300);
    cursor: pointer;
    transition: all 150ms ease;

    &:hover {
      background: var(--neutral-800);
      color: var(--neutral-100);
    }
  }
}
```

### Team Member Cards
```scss
.member-card {
  background: var(--neutral-900);
  border: 1px solid var(--neutral-800);
  border-radius: 12px;
  padding: 16px;
  transition: border-color 150ms ease;

  &:hover { border-color: var(--neutral-700); }

  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__avatar {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--accent-900);
    color: var(--accent-400);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
  }

  &__name {
    font-size: 15px;
    font-weight: 600;
    color: var(--neutral-100);
  }

  &__role {
    font-size: 12px;
    color: var(--neutral-400);
  }

  &__current-task {
    font-size: 13px;
    color: var(--neutral-300);
    padding: 8px;
    background: var(--neutral-850);
    border-radius: 8px;
    margin-bottom: 10px;
  }

  // Days-on-task indicator
  &__days {
    font-size: 12px;
    font-weight: 500;

    &--ok      { color: var(--success-400); } // < 3 days
    &--warning { color: var(--warning-400); } // 3-5 days
    &--danger  { color: var(--error-400); }   // > 5 days
  }
}
```

## Layout Patterns

### Dashboard Page
```scss
.pm-dashboard {
  min-height: 100vh;
  background: var(--neutral-950);
  color: var(--neutral-100);
  font-family: 'Onest', -apple-system, BlinkMacSystemFont, sans-serif;
}

.pm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--neutral-800);
}

.pm-content {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}
```

### Grid Layouts
```scss
// Team overview: responsive grid
.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

// Two-column layout (main + sidebar)
.split-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
}
```

## Empty States

Always design empty states. They're the first thing Chris sees.

```scss
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--neutral-400);

  &__icon {
    font-size: 32px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  &__message {
    font-size: 15px;
    margin-bottom: 16px;
  }

  &__action {
    // Style as a ghost button
    padding: 8px 16px;
    border: 1px solid var(--neutral-700);
    border-radius: 8px;
    color: var(--neutral-200);
    background: transparent;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover {
      background: var(--neutral-800);
      border-color: var(--neutral-600);
    }
  }
}
```

## Responsive Breakpoints

Desktop-first, but support laptop screens:
```scss
$bp-wide: 1400px;    // full dashboard
$bp-desktop: 1200px; // kanban gets tighter
$bp-laptop: 1024px;  // stack some columns
$bp-tablet: 768px;   // single column
```

## Accessibility Minimums

Even for a personal tool:
- All interactive elements have focus styles (outline or ring)
- Color is not the only indicator (always pair with icon, text, or shape)
- Buttons have hover and active states
- Modals trap focus and close on Escape
- Minimum touch target: 32px
