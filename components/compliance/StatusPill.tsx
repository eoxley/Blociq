import clsx from "clsx";

type Status = "compliant" | "pending" | "overdue" | "unknown";

export default function StatusPill({ status }: { status: Status }) {
  const styles = {
    compliant: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    pending: "bg-amber-50 text-amber-700 ring-amber-200", 
    overdue: "bg-red-50 text-red-700 ring-red-200",
    unknown: "bg-neutral-50 text-neutral-700 ring-neutral-200"
  };

  return (
    <span className={clsx(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1",
      styles[status] || styles.unknown
    )}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
