"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import InboxInner from "./InboxInner";

export default function InboxPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading inbox...</p>}>
      <InboxInner />
    </Suspense>
  );
}
