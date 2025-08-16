import * as React from "react";
import clsx from "clsx";

type Props = React.HTMLAttributes<HTMLDivElement>;

export default function SectionCard({ className, ...props }: Props) {
  return (
    <div
      {...props}
      className={clsx(
        "rounded-2xl border border-neutral-200/60 bg-white shadow-sm hover:shadow-md transition-shadow",
        "divide-y divide-neutral-100",
        className
      )}
    />
  );
}
