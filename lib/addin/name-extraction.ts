// lib/addin/name-extraction.ts
// Utility functions to extract sender names from email sign-offs

/**
 * Strips HTML tags and converts to plain text
 */
export function stripHtml(htmlOrText: string): string {
  if (!htmlOrText) return '';

  // If it's already plain text (no HTML tags), return as-is
  if (!/<[^>]*>/g.test(htmlOrText)) {
    return htmlOrText.trim();
  }

  // Strip HTML tags
  let text = htmlOrText
    // Remove script and style elements completely
    .replace(/<(script|style)[^>]*>.*?<\/(script|style)>/gis, '')
    // Convert common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Convert <br> to line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Convert </p>, </div>, </h1-6> to line breaks
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode any remaining HTML entities
    .replace(/&([a-zA-Z0-9]+);/g, (match, entity) => {
      // Basic entity decoding - extend as needed
      const entities: Record<string, string> = {
        'nbsp': ' ',
        'amp': '&',
        'lt': '<',
        'gt': '>',
        'quot': '"',
        'apos': "'",
        'copy': '©',
        'reg': '®',
        'trade': '™'
      };
      return entities[entity] || match;
    });

  // Clean up whitespace
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts the latest message from a full email thread
 */
export function latestMessageBlock(fullText: string): string {
  if (!fullText) return '';

  const lines = fullText.split('\n');

  // Common quoted reply markers (case-insensitive)
  const quotedReplyMarkers = [
    /^from:\s+/i,
    /^sent:\s+/i,
    /^to:\s+/i,
    /^subject:\s+/i,
    /^on\s+.+wrote:/i,
    /^on\s+.+,.+at.+wrote:/i,
    /^---+\s*original\s+message\s*---+/i,
    /^---+\s*forwarded\s+message\s*---+/i,
    /^begin\s+forwarded\s+message/i,
    /^-{5,}/,  // Long dashes
    /^_{5,}/,  // Long underscores
    /^={5,}/,  // Long equals
    /^>+\s*/,  // Quote prefix (>, >>, etc.)
    /^\s*wrote:\s*$/i,
    /^\s*<.*@.*>\s+wrote:\s*$/i,
    /^le\s+.+a\s+écrit\s*:/i, // French "wrote"
    /^am\s+.+schrieb\s*:/i,   // German "wrote"
  ];

  // Find the first line that looks like a quoted reply
  let cutoffIndex = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Check if this line matches any quoted reply marker
    for (const marker of quotedReplyMarkers) {
      if (marker.test(line)) {
        cutoffIndex = i;
        break;
      }
    }

    if (cutoffIndex < lines.length) break;
  }

  // Return everything before the cutoff
  const latestLines = lines.slice(0, cutoffIndex);
  return latestLines.join('\n').trim();
}

/**
 * Extracts sender name from the latest message block
 */
export function extractSenderNameFromLatestMessage(
  rawEmailBody: string,
  outlookFallbackDisplayName?: string
): string {
  if (!rawEmailBody) {
    return outlookFallbackDisplayName || 'Resident';
  }

  // Step 1: Convert to plain text and get latest message
  const plainText = stripHtml(rawEmailBody);
  const latestMessage = latestMessageBlock(plainText);

  if (!latestMessage) {
    return outlookFallbackDisplayName || 'Resident';
  }

  // Step 2: Look for sign-off patterns
  const signOffResult = extractNameFromSignOff(latestMessage);
  if (signOffResult) {
    return signOffResult;
  }

  // Step 3: Look for likely names in last few lines
  const lastLinesResult = extractNameFromLastLines(latestMessage);
  if (lastLinesResult) {
    return lastLinesResult;
  }

  // Step 4: Fallback to Outlook display name
  if (outlookFallbackDisplayName) {
    const cleanedFallback = cleanDisplayName(outlookFallbackDisplayName);
    if (cleanedFallback && cleanedFallback !== 'Unknown') {
      return cleanedFallback;
    }
  }

  // Final fallback
  return 'Resident';
}

/**
 * Attempts to extract name from sign-off phrases
 */
