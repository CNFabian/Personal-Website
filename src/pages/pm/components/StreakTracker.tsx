import React, { useState, useEffect, useRef } from 'react';

interface Props {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
}

const StreakTracker: React.FC<Props> = ({ currentStreak, longestStreak, totalCompleted }) => {
  const [isPopping, setIsPopping] = useState(false);
  const prevStreakRef = useRef(currentStreak);

  // Detect streak increase and trigger pop animation
  useEffect(() => {
    if (currentStreak > prevStreakRef.current) {
      setIsPopping(true);
      // isPopping reset via onAnimationEnd on the count span
    }
    prevStreakRef.current = currentStreak;
  }, [currentStreak]);

  const active = currentStreak > 0;

  return (
    <div
      className="pm-streak-tracker"
      aria-label={`Streak: ${currentStreak} days. Best: ${longestStreak} days. Total quests completed: ${totalCompleted}.`}
    >
      <span
        className={`pm-streak-tracker__fire${active ? ' pm-streak-tracker__fire--active' : ' pm-streak-tracker__fire--inactive'}`}
        aria-hidden="true"
      >
        🔥
      </span>

      <span
        className={[
          'pm-streak-tracker__count',
          active    ? 'pm-streak-tracker__count--active' : '',
          isPopping ? 'pm-streak-tracker__count--pop'    : '',
        ].filter(Boolean).join(' ')}
        onAnimationEnd={() => setIsPopping(false)}
      >
        {currentStreak}
      </span>

      <div className="pm-streak-tracker__tooltip" role="tooltip">
        <div className="pm-streak-tracker__tooltip-row">
          <span>Current</span>
          <span>{currentStreak} days</span>
        </div>
        <div className="pm-streak-tracker__tooltip-row">
          <span>Best</span>
          <span>{longestStreak} days</span>
        </div>
        <div className="pm-streak-tracker__tooltip-row">
          <span>Total quests</span>
          <span>{totalCompleted}</span>
        </div>
      </div>
    </div>
  );
};

export default StreakTracker;
