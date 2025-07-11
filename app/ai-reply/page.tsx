"use client";

import { Suspense } from "react";
import AIReplyInner from "./AIReplyInner";

export default function AIReplyPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading AI Reply...</p>}>
      <AIReplyInner />
    </Suspense>
  );
}