function extractNameFromSignOff(text: string): string | null {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  // Common sign-off phrases (case-insensitive)
  const signOffPatterns = [
    /^(kind\s+regards?|regards?|best\s+regards?)\s*,?\s*(.+)?$/i,
    /^(best\s+wishes?|warm\s+regards?)\s*,?\s*(.+)?$/i,
    /^(yours?\s+sincerely|sincerely)\s*,?\s*(.+)?$/i,
    /^(yours?\s+faithfully|faithfully)\s*,?\s*(.+)?$/i,
    /^(thanks?|thank\s+you)\s*,?\s*(.+)?$/i,
    /^(cheers?)\s*,?\s*(.+)?$/i,
    /^(all\s+the\s+best|best)\s*,?\s*(.+)?$/i,
  ];

  // Scan from bottom up to find sign-offs
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 8); i--) {
    const line = lines[i];

    for (const pattern of signOffPatterns) {
      const match = line.match(pattern);
      if (match) {
        // If name is on the same line
        if (match[2] && match[2].trim()) {
          const name = extractNameFromText(match[2].trim());
          if (name) return name;
        }

        // Check next 1-3 lines for name
        for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
          const nextLine = lines[j];
          if (nextLine) {
            const name = extractNameFromText(nextLine);
            if (name) return name;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Attempts to extract name from last few lines (when no explicit sign-off found)
 */
function extractNameFromLastLines(text: string): string | null {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  // Check last 8 lines for likely names
  const searchLines = lines.slice(-8);

  for (let i = searchLines.length - 1; i >= 0; i--) {
    const line = searchLines[i];
    const name = extractNameFromText(line);
    if (name) {
      return name;
    }
  }

  return null;
}

/**
 * Extracts a likely personal name from a text line
 */
function extractNameFromText(text: string): string | null {
  if (!text || text.length > 100) return null; // Skip very long lines

  // Remove common non-name patterns
  const cleaned = text
    .replace(/[^\w\s'-]/g, ' ') // Keep only word chars, spaces, hyphens, apostrophes
    .replace(/\s+/g, ' ')
    .trim();

  // Skip if contains numbers, emails, URLs, or common non-name patterns
  if (/\d|@|http|www|\.(com|org|uk|co\.uk)/i.test(cleaned)) {
    return null;
  }

  // Skip common email signatures patterns
  const skipPatterns = [
    /^(mobile|phone|tel|email|www|website):/i,
    /^(this\s+email|please\s+consider|confidential|disclaimer)/i,
    /^(sent\s+from|get\s+outlook|download)/i,
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(cleaned)) {
      return null;
    }
  }

  // Look for capitalised words that could be names
  const words = cleaned.split(/\s+/).filter(word => word.length > 0);
  const nameWords = words.filter(word => {
    // Must start with capital letter
    if (!/^[A-Z]/.test(word)) return false;

    // Must be reasonable length (2-20 chars)
    if (word.length < 2 || word.length > 20) return false;

    // Skip common words that aren't names
    const skipWords = [
      'The', 'This', 'That', 'From', 'To', 'Subject', 'Date', 'Time',
      'Please', 'Thank', 'Thanks', 'Dear', 'Hello', 'Hi', 'Hey',
      'Regards', 'Best', 'Kind', 'Yours', 'Sincerely', 'Faithfully',
      'Team', 'Department', 'Office', 'Company', 'Ltd', 'Limited',
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return !skipWords.includes(word);
  });

  // If we have 1-3 reasonable name words, return them
  if (nameWords.length >= 1 && nameWords.length <= 3) {
    return nameWords.join(' ');
  }

  return null;
}

/**
 * Cleans up Outlook display name
 */
function cleanDisplayName(displayName: string): string | null {
  if (!displayName) return null;

  const cleaned = displayName.trim();

  // Skip email addresses used as display names
  if (/@/.test(cleaned)) return null;

  // Skip single letters or very short names
  if (cleaned.length < 2) return null;

  // Skip obviously generated names
  if (/^(user|contact|sender)\d+$/i.test(cleaned)) return null;

  return cleaned;
}

/**
 * Determines if a name is formal (contains titles like Mr, Mrs, Dr, etc.)
 */
export function isNameFormal(name: string): boolean {
  if (!name) return false;

  const formalTitles = [
    /\b(mr|mrs|ms|miss|dr|prof|professor|sir|madam|lord|lady|rev|reverend)\b/i,
    /\b(captain|major|colonel|general|admiral|judge|justice|magistrate)\b/i,
    /\b(councillor|cllr|mp|mbe|obe|cbe|jp)\b/i
  ];

  return formalTitles.some(pattern => pattern.test(name));
}

/**
 * Generates appropriate thank-you/acknowledgement line based on topic
 */
export function generateThankYouLine(topic: string): string {
  switch (topic) {
    case 'leak':
      return 'Thank you for your email regarding the water ingress.';
    case 'fire':
      return 'Thank you for raising this concern about fire safety.';
    case 'compliance':
      return 'Thank you for your enquiry about compliance matters.';
    default:
      return 'Thank you for getting in touch.';
  }
}

/**
 * Determines appropriate closing phrase based on name formality
 */
export function getClosingPhrase(name: string): string {
  return isNameFormal(name) ? 'Yours sincerely,' : 'Kind regards,';
}

/**
 * Generates complete closing with user's first name
 */
export function getClosingPhraseWithUserName(senderName: string, userFirstName?: string): string {
  const closing = getClosingPhrase(senderName);
  const userName = userFirstName || 'BlocIQ';
  return `${closing}\n\n${userName}`;
}