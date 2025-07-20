import * as React from "react";

interface CheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Checkbox({ id, checked, onCheckedChange }: CheckboxProps) {
  return (
    <input
      id={id}
      type="checkbox"
      className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  );
}
