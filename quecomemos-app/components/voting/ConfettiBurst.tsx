'use client';

import { useEffect, useState } from 'react';

const CONFETTI_PIECES = [
  { left: '8%', delay: '0ms', color: '#D97706', rotate: '18deg' },
  { left: '16%', delay: '90ms', color: '#2F6F4E', rotate: '-22deg' },
  { left: '25%', delay: '40ms', color: '#C85A32', rotate: '35deg' },
  { left: '34%', delay: '140ms', color: '#EAB308', rotate: '-12deg' },
  { left: '43%', delay: '20ms', color: '#10B981', rotate: '45deg' },
  { left: '52%', delay: '110ms', color: '#C85A32', rotate: '-35deg' },
  { left: '61%', delay: '60ms', color: '#2F6F4E', rotate: '28deg' },
  { left: '70%', delay: '150ms', color: '#F59E0B', rotate: '-18deg' },
  { left: '79%', delay: '30ms', color: '#10B981', rotate: '40deg' },
  { left: '88%', delay: '100ms', color: '#C85A32', rotate: '-28deg' },
  { left: '94%', delay: '70ms', color: '#EAB308', rotate: '15deg' },
  { left: '20%', delay: '180ms', color: '#2F6F4E', rotate: '55deg' },
  { left: '48%', delay: '160ms', color: '#F59E0B', rotate: '-45deg' },
  { left: '74%', delay: '200ms', color: '#10B981', rotate: '22deg' },
];

export function ConfettiBurst({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      {CONFETTI_PIECES.map((piece, idx) => (
        <span
          key={idx}
          style={{
            left: piece.left,
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            transform: `rotate(${piece.rotate})`,
          }}
          className="absolute -top-3 h-2.5 w-2 rounded-xs opacity-90 animate-bounce"
        />
      ))}
    </div>
  );
}
