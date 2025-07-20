import React from "react";
import { cn } from "@/lib/utils";

interface LabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function Label({ htmlFor, children, className }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-sm font-medium mb-1 text-foreground", className)}>
      {children}
    </label>
  );
}
