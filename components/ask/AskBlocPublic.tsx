"use client";

import { useMemo, useState } from "react";
import PublicDisclaimer from "./PublicDisclaimer";

export default function AskBlocPublic() {
  const [value, setValue] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW
  const [sendTranscript, setSendTranscript] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [accepted, setAccepted] = useState(false);

  const enabled = process.env.NEXT_PUBLIC_PUBLIC_ASK_ENABLED === "1";
  const requireAccept = process.env.NEXT_PUBLIC_REQUIRE_DEMO_ACCEPT === "1";

  const canAsk = useMemo(() => {
    if (loading) return false;
    if (!value.trim()) return false;
    if (requireAccept && !accepted) return false;
    return true;
  }, [loading, value, requireAccept, accepted]);

  async function onAsk(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setAnswer(null);
    if (!canAsk) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ask-ai-public", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: value.trim(),
          // NEW
          sendTranscript,
          userEmail: sendTranscript && userEmail.trim() ? userEmail.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAnswer(data?.answer ?? "No answer received.");
    } catch (err: any) {
      setError(err?.message ?? "Failed to ask.");
    } finally {
      setLoading(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border p-4 md:p-6 bg-white/70 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Ask Bloc — Live Demo</h3>
        <span className="text-xs text-muted-foreground">No login required</span>
      </div>

      <form onSubmit={onAsk} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border px-3 py-2"
            placeholder="Ask about block management, compliance, letters, timelines…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Ask Bloc prompt"
          />
          <button
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 disabled:opacity-50"
            disabled={!canAsk}
            type="submit"
          >
            {loading ? "Thinking…" : "Ask"}
          </button>
        </div>

        {/* Optional accept-to-continue */}
        {requireAccept && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>I've read and accept the demo disclaimer below.</span>
          </label>
        )}

        {/* Existing opt-in email bits (keep if you've added them) */}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={sendTranscript}
            onChange={(e) => setSendTranscript(e.target.checked)}
          />
          <span>
            Email me this answer and share with BlocIQ for follow-up (optional).{" "}
            <span className="text-xs text-muted-foreground">
              We'll only use this to send the transcript and may contact you about BlocIQ.
            </span>
          </span>
        </label>

        {sendTranscript && (
          <input
            type="email"
            className="rounded-xl border px-3 py-2"
            placeholder="Your email (optional)"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />
        )}

        {sendTranscript && (
          <p className="text-xs text-muted-foreground">
            You can opt out anytime by unchecking.
          </p>
        )}
      </form>

      {/* Disclaimer */}
      <PublicDisclaimer />

      <p className="text-xs text-muted-foreground mt-2">
        Demo answers are generic and not linked to your portfolio.{" "}
        <a className="underline" href="/login">Sign in</a> to analyse your buildings and documents.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {answer && (
        <div className="mt-4 rounded-xl border p-4 prose max-w-none">
          {/* Simple markdown-ish rendering */}
          {answer.split("\n").map((line, i) => (
            <p key={i} className="mb-2">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
