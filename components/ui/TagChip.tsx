import clsx from "clsx";

export default function TagChip({ label }: { label: string }) {
  const tone =
    /chair/i.test(label) ? "bg-violet-50 text-violet-700 ring-violet-200" :
    /secretary/i.test(label) ? "bg-sky-50 text-sky-700 ring-sky-200" :
    /treasurer/i.test(label) ? "bg-amber-50 text-amber-800 ring-amber-200" :
    "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return (
    <span className={clsx(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1", tone
    )}>
      {label}
    </span>
  );
}
