import * as React from "react";

export function Checkbox({ id, checked, onCheckedChange }: any) {
  return (
    <input
      id={id}
      type="checkbox"
      className="w-4 h-4"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  );
}
