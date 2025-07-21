import React from 'react'

interface BlocIQLogoProps {
  className?: string
  size?: number
}

export default function BlocIQLogo({ className = '', size = 24 }: BlocIQLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* House outline */}
      <path
        d="M3 12L12 3L21 12V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Door */}
      <rect
        x="9"
        y="15"
        width="6"
        height="6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {/* Chimney dot */}
      <circle
        cx="17"
        cy="6"
        r="2"
        fill="currentColor"
      />
    </svg>
  )
} 