"use client";

import { useSearchParams } from "next/navigation";

export default function DraftPageInner() {
  const searchParams = useSearchParams();

  const subject = searchParams?.get("subject") || "";
  const from = searchParams?.get("from") || "";
  const body = searchParams?.get("body") || "";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI Draft Generator</h1>
      <p><strong>Subject:</strong> {subject}</p>
      <p><strong>From:</strong> {from}</p>
      <div className="mt-4">
        <strong>Body:</strong>
        <pre className="whitespace-pre-wrap">{body}</pre>
      </div>
    </div>
  );
}
