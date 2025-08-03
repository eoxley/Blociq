"use client";

import { Suspense } from "react";
import DraftPageInner from "./DraftPageInner";
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import PageHero from '@/components/PageHero';

export default function AIDraftPage() {
  return (
    <LayoutWithSidebar>
      <PageHero title="AI Draft" subtitle="Generate drafts with AI assistance for your property management needs." />
      <Suspense fallback={<p className="p-6">Loading draft...</p>}>
        <DraftPageInner />
      </Suspense>
    </LayoutWithSidebar>
  );
}
