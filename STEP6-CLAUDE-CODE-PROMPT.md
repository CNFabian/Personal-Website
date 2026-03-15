# Step 6: StreakTracker + Confetti — Gamification Polish

## Context

No backend changes needed. The streak API already exists:
- `GET /api/pm/quests/streak` → `{ success, streak: { current_streak, longest_streak, last_completed_date, total_quests_completed } }`
- Streak updates happen automatically when quests are toggled via `PATCH /api/pm/quests/:id/toggle`

The DailyQuestsPanel already shows `🔥 {streak.current_streak}` in the collapsed bar and tracks an `allDone` boolean. We're replacing the plain emoji with an animated StreakTracker widget and adding a Confetti celebration when `allDone` flips to true.

## What to Build

Two new components + integration into DailyQuestsPanel + SCSS.

---

### Component 1: StreakTracker.tsx

**File:** `src/pages/pm/components/StreakTracker.tsx`

```tsx
interface Props {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
}
```

**Behavior:**
1. Shows a fire icon (🔥) with the current streak count
2. When `currentStreak > 0`, the fire has a subtle pulsing glow animation (warm orange/amber glow using `$color-warning`)
3. When `currentStreak === 0`, the fire is dimmed (gray, no animation)
4. On hover, shows a small tooltip-style popup with:
   - "Current: X days"
   - "Best: Y days"
   - "Total quests: Z"
5. When the streak number changes (increases), play a brief scale-up "pop" animation on the number (scale 1 → 1.3 → 1, 300ms)
6. The component should be compact — designed to sit inline in the quests bar

**Implementation notes:**
- Use `useRef` to track the previous streak value and detect increases for the pop animation
- The tooltip popup should use `position: absolute` relative to the tracker, appear above it
- Show/hide tooltip on hover with a 150ms transition (opacity + translateY)
- Keep it accessible: use `aria-label` on the container with the full streak info

---

### Component 2: Confetti.tsx

**File:** `src/pages/pm/components/Confetti.tsx`

```tsx
interface Props {
  active: boolean;    // when true, fire confetti
  onComplete?: () => void;  // callback when animation finishes
}
```

**Behavior:**
1. When `active` becomes true, spawn a burst of confetti particles
2. Confetti uses CSS-only animation — NO external libraries
3. Particles: ~30-40 small rectangles/squares in various colors from the design system:
   - `$color-success` (green)
   - `$color-warning` (amber)
   - `$color-accent-400` (vibrant orange)
   - `$color-accent-300` (medium orange)
   - `$pm-text` (light, for contrast)
4. Animation: particles start from center-top of the component, burst outward in random directions, fall with gravity + gentle sway, fade out. Total duration: ~2 seconds
5. After animation completes, call `onComplete?.()` and clean up (remove particles from DOM)
6. When `active` is false, render nothing
7. The component should overlay on top of existing content (position: fixed or absolute with high z-index)

**Implementation approach:**
- Generate particles in a `useEffect` when `active` flips to true
- Each particle is a small `<div>` with randomized:
  - Starting position (centered horizontally, slight random spread)
  - Horizontal velocity (random left/right spread)
  - Color (randomly picked from the palette)
  - Size (4-8px)
  - Rotation
- Use CSS `@keyframes` for the fall animation with `animation-delay` for staggering
- Use `animation-fill-mode: forwards` so particles stay invisible after fading
- Clean up with a timeout matching the longest animation duration

**Important:** Keep this lightweight. No canvas, no requestAnimationFrame loops. Pure CSS animations on a handful of divs that get cleaned up.

---

### Integration: DailyQuestsPanel.tsx Modifications

**Current state of DailyQuestsPanel.tsx:** Already has `streak` state, `allDone` derived boolean, and shows `🔥 {streak.current_streak}` in the bar.

**Changes needed:**

1. Import both new components:
   ```tsx
   import StreakTracker from './StreakTracker';
   import Confetti from './Confetti';
   ```

2. Add confetti state:
   ```tsx
   const [showConfetti, setShowConfetti] = useState(false);
   ```

3. Detect when all quests complete — add a `useEffect` that watches `allDone`:
   ```tsx
   const prevAllDone = useRef(false);

   useEffect(() => {
     // Only trigger confetti when allDone transitions from false → true
     // (not on initial load when it might already be true)
     if (allDone && !prevAllDone.current && !loading && quests.length > 0) {
       setShowConfetti(true);
     }
     prevAllDone.current = allDone;
   }, [allDone, loading, quests.length]);
   ```

4. Replace the plain streak display in the bar. Change this:
   ```tsx
   <span className={`pm-quests-bar__streak${streak.current_streak > 0 ? ' pm-quests-bar__streak--active' : ''}`}>
     🔥 {streak.current_streak}
   </span>
   ```
   To this:
   ```tsx
   <StreakTracker
     currentStreak={streak.current_streak}
     longestStreak={streak.longest_streak}
     totalCompleted={streak.total_quests_completed}
   />
   ```

5. Add Confetti to the render output, inside the `pm-quests-panel` div (just before or after the drawer):
   ```tsx
   <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
   ```

6. Enhance the "All done for today!" message — when `allDone` is true and confetti has played, change the message slightly:
   ```tsx
   {allDone && (
     <p className="pm-quests-drawer__all-clear">
       All clear for today! ✨
     </p>
   )}
   ```

