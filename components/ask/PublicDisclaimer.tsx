"use client";

type Props = {
  className?: string;
};

export default function PublicDisclaimer({ className = "" }: Props) {
  const privacy = process.env.NEXT_PUBLIC_PRIVACY_URL || "/privacy";
  const terms = process.env.NEXT_PUBLIC_TERMS_URL || "/terms";

  return (
    <div
      role="note"
      aria-label="Demo disclaimer"
      className={`mt-2 rounded-xl border bg-amber-50 text-amber-900 text-sm p-3 ${className}`}
    >
      <strong className="font-semibold">Demo only:</strong> Ask Bloc on this page is for
      general information. It doesn't access your portfolio or Supabase data. Don't share
      confidential or personal information. Responses are not legal, fire-safety, or
      professional advice. For building-specific answers and document analysis, please{" "}
      <a className="underline" href="/login">sign in</a>.
      {" "}By using this demo you agree to our{" "}
      <a className="underline" href={terms}>Terms</a> and{" "}
      <a className="underline" href={privacy}>Privacy Policy</a>.
    </div>
  );
}
