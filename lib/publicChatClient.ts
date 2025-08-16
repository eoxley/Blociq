export async function startPublicChat(email: string, marketingConsent = false) {
  const r = await fetch("/api/public-chat/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, marketingConsent })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Failed to start");
  // Persist so we don't ask again
  localStorage.setItem("askbq_public_session", j.sessionId);
  localStorage.setItem("askbq_public_email", email);
  return j.sessionId as string;
}

export async function logPublicChatMessage(
  sessionId: string,
  role: "user" | "assistant" | "system",
  content: string,
  tokenCount?: number
) {
  // Fire-and-forget; logging mustn't block UX
  try {
    await fetch("/api/public-chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, role, content, tokenCount })
    });
  } catch {}
}

export function getExistingSession() {
  return localStorage.getItem("askbq_public_session");
}

export function getExistingEmail() {
  return localStorage.getItem("askbq_public_email");
}
