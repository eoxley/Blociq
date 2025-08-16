"use client";
type Props = { label?: string; onClick?: () => void };
export default function EmptyValue({ label = "Add", onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
    >
      + {label}
    </button>
  );
}
