import * as React from "react";
import clsx from "clsx";

type Props = {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
};
export function InfoRow({ label, value, className }: Props) {
  return (
    <div className={clsx("grid grid-cols-[180px_1fr] items-center py-2.5 px-4", className)}>
      <div className="text-sm font-medium text-neutral-500">{label}</div>
      <div className="text-sm text-neutral-900">{value}</div>
    </div>
  );
}
