import React from "react";

export function Label({ htmlFor, children }: any) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
      {children}
    </label>
  );
}
