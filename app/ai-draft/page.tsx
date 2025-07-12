"use client";

import { Suspense } from "react";
import DraftPageInner from "./DraftPageInner";
import LayoutWithSidebar from '@/components/LayoutWithSidebar';

export default function AIDraftPage() {
  return (
    <LayoutWithSidebar>
      <Suspense fallback={<p className="p-6">Loading draft...</p>}>
        <DraftPageInner />
      </Suspense>
    </LayoutWithSidebar>
  );
}
