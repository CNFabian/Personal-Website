import React, { useEffect, useMemo } from 'react';

interface Props {
  active: boolean;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  color: string;
  size: number;
  tx: string;
  ty: string;
  rot: string;
  delay: string;
  duration: string;
  radius: string;
}

// Design-system OKLCH values (no hardcoded hex/rgb)
const COLORS = [
  'oklch(0.65 0.15 145)', // success green
  'oklch(0.75 0.15 85)',  // warning amber
  'oklch(0.75 0.20 55)',  // accent orange
  'oklch(0.80 0.16 55)',  // accent light orange
  'oklch(0.90 0.01 45)',  // near-white (for contrast)
];

const PARTICLE_COUNT = 36;

const Confetti: React.FC<Props> = ({ active, onComplete }) => {
  // Cleanup / onComplete callback
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => onComplete?.(), 3000);
    return () => clearTimeout(id);
  }, [active, onComplete]);

  // Generate particles once when active flips to true
  const particles = useMemo<Particle[]>(() => {
    if (!active) return [];
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      color:    COLORS[Math.floor(Math.random() * COLORS.length)],
      size:     Math.floor(Math.random() * 5) + 4,              // 4–8 px
      tx:       `${((Math.random() - 0.5) * 600).toFixed(1)}px`,  // ±300 px spread
      ty:       `${-(Math.random() * 450 + 100).toFixed(1)}px`,   // 100–550 px upward
      rot:      `${(Math.random() * 720 + 360).toFixed(0)}deg`,
      delay:    `${(Math.random() * 0.35).toFixed(3)}s`,
      duration: `${(Math.random() * 0.8 + 1.5).toFixed(3)}s`,
      radius:   Math.random() > 0.4 ? '2px' : '50%',
    }));
  }, [active]); // eslint-disable-line

  if (!active) return null;

  return (
    <div className="pm-confetti" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="pm-confetti__particle"
          style={{
            '--color':    p.color,
            '--size':     `${p.size}px`,
            '--tx':       p.tx,
            '--ty':       p.ty,
            '--rot':      p.rot,
            '--delay':    p.delay,
            '--duration': p.duration,
            '--radius':   p.radius,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default Confetti;
