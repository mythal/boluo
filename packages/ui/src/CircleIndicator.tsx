import clsx from 'clsx';
import React from 'react';

interface Props {
  className?: string;
  progress: number;
}

const RADIUS = 8;
const VIEWBOX_SIZE = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const CircleIndicator: React.FC<Props> = ({ className, progress }) => {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <svg
      className={clsx('CircleIndicator text-current', className)}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      role="presentation"
      aria-hidden="true"
    >
      <circle
        cx={VIEWBOX_SIZE / 2}
        cy={VIEWBOX_SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity={0.2}
      />
      <circle
        cx={VIEWBOX_SIZE / 2}
        cy={VIEWBOX_SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
        transform={`rotate(-90 ${VIEWBOX_SIZE / 2} ${VIEWBOX_SIZE / 2})`}
      />
    </svg>
  );
};
CircleIndicator.displayName = 'CircleIndicator';
