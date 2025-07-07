"use client";

import { useSearchParams } from "next/navigation";

export default function AIReplyInner() {
  const searchParams = useSearchParams();

  const subject = searchParams?.get("subject") || "";
  const from = searchParams?.get("from") || "";
  const body = searchParams?.get("body") || "";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI Email Reply</h1>
      <div className="mb-2">
        <strong>Subject:</strong> {subject}
      </div>
      <div className="mb-2">
        <strong>From:</strong> {from}
      </div>
      <div className="mb-4">
        <strong>Body:</strong>
        <pre className="whitespace-pre-wrap mt-1">{body}</pre>
      </div>
    </div>
  );
}
