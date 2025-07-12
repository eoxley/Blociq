"use client";

import { Suspense } from "react";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";

function AIReplyInner() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Reply</h1>
        <p className="text-gray-600 mt-2">Generate AI-powered responses to tenant communications</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reply Generator</h2>
        <p className="text-gray-600">AI reply functionality coming soon...</p>
      </div>
    </div>
  );
}

export default function AIReplyPage() {
  return (
    <LayoutWithSidebar>
      <Suspense fallback={<p className="p-6">Loading AI reply...</p>}>
        <AIReplyInner />
      </Suspense>
    </LayoutWithSidebar>
  );
}