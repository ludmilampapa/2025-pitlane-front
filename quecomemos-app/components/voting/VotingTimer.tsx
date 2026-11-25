'use client';

import React, { useState, useEffect } from 'react';
import { VotingService } from './VotingService';

interface VotingTimerProps {
  endTime: string;
  label?: string;
  onExpired?: () => void;
  className?: string;
}

export function VotingTimer({ endTime, label = 'Time remaining', onExpired, className = '' }: VotingTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const { total } = VotingService.getTimeRemaining(endTime);

      if (total <= 0) {
        if (!isExpired) {
          setIsExpired(true);
          setTimeRemaining('Expired');
          onExpired?.();
        }
        return;
      }

      const formatted = VotingService.formatTimeRemaining(endTime);
      setTimeRemaining(formatted);
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime, isExpired, onExpired]);

  return (
    <span
      className={`font-medium tabular-nums ${
        isExpired ? 'text-destructive' : 'text-secondary'
      } ${className}`}
    >
      {label}: <span className="font-semibold">{timeRemaining}</span>
    </span>
  );
}
