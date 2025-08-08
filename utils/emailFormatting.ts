import { convert } from "html-to-text";
import DOMPurify from "dompurify";

export function toSanitisedHtml(rawHtml: string) {
  return DOMPurify.sanitize(rawHtml || "", {
    FORBID_TAGS: ["html","head","meta","style","script","title"],
  });
}

export function toPlainQuoted(email: {
  from_name?: string | null;
  from_email?: string | null;
  subject?: string | null;
  received_at?: string | Date | null;
  body_html?: string | null;
  body_full?: string | null; // may contain plain text
}) {
  const header =
`--- Original Message ---
From: ${email.from_name ?? ""}${email.from_email ? ` <${email.from_email}>` : ""}
Date: ${email.received_at ? new Date(email.received_at).toLocaleString() : ""}
Subject: ${email.subject ?? ""}

`;

  // Prefer existing plain text if present; otherwise convert HTML → text.
  const bodyPlain = email.body_full?.trim()
    ? email.body_full!
    : convert(email.body_html ?? "", {
        wordwrap: false,
        selectors: [
          { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
          { selector: "img", format: "skip" },
          { selector: "script", format: "skip" },
          { selector: "style", format: "skip" },
        ],
      });

  // Quote lines (email style)
  const quoted = bodyPlain
    .split(/\r?\n/)
    .map(line => `> ${line}`)
    .join("\n");

  return `${header}${quoted}\n`;
}
