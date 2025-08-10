import { convert } from "html-to-text";
import DOMPurify from "dompurify";

/**
 * Sanitizes HTML content for safe preview rendering
 * Removes potentially dangerous tags and attributes
 */
export const sanitizeEmailHtml = (raw?: string): string => {
  if (!raw) return "";
  
  return DOMPurify.sanitize(raw, {
    FORBID_TAGS: ["html", "head", "meta", "style", "script", "title"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Checks if a string contains HTML tags
 * Used to determine whether content should be rendered as HTML or plain text
 */
export const looksLikeHtml = (s?: string): boolean => {
  if (!s) return false;
  
  // Common HTML tags to look for
  const htmlTags = [
    'html', 'head', 'body', 'div', 'p', 'span', 'br', 'hr',
    'table', 'tr', 'td', 'th', 'thead', 'tbody',
    'ul', 'ol', 'li', 'a', 'img', 'strong', 'b', 'em', 'i',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'form', 'input', 'button', 'textarea', 'select', 'option',
    'meta', 'link', 'style', 'script'
  ];
  
  const tagPattern = new RegExp(`<\\/?(${htmlTags.join('|')})[^>]*>`, 'i');
  return tagPattern.test(s);
};

/**
 * Converts email content to plain text with proper quoting
 * Handles HTML → text conversion and creates email-style quoted replies
 */
export const toPlainQuoted = (email: {
  from_name?: string;
  from_email?: string;
  subject?: string;
  received_at?: string | Date;
  body_html?: string | null;
  body_full?: string | null;
}): string => {
  // Create the header for the quoted message
  const header = 
`--- Original Message ---
From: ${email.from_name ?? ""}${email.from_email ? ` <${email.from_email}>` : ""}
Date: ${email.received_at ? new Date(email.received_at).toLocaleString() : ""}
Subject: ${email.subject ?? ""}

`;

  // Extract plain text content from the email
  let bodyPlain = "";
  
  if (email.body_full?.trim()) {
    // Check if body_full contains HTML tags
    const hasHtmlTags = /<[^>]*>/.test(email.body_full);
    
    if (hasHtmlTags) {
      // Convert HTML to plain text
      bodyPlain = convert(email.body_full, {
        wordwrap: false,
        selectors: [
          { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
          { selector: "img", format: "skip" },
          { selector: "script", format: "skip" },
          { selector: "style", format: "skip" },
          { selector: "head", format: "skip" },
          { selector: "meta", format: "skip" },
        ],
      });
    } else {
      // Already plain text
      bodyPlain = email.body_full;
    }
  } else if (email.body_html) {
    // Convert HTML to plain text
    bodyPlain = convert(email.body_html, {
      wordwrap: false,
      selectors: [
        { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
        { selector: "img", format: "skip" },
        { selector: "script", format: "skip" },
        { selector: "style", format: "skip" },
        { selector: "head", format: "skip" },
        { selector: "meta", format: "skip" },
      ],
    });
  } else {
    bodyPlain = "No content available";
  }

  // Quote each line with `> ` prefix (email style)
  const quoted = bodyPlain
    .split(/\r?\n/)
    .map(line => `> ${line}`)
    .join("\n");

  return `${header}${quoted}\n`;
};

/**
 * Converts email content to plain text without quoting
 * Useful for preview text or when you need just the content
 */
export const toPlainText = (email: {
  body_html?: string | null;
  body_full?: string | null;
}): string => {
  if (email.body_full?.trim()) {
    const hasHtmlTags = /<[^>]*>/.test(email.body_full);
    
    if (hasHtmlTags) {
      return convert(email.body_full, {
        wordwrap: false,
        selectors: [
          { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
          { selector: "img", format: "skip" },
          { selector: "script", format: "skip" },
          { selector: "style", format: "skip" },
          { selector: "head", format: "skip" },
          { selector: "meta", format: "skip" },
        ],
      });
    } else {
      return email.body_full;
    }
  } else if (email.body_html) {
    return convert(email.body_html, {
      wordwrap: false,
      selectors: [
        { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
        { selector: "img", format: "skip" },
        { selector: "script", format: "skip" },
        { selector: "style", format: "skip" },
        { selector: "head", format: "skip" },
        { selector: "meta", format: "skip" },
      ],
    });
  }
  
  return "";
};
