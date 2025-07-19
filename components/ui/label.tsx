import React from "react";

interface LabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function Label({ htmlFor, children, className }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={`block text-sm font-medium mb-1 ${className || ''}`}>
      {children}
    </label>
  );
}
