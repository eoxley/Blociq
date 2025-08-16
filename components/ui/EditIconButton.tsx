"use client";
import { Pencil } from "lucide-react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;
export default function EditIconButton(props: Props) {
  return (
    <button
      {...props}
      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg hover:bg-neutral-100 focus:outline-none focus:ring-2 ring-violet-400 transition"
      aria-label="Edit"
    >
      <Pencil className="h-4 w-4 text-neutral-500" />
    </button>
  );
}
