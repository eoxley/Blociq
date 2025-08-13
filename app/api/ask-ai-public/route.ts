import { NextRequest, NextResponse } from "next/server";

const DEMO_HEADER = { "X-Ask-Disclaimer": "demo-only; no personal data; not professional advice" };

// If you have a shared LLM client/util, import and reuse it.
// Otherwise, do a minimal fetch to OpenAI (or your provider).
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const MAX_TOKENS = Number(process.env.PUBLIC_ASK_MAX_TOKENS ?? 600);

export const dynamic = "force-dynamic"; // never cache
export const runtime = "nodejs";        // simpler than edge here

// Optional basic rate-limit via Upstash (skip if not configured)
const RL_URL = process.env.UPSTASH_REDIS_REST_URL;
const RL_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function rateLimit(ip: string) {
  if (!RL_URL || !RL_TOKEN) return { allowed: true };
  const key = `ask-public:${ip}:${new Date().getHours()}`;
  const limit = Number(process.env.PUBLIC_ASK_RATE_LIMIT ?? 20);
  const res = await fetch(`${RL_URL}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${RL_TOKEN}` },
  });
  const count = (await res.json())?.result ?? 0;
  if (count === 1) {
    await fetch(`${RL_URL}/pexpire/${encodeURIComponent(key)}/3600000`, {
      headers: { Authorization: `Bearer ${RL_TOKEN}` },
    });
  }
  return { allowed: count <= limit, count, limit };
}

function maskIp(ip: string) {
  if (!ip || ip === "unknown") return "unknown";
  // crude mask: keep first octet (IPv4) or first block (IPv6)
  return ip.includes(".")
    ? ip.split(".").map((p, i) => (i === 0 ? p : "x")).join(".")
    : ip.split(":").map((p, i) => (i === 0 ? p : "x")).join(":");
}

async function sendTranscriptEmail({
  prompt,
  answer,
  ip,
  userEmail,
}: {
  prompt: string;
  answer: string;
  ip: string;
  userEmail?: string;
}) {
  const to = process.env.LEAD_INBOX_EMAIL;
  const from = process.env.LEAD_FROM_EMAIL;

  if (!to || !from) return; // silently skip if not configured

  const subject = "Ask Bloc (public demo) — Transcript";
  const html = `
    <div style="font-family:Inter, Arial, sans-serif; line-height:1.5;">
      <h2>Ask Bloc — Public Demo Transcript</h2>
      <p><strong>When:</strong> ${new Date().toISOString()}</p>
      <p><strong>From IP (masked):</strong> ${maskIp(ip)}</p>
      ${userEmail ? `<p><strong>User Email:</strong> ${userEmail}</p>` : ""}
      <hr/>
      <p><strong>Prompt</strong></p>
      <pre style="white-space:pre-wrap">${escapeHtml(prompt)}</pre>
      <p><strong>Answer</strong></p>
      <pre style="white-space:pre-wrap">${escapeHtml(answer)}</pre>
    </div>
  `;

  // --- Option A: Resend (recommended) ---
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to, ...(userEmail ? [userEmail] : [])],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Resend email failed", await res.text());
    }
    return;
  }

  // --- Option B: SMTP (NodeMailer) ---
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from,
      to: [to, ...(userEmail ? [userEmail] : [])],
      subject,
      html,
    });
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, sendTranscript, userEmail } = await req.json().catch(() => ({}));
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400, headers: { "X-Robots-Tag": "noindex, nofollow", ...DEMO_HEADER } }
      );
    }

    const ip =
      req.ip ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rl = await rateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try later." },
        { status: 429, headers: { "X-Robots-Tag": "noindex, nofollow", ...DEMO_HEADER } }
      );
    }

    // Minimal safety/system prompt for demo use
    const system = `
You are Ask Bloc (demo). Be helpful and concise for UK block/property management questions.
Do not invent personal data, and never ask the user to log in.
Invite them to sign in for building-linked insights and document processing.
`.trim();

    // Call OpenAI Chat Completions directly (adjust if you have a wrapper)
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // or your preferred small model
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: "LLM error", detail: text },
        { status: 500, headers: { "X-Robots-Tag": "noindex, nofollow", ...DEMO_HEADER } }
      );
    }

    const data = await resp.json();
    const answer =
      data?.choices?.[0]?.message?.content ??
      "Sorry, I couldn't generate a response.";

    // NEW: email transcript only if opted-in
    if (sendTranscript === true) {
      // best-effort, non-blocking – don't fail the main response if email fails
      sendTranscriptEmail({ prompt, answer, ip, userEmail }).catch((e) =>
        console.error("sendTranscriptEmail error", e)
      );
    }

    return NextResponse.json(
      { answer },
      { headers: { "X-Robots-Tag": "noindex, nofollow", ...DEMO_HEADER } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500, headers: { "X-Robots-Tag": "noindex, nofollow", ...DEMO_HEADER } }
    );
  }
} 