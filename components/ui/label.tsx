import React from "react";
import { cn } from "@/lib/utils";

export function Label({ htmlFor, children, className }: any) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-sm font-medium mb-1 text-foreground", className)}>
      {children}
    </label>
  );
}
