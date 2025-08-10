// Simple HTML sanitization utility
// This is a basic implementation - consider using a library like DOMPurify for production

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Remove potentially dangerous tags and attributes
  let sanitized = html
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove object tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    // Remove embed tags
    .replace(/<embed\b[^>]*>/gi, '')
    // Remove on* event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs (except for images)
    .replace(/data:(?!image\/)/gi, '')
    // Remove vbscript: URLs
    .replace(/vbscript:/gi, '')
    // Remove expression() in CSS
    .replace(/expression\s*\(/gi, '')
    // Remove eval() in CSS
    .replace(/eval\s*\(/gi, '');

  // Allow safe HTML tags for email formatting
  const allowedTags = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'div', 'span', 'table', 'tr', 'td', 'th',
    'thead', 'tbody', 'a', 'img'
  ];

  const allowedAttributes = [
    'href', 'src', 'alt', 'title', 'style', 'class', 'id', 'width', 'height',
    'align', 'valign', 'colspan', 'rowspan'
  ];

  // This is a simplified approach - in production, use a proper HTML parser
  // For now, we'll just ensure basic safety
  return sanitized;
}

export function sanitizeEmailHtml(html: string): string {
  // Additional email-specific sanitization
  let sanitized = sanitizeHtml(html);

  // Ensure proper email formatting
  sanitized = sanitized
    // Ensure line breaks are preserved
    .replace(/\n/g, '<br>')
    // Remove any remaining dangerous content
    .replace(/<[^>]*>/g, (match) => {
      const tagName = match.match(/<(\w+)/)?.[1]?.toLowerCase();
      if (!tagName) return '';
      
      // Only allow safe tags
      const safeTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'div', 'span'];
      if (!safeTags.includes(tagName)) {
        return '';
      }
      return match;
    });

  return sanitized;
}
