export const TRACE_TAG = "trace-inbox@v1";
export const isServer = typeof window === "undefined";

export function shouldTrace() {
  if (isServer) return process.env.TRACE_INBOX === "1";
  try {
    const urlHas = new URLSearchParams(window.location.search).has("trace");
    return urlHas || process.env.NEXT_PUBLIC_TRACE_INBOX === "1";
  } catch {
    return process.env.NEXT_PUBLIC_TRACE_INBOX === "1";
  }
}

export function trace(label: string, data?: any) {
  if (!shouldTrace()) return;
  // Client-side label
  if (!isServer) console.info(`[${TRACE_TAG}] ${label}`, data ?? {});
}

export function serverTrace(label: string, data?: any) {
  if (!shouldTrace()) return;
  // Server-side label
  console.info(`[${TRACE_TAG}] ${label}`, data ?? {});
}
