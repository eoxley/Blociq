"use client";

/**
 * Compatibility shim for places importing "@/hooks/useSession".
 * If your app injects a session into window.__BLOCIQ_SESSION (or you later
 * wire NextAuth/Supabase), this will surface it. Otherwise returns unauthenticated.
 */

export type BlocIQUser = { id?: string; email?: string; name?: string } | null;
export type BlocIQSession = { user?: BlocIQUser } | null;

type Status = "authenticated" | "unauthenticated" | "loading";

export function useSession(): { data: BlocIQSession; status: Status } {
  // If you already set window.__BLOCIQ_SESSION in layout, we'll read it.
  const sess: BlocIQSession =
    typeof window !== "undefined" && (window as any).__BLOCIQ_SESSION
      ? (window as any).__BLOCIQ_SESSION
      : null;

  const status: Status = sess ? "authenticated" : "unauthenticated";
  return { data: sess, status };
}

// Default export for imports that use `import useSession from ...`
export default useSession;
