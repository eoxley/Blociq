"use client";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { useState } from "react";

type Props = { text: string; masked?: boolean };
export default function Revealable({ text, masked = true }: Props) {
  const [show, setShow] = useState(!masked);
  const [copied, setCopied] = useState(false);
  const display = show ? text : "••••";

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium">{display}</span>
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="p-1 rounded-md hover:bg-neutral-100 focus:outline-none focus:ring-2 ring-violet-400"
        aria-label={show ? "Hide" : "Reveal"}
      >
        {show ? <EyeOff className="h-4 w-4 text-neutral-500" /> : <Eye className="h-4 w-4 text-neutral-500" />}
      </button>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="p-1 rounded-md hover:bg-neutral-100 focus:outline-none focus:ring-2 ring-violet-400"
        aria-label="Copy"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-neutral-500" />}
      </button>
    </span>
  );
}
