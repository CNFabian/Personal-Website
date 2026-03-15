---
name: animations
description: "Animation and micro-interaction skill for dashboard UX. Use when adding hover effects, page transitions, loading states, skeleton screens, toast notifications, drag interactions, progress animations, number counters, or any motion/animation work. Triggers on: animation, transition, hover, loading, skeleton, toast, drag, smooth, polish, micro-interaction, UX, motion, fade, slide."
---

# Animation & Micro-Interaction Skill

## Philosophy

Animations serve function, not decoration. Every animation should either:
1. **Orient** — help the user understand where they are (page transitions)
2. **Feedback** — confirm an action happened (button press, task moved)
3. **Guide** — draw attention to something important (new alert, status change)
4. **Reduce perceived wait** — make loading feel faster (skeletons, spinners)

If an animation doesn't do one of these, remove it.

## Timing Guidelines

```
50ms    — instant feedback (button active state, checkbox toggle)
150ms   — micro-interactions (hover states, badge changes, tooltip appear)
200ms   — small transitions (card expand, dropdown open)
300ms   — medium transitions (modal appear, panel slide, tab switch)
500ms   — large transitions (page enter, full-screen overlay)
1000ms  — loading states cycle (skeleton pulse, spinner rotation)
```

**Easing functions:**
```scss
// Standard — most hover states and small transitions
$ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

// Decelerate — elements entering the screen
$ease-decelerate: cubic-bezier(0, 0, 0.2, 1);

// Accelerate — elements leaving the screen
$ease-accelerate: cubic-bezier(0.4, 0, 1, 1);

// Spring — playful interactions (task moved, achievement unlocked)
$ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

## GSAP Usage

The project already has GSAP installed. Use it for complex sequences. For simple CSS transitions, use plain SCSS.

```typescript
import gsap from 'gsap';

// Page entrance animation
gsap.from('.pm-card', {
  y: 20,
  opacity: 0,
  duration: 0.4,
  stagger: 0.05,
  ease: 'power2.out',
});

// Number counter (great for dashboard stats)
gsap.to(counterRef.current, {
  innerText: targetValue,
  duration: 1.5,
  snap: { innerText: 1 },
  ease: 'power2.out',
});
```

## Loading States

### Skeleton Screens (Preferred over Spinners)

Skeleton screens show the layout shape while content loads. Users perceive faster load times.

```scss
.skeleton {
  background: var(--neutral-800);
  border-radius: 6px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      oklch(from var(--neutral-700) l c h / 0.3) 50%,
      transparent 100%
    );
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
  }
}

@keyframes skeleton-shimmer {
  0%   { left: -100%; }
  100% { left: 100%; }
}

// Usage: skeleton shapes matching actual content
.skeleton-text   { height: 14px; width: 60%; margin-bottom: 8px; }
.skeleton-title  { height: 18px; width: 80%; margin-bottom: 12px; }
.skeleton-avatar { width: 40px; height: 40px; border-radius: 10px; }
.skeleton-badge  { width: 60px; height: 22px; border-radius: 6px; }
.skeleton-card   { height: 120px; border-radius: 12px; }
```

### Spinner (for Actions)

Use spinners only for user-initiated actions (saving, submitting) — not page loads.

```scss
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--neutral-700);
  border-top-color: var(--accent-500);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Hover & Focus States

```scss
// Card hover — subtle lift
.pm-card {
  transition: transform 150ms $ease-standard,
              border-color 150ms $ease-standard,
              box-shadow 150ms $ease-standard;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--neutral-700);
    box-shadow: 0 4px 12px oklch(0 0 0 / 0.2);
  }

  &:active {
    transform: translateY(0);
    transition-duration: 50ms;
  }
}

// Button hover
.pm-btn {
  transition: background 150ms $ease-standard, color 150ms $ease-standard;

  &:hover {
    background: var(--neutral-800);
  }

  &:active {
    background: var(--neutral-750);
    transition-duration: 50ms;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-500);
    outline-offset: 2px;
  }
}

// Interactive row hover (table, list)
.pm-row {
  transition: background 100ms $ease-standard;

  &:hover {
    background: var(--neutral-850);
  }
}
```

## Page & Tab Transitions

```scss
// Tab content fade
.tab-content {
  animation: fadeIn 200ms $ease-decelerate;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

// Modal entrance
.modal-overlay {
  animation: overlayIn 200ms $ease-decelerate;
}

.modal-content {
  animation: modalIn 300ms $ease-spring;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
```

## Toast Notifications

```scss
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--neutral-800);
  border: 1px solid var(--neutral-700);
  color: var(--neutral-100);
  font-size: 14px;
  box-shadow: 0 4px 16px oklch(0 0 0 / 0.3);
  animation: toastIn 300ms $ease-spring, toastOut 200ms $ease-accelerate 3s forwards;
  z-index: 1000;

  &--success { border-left: 3px solid var(--success-500); }
  &--error   { border-left: 3px solid var(--error-500); }
  &--warning { border-left: 3px solid var(--warning-500); }
}

@keyframes toastIn {
  from { opacity: 0; transform: translateY(16px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes toastOut {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(8px); }
}
```

## Kanban Drag Feedback

```scss
// Card being dragged
.kanban-card--dragging {
  opacity: 0.7;
  transform: rotate(2deg) scale(1.02);
  box-shadow: 0 8px 24px oklch(0 0 0 / 0.3);
  z-index: 10;
  transition: none; // disable transitions during drag
}

// Column receiving a drop
.kanban-column--drop-target {
  background: oklch(from var(--accent-500) l c h / 0.05);
  border: 1px dashed var(--accent-600);
  border-radius: 12px;
  transition: all 200ms $ease-standard;
}

// Card just dropped (settle animation)
.kanban-card--just-dropped {
  animation: cardSettle 300ms $ease-spring;
}

@keyframes cardSettle {
  0%   { transform: scale(1.03); }
  60%  { transform: scale(0.98); }
  100% { transform: scale(1); }
}
```

## Status Change Animation

When a task status changes or an alert fires:

```scss
// Pulse on status change
.status-badge--changed {
  animation: statusPulse 600ms $ease-standard;
}

@keyframes statusPulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}

// New alert entrance
.alert-card--new {
  animation: alertSlideIn 400ms $ease-decelerate;
}

@keyframes alertSlideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

## Number Animations (Dashboard Stats)

```typescript
// React hook for animated counters
function useAnimatedNumber(target: number, duration = 1000) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(start + (target - start) * eased);
      setCurrent(value);
      ref.current = value;
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [target, duration]);

  return current;
}
```

## Performance Rules

- Use `transform` and `opacity` for animations (GPU-accelerated, no layout recalc)
- NEVER animate `width`, `height`, `top`, `left`, `margin`, or `padding`
- Use `will-change` sparingly and only on elements that actually animate frequently
- Disable animations if `prefers-reduced-motion` is set:

```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
