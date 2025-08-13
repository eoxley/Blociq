import * as React from "react";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({ checked = false, onCheckedChange, className }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={`w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded ${className || ''}`}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  );
}
