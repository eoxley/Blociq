import React from "react";
import { cn } from "@/lib/utils";

<<<<<<< HEAD
interface LabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function Label({ htmlFor, children, className }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={`block text-sm font-medium mb-1 ${className || ''}`}>
=======
export function Label({ htmlFor, children, className }: any) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-sm font-medium mb-1 text-foreground", className)}>
>>>>>>> locked-ui-baseline
      {children}
    </label>
  );
}
