"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import DocumentsInner from "./DocumentsInner";

export default function DocumentsPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading documents...</p>}>
      <DocumentsInner />
    </Suspense>
  );
}
