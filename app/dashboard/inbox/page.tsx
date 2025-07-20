"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import InboxInner from "../../inbox/InboxInner";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";

export default function InboxPage() {
  return (
    <LayoutWithSidebar 
      title="Inbox" 
      subtitle="Manage and respond to incoming emails"
      showSearch={true}
    >
      <Suspense fallback={<p className="p-6">Loading inbox...</p>}>
        <InboxInner />
      </Suspense>
    </LayoutWithSidebar>
  );
}
