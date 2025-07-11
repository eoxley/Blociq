"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import DashboardInner from "./DashboardInner";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading dashboard...</p>}>
      <DashboardInner />
    </Suspense>
  );
}
