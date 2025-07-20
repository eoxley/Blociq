"use client";

import { Suspense } from "react";
import AIReplyInner from "./AIReplyInner";
import LayoutWithSidebar from '@/components/LayoutWithSidebar';

export default function AIReplyPage() {
  return (
    <LayoutWithSidebar>
      <Suspense fallback={<p className="p-6">Loading AI Reply...</p>}>
        <AIReplyInner />
      </Suspense>
    </LayoutWithSidebar>
  );
}
