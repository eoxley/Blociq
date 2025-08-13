/**
 * Normalizes HTML content to prevent React 418 errors from uppercase email tags
 * This function converts uppercase HTML tags to lowercase and handles common email HTML issues
 */

export function normalizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  let normalized = html

  // Convert all HTML tags to lowercase to prevent React 418 errors
  normalized = normalized.replace(/<(\/?)([A-Z][A-Z0-9]*)\b([^>]*)>/gi, (match, slash, tagName, attributes) => {
    return `<${slash}${tagName.toLowerCase()}${attributes}>`
  })

  // Handle common email HTML issues
  normalized = normalized
    // Remove Outlook-specific tags that can cause issues
    .replace(/<o:p[^>]*>/gi, '')
    .replace(/<\/o:p>/gi, '')
    .replace(/<w:[^>]*>/gi, '')
    .replace(/<\/w:[^>]*>/gi, '')
    .replace(/<m:[^>]*>/gi, '')
    .replace(/<\/m:[^>]*>/gi, '')
    .replace(/<v:[^>]*>/gi, '')
    .replace(/<\/v:[^>]*>/gi, '')
    
    // Clean up Word-specific formatting
    .replace(/<span[^>]*style="[^"]*mso-[^"]*"[^>]*>/gi, '')
    .replace(/<span[^>]*class="[^"]*mso-[^"]*"[^>]*>/gi, '')
    
    // Remove empty spans and divs
    .replace(/<span[^>]*>\s*<\/span>/gi, '')
    .replace(/<div[^>]*>\s*<\/div>/gi, '')
    
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    
    // Ensure proper paragraph spacing
    .replace(/<p[^>]*>/gi, '<p class="mb-3">')
    .replace(/<br\s*\/?>/gi, '<br>')

  return normalized
}

/**
 * Sanitizes HTML content for safe rendering
 * Removes potentially dangerous elements and attributes
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  let sanitized = html

  // Remove dangerous elements
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<input\b[^<]*>/gi, '')
    .replace(/<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi, '')
    .replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '')
    .replace(/<select\b[^<]*(?:(?!<\/select>)<[^<]*)*<\/select>/gi, '')
    .replace(/<option\b[^<]*>/gi, '')

  // Remove dangerous attributes
  sanitized = sanitized
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*javascript\s*:/gi, '')
    .replace(/\s*vbscript\s*:/gi, '')
    .replace(/\s*data\s*:/gi, '')
    .replace(/\s*expression\s*\(/gi, '')
    .replace(/\s*eval\s*\(/gi, '')

  // Clean up images to only allow safe attributes
  sanitized = sanitized.replace(/<img([^>]*?)>/gi, (match, attributes) => {
    const safeAttributes = attributes
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*javascript\s*:/gi, '')
      .replace(/\s*data\s*:/gi, '')
      .replace(/\s*<[^>]*>/gi, '')
      .replace(/\s*style\s*=\s*["'][^"']*["']/gi, '')
    
    return `<img${safeAttributes} class="max-w-full h-auto">`
  })

  return sanitized
}

/**
 * Combines normalization and sanitization for safe email rendering
 */
export function processEmailHtml(html: string): string {
  return sanitizeHtml(normalizeHtml(html))
}
