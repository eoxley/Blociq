"use client";

import { Suspense } from "react";
import AIReplyInner from "./AIReplyInner";
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import PageHero from '@/components/PageHero';

export default function AIReplyPage() {
  return (
    <LayoutWithSidebar>
      <PageHero title="AI Reply" subtitle="Let AI help you craft smart, compliant replies." />
      <Suspense fallback={<p className="p-6">Loading AI Reply...</p>}>
        <AIReplyInner />
      </Suspense>
    </LayoutWithSidebar>
  );
}
