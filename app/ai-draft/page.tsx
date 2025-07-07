"use client";

import { Suspense } from "react";
import DraftPageInner from "./DraftPageInner";

export default function AIDraftPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading draft...</p>}>
      <DraftPageInner />
    </Suspense>
  );
}
