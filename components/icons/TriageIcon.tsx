import React from 'react';

interface TriageIconProps {
  className?: string;
  size?: number;
}

export default function TriageIcon({ className = '', size = 24 }: TriageIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* White circle with black border */}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="white"
        stroke="black"
        strokeWidth="1"
      />
      
      {/* Red cross - horizontal arm */}
      <rect
        x="6"
        y="10.5"
        width="12"
        height="3"
        fill="#DC2626"
        rx="1"
      />
      
      {/* Red cross - vertical arm */}
      <rect
        x="10.5"
        y="6"
        width="3"
        height="12"
        fill="#DC2626"
        rx="1"
      />
    </svg>
  );
} 