---

### SCSS Styles

Add to `src/styles/pages/_pm.scss` (before the reduced-motion section):

```scss
// ── Streak Tracker ────────────────────────────────────────

.pm-streak-tracker {
  position: relative;
  display: flex;
  align-items: center;
  gap: $space-1;
  margin-left: auto;
  cursor: default;
  z-index: 2; // above bar progress fill

  &__fire {
    font-size: $text-sm;
    line-height: 1;
    transition: filter 300ms ease;
  }

  &__fire--active {
    filter: drop-shadow(0 0 4px oklch(from #{$color-warning} l c h / 0.6));
    animation: streak-glow 2s ease-in-out infinite;
  }

  &__fire--inactive {
    filter: grayscale(1) opacity(0.4);
  }

  &__count {
    font-size: $text-xs;
    font-weight: 700;
    color: $pm-text-dim;
    transition: color 300ms ease, transform 200ms ease;
    line-height: 1;
  }

  &__count--active {
    color: $color-warning;
  }

  &__count--pop {
    animation: streak-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  // Tooltip
  &__tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    background: $pm-card;
    border: 1px solid $pm-border;
    border-radius: $radius-md;
    padding: $space-2 $space-3;
    min-width: 140px;
    opacity: 0;
    transform: translateY(4px);
    pointer-events: none;
    transition: opacity 150ms ease, transform 150ms ease;
    z-index: 20;

    // Arrow
    &::after {
      content: '';
      position: absolute;
      top: 100%;
      right: 12px;
      border: 5px solid transparent;
      border-top-color: $pm-border;
    }
  }

  &:hover &__tooltip {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  &__tooltip-row {
    display: flex;
    justify-content: space-between;
    gap: $space-3;
    font-size: $text-xs;
    color: $pm-text-muted;
    line-height: 1.8;

    span:last-child {
      font-weight: 600;
      color: $pm-text;
    }
  }
}

@keyframes streak-glow {
  0%, 100% { filter: drop-shadow(0 0 4px oklch(from #{$color-warning} l c h / 0.5)); }
  50%      { filter: drop-shadow(0 0 8px oklch(from #{$color-warning} l c h / 0.8)); }
}

@keyframes streak-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.35); }
  100% { transform: scale(1); }
}

// ── Confetti ──────────────────────────────────────────────

.pm-confetti {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.pm-confetti__particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--size, 6px);
  height: var(--size, 6px);
  border-radius: var(--radius, 1px);
  background: var(--color);
  opacity: 0;
  animation: confetti-burst var(--duration, 2s) cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--delay, 0s) forwards;
}

@keyframes confetti-burst {
  0% {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
  15% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform:
      translate(var(--tx, 0px), var(--ty, 400px))
      rotate(var(--rot, 720deg))
      scale(0.3);
  }
}
```

Also update the reduced-motion section at the bottom to include the new animations:

```scss
@media (prefers-reduced-motion: reduce) {
  .pm-quests-bar__progress         { transition: none; }
  .pm-quests-drawer                { transition: none; }
  .pm-quest__check-mark            { animation: none; }
  .pm-drive-checklist__sync-btn--syncing { animation: none; }
  .pm-streak-tracker__fire--active { animation: none; }
  .pm-streak-tracker__count--pop   { animation: none; }
  .pm-confetti__particle           { animation: none; display: none; }
}
```

---

## Design Rules (CRITICAL)

- NEVER hardcode hex/rgb values — use `$pm-*` tokens and `$color-*` variables
- Class naming: BEM pattern `.pm-streak-tracker`, `.pm-confetti`, etc.
- All styles in `_pm.scss`
- Confetti colors must use design system values. In the TSX, reference these as CSS custom properties or use the OKLCH values from the design system: success green (`oklch(0.65 0.15 145)`), warning amber (`oklch(0.75 0.15 85)`), accent orange (`oklch(0.75 0.20 85)`, `oklch(0.80 0.16 85)`), and light (`oklch(0.90 0.01 45)`)
- Keep Confetti performance-friendly: ~30-40 particles max, CSS-only, auto-cleanup
- StreakTracker tooltip should not overflow the viewport (position right-aligned)

## File Tree After This Step

```
src/pages/pm/components/
├── StreakTracker.tsx       ← NEW
├── Confetti.tsx            ← NEW
├── DailyQuestsPanel.tsx    ← MODIFIED (integrate both, remove plain streak span)
├── GoogleDriveChecklist.tsx  ← NO CHANGES
├── QuestItem.tsx           ← NO CHANGES
└── ... (all other existing components unchanged)
```

## Acceptance Criteria

1. **StreakTracker** replaces the plain `🔥 N` span in the quests bar
2. Fire icon pulses with a warm glow when streak > 0, goes gray when streak is 0
3. Hovering the tracker shows a tooltip with current/best/total stats
4. When streak count increases, the number plays a pop animation
5. **Confetti** fires when all quests transition from incomplete → all complete
6. Confetti does NOT fire on initial page load even if all quests are already done
7. Confetti particles use design system colors, last ~2s, auto-clean from DOM
8. Reduced motion: all animations disabled, confetti particles hidden
9. Zero hardcoded colors — everything from OKLCH design system
10. Components are self-contained and clean up after themselves
