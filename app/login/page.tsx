"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import LoginPageInner from "./LoginPageInner";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading login...</p>}>
      <LoginPageInner />
    </Suspense>
  );
}
