"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import DocumentsInner from "./DocumentsInner";
import LayoutWithSidebar from '@/components/LayoutWithSidebar';

export default function DocumentsPage() {
  return (
    <LayoutWithSidebar>
      <Suspense fallback={<p className="p-6">Loading documents...</p>}>
        <DocumentsInner />
      </Suspense>
    </LayoutWithSidebar>
  );
}
