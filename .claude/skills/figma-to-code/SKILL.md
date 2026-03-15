---
name: figma
description: "Figma-to-code skill. Use when the user shares a Figma design, screenshot, or reference and wants it translated into React components with SCSS. Also use when discussing design decisions, layout structure, or visual patterns from Figma files. Triggers on: Figma, design, mockup, screenshot, layout, wireframe, design system, pixel-perfect, match the design."
---

# Figma-to-Code Skill

## Process

When Chris shares a Figma design (screenshot, link, or description):

### Step 1: Analyze the Design
- Identify all components (cards, buttons, badges, inputs, modals)
- Note the layout structure (grid, flex, positioning)
- Extract the spacing pattern (is it 4px, 8px, 12px, 16px scale?)
- Identify typography hierarchy (sizes, weights, colors)
- Note any hover states, animations, or transitions shown

### Step 2: Map to Design System
- **NEVER eyeball colors.** Map every color to the closest OKLCH variable from `_design-system.scss`
- If Figma shows #1a1a1a → use `var(--neutral-950)`
- If Figma shows #2a2a2a → use `var(--neutral-900)`
- If Figma shows a green dot → use `var(--success-500)`
- If the exact shade isn't in the system, use the closest match. Do NOT add new variables.

### Step 3: Build Components
- One component per file
- SCSS in `_pm.scss`, not inline styles
- Use semantic HTML (section, article, nav, button — not div soup)
- Follow BEM naming: `.block__element--modifier`

### Step 4: Verify
- Compare your output to the design at each breakpoint
- Check spacing matches (within 2px tolerance)
- Verify hover states work as designed
- Confirm text truncation behavior on long content

## Spacing Scale

Use this consistent scale (matches common Figma auto-layout values):
```
4px   — tiny gaps (between icon and text)
8px   — small gaps (between badge items)
12px  — medium gaps (between cards in a tight list)
16px  — standard gaps (between sections, card padding)
20px  — comfortable spacing
24px  — section padding, page margins
32px  — large section separators
48px  — hero/empty state vertical padding
```

## Typography Mapping

```
32px / 700  — Page title (rare, only main dashboard header)
20px / 600  — Section title
16px / 500  — Card title, important labels
14px / 500  — Body text, descriptions, metadata
13px / 400  — Secondary text, timestamps
12px / 500  — Badges, small labels, counts
11px / 400  — Micro text (use sparingly)
```

Font family: Always use `'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

## Border Radius Scale
```
4px   — small elements (badges, tags)
6px   — buttons, inputs
8px   — small cards, kanban cards
10px  — alert cards
12px  — main cards, panels
16px  — modal dialogs
```

## Common Figma-to-CSS Translations

| Figma Property | CSS Property |
|---------------|-------------|
| Auto layout horizontal | `display: flex; flex-direction: row;` |
| Auto layout vertical | `display: flex; flex-direction: column;` |
| Space between | `justify-content: space-between;` |
| Fill container | `flex: 1;` or `width: 100%;` |
| Hug contents | `width: fit-content;` |
| Absolute position | `position: absolute;` with top/left/right/bottom |
| Drop shadow | `box-shadow:` (map to subtle dark values) |
| Blur | `backdrop-filter: blur(Xpx);` |
| Corner radius | `border-radius:` (use scale above) |

## Shadow Patterns (for Figma elevations)

```scss
// Subtle card shadow (use sparingly on dark themes)
box-shadow: 0 1px 2px oklch(0 0 0 / 0.3);

// Elevated panel (modals, dropdowns)
box-shadow: 0 4px 16px oklch(0 0 0 / 0.4), 0 1px 4px oklch(0 0 0 / 0.2);

// On dark themes, elevation is better shown with:
// - Lighter background (neutral-850 vs neutral-900)
// - Visible border (neutral-700)
// - NOT shadows (they're hard to see on dark backgrounds)
```

## When No Figma Design Exists

If Chris asks to build something without providing a Figma file, use the dashboard-ui skill's component patterns and design philosophy. Reference Linear, Vercel, or Raycast for visual inspiration. Build something clean that could have come from those products.
