// Utility functions for email sending via Outlook integration

import DOMPurify from 'dompurify';

interface EmailData {
  to: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    name: string;
    content: string;
    contentType: string;
  }>;
}

interface OutlookToken {
  access_token: string;
  expires_at: string;
  refresh_token: string;
}

interface EmailAttachment {
  contentId?: string;
  contentBytes?: string;
  contentType?: string;
  name?: string;
}

/**
 * Sanitizes HTML content for safe rendering using DOMPurify
 * @param html - The HTML content to sanitize
 * @returns Sanitized HTML content
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'strong', 'em', 'u', 'b', 'i', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'pre', 'code', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'title', 'class'],
    FORBID_TAGS: ['html', 'head', 'meta', 'style', 'script', 'title', 'link', 'base', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
    KEEP_CONTENT: true
  });
}

/**
 * Handles inline attachments by replacing cid: references with data URIs
 * @param html - The HTML content to process
 * @param attachments - Array of email attachments with contentId and contentBytes
 * @returns HTML with inline attachments replaced
 */
export function inlineAttachments(html: string, attachments?: EmailAttachment[]): string {
  if (!attachments?.length) {
    // If no attachments, replace cid: references with fallback images
    return html.replace(/src="cid:[^"]*"/gi, 'src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkgMTJMMTUgMTJNMTIgOUwxMiAxNU0yMSAxMkMyMSAxNi45NzA2IDE2Ljk3MDYgMjEgMTIgMjFDNy4wMjk0NCAyMSAzIDE2Ljk3MDYgMyAxMkMzIDcuMDI5NDQgNy4wMjk0NCAzIDEyIDNDMTYuOTcwNiAzIDIxIDcuMDI5NDQgMjEgMTJaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=" alt="Image not available" style="width: 24px; height: 24px; opacity: 0.5;"');
  }

  return attachments.reduce((updatedHtml, attachment) => {
    if (attachment.contentId && attachment.contentBytes && attachment.contentType) {
      const dataUrl = `data:${attachment.contentType};base64,${attachment.contentBytes}`;
      const cid = `cid:${attachment.contentId}`;
      return updatedHtml.replaceAll(cid, dataUrl);
    }
    return updatedHtml;
  }, html);
}

/**
 * Enhanced HTML sanitization with inline attachment support
 * @param html - The HTML content to sanitize and process
 * @param attachments - Optional array of email attachments
 * @returns Processed HTML content
 */
export function processEmailHtml(html: string, attachments?: EmailAttachment[]): string {
  // First, handle inline attachments
  const htmlWithAttachments = inlineAttachments(html, attachments);
  
  // Then sanitize the HTML
  return sanitizeHtml(htmlWithAttachments);
}

/**
 * Sends an email via Microsoft Graph API (Outlook)
 * @param emailData - The email data to send
 * @param tokens - Outlook access tokens
 * @returns Promise with the send result
 */
export async function sendEmailViaOutlook(
  emailData: EmailData, 
  tokens?: OutlookToken
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // If no tokens provided, try to get them from the current user
    let accessToken = tokens?.access_token;
    
    if (!accessToken) {
      // This would typically be called from an API route where we have access to the user's tokens
      throw new Error('Access token required for sending emails');
    }

    // Check if token is expired
    if (tokens && new Date(tokens.expires_at) < new Date()) {
      throw new Error('Outlook token has expired');
    }

    // Prepare the email message for Microsoft Graph API
    const messageData = {
      message: {
        subject: emailData.subject,
        body: {
          contentType: 'HTML',
          content: emailData.body
        },
        toRecipients: [
          {
            emailAddress: {
              address: emailData.to
            }
          }
        ],
        ...(emailData.cc && emailData.cc.length > 0 && {
          ccRecipients: emailData.cc.map(email => ({
            emailAddress: { address: email }
          }))
        }),
        ...(emailData.bcc && emailData.bcc.length > 0 && {
          bccRecipients: emailData.bcc.map(email => ({
            emailAddress: { address: email }
          }))
        })
      },
      saveToSentItems: true
    };

    // Send the email via Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send email: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    // Get the message ID from the response headers or create a timestamp-based ID
    const messageId = response.headers.get('x-ms-request-id') || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      messageId
    };

  } catch (error) {
    console.error('Error sending email via Outlook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Sends a bulk email to multiple recipients
 * @param emailData - The email data (to field will be ignored)
 * @param recipients - Array of recipient email addresses
 * @param tokens - Outlook access tokens
 * @returns Promise with the send results
 */
export async function sendBulkEmailViaOutlook(
  emailData: Omit<EmailData, 'to'>,
  recipients: string[],
  tokens?: OutlookToken
): Promise<{
  success: boolean;
  results: Array<{
    email: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}> {
  const results = [];

  for (const recipient of recipients) {
    const result = await sendEmailViaOutlook(
      { ...emailData, to: recipient },
      tokens
    );

    results.push({
      email: recipient,
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });

    // Add a small delay between sends to avoid rate limiting
    if (recipients.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  return {
    success: failureCount === 0,
    results
  };
}

/**
 * Validates an email address format
 * @param email - The email address to validate
 * @returns Boolean indicating if the email is valid
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Formats email content for better display
 * @param content - The email content to format
 * @returns Formatted HTML content
 */
export function formatEmailContent(content: string): string {
  // Convert line breaks to HTML
  let formatted = content.replace(/\n/g, '<br>');
  
  // Convert URLs to clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Basic styling
  formatted = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      ${formatted}
    </div>
  `;
  
  return formatted;
}

/**
 * Creates a professional email signature
 * @param managerName - The manager's name
 * @param companyName - The company name
 * @param phone - The phone number
 * @param email - The email address
 * @returns HTML signature string
 */
export function createEmailSignature(
  managerName: string,
  companyName: string = 'BlocIQ',
  phone?: string,
  email?: string
): string {
  return `
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-family: Arial, sans-serif; font-size: 12px; color: #666;">
      <p style="margin: 0 0 5px 0; font-weight: bold; color: #333;">${managerName}</p>
      <p style="margin: 0 0 5px 0;">${companyName}</p>
      ${phone ? `<p style="margin: 0 0 5px 0;">Tel: ${phone}</p>` : ''}
      ${email ? `<p style="margin: 0 0 5px 0;">Email: ${email}</p>` : ''}
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #999;">
        This email was sent via BlocIQ Property Management System
      </p>
    </div>
  `;
}

/**
 * Generates a unique message ID for tracking
 * @returns A unique message identifier
 */
export function generateMessageId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `blociq_${timestamp}_${random}`;
}

/**
 * Extracts email addresses from a string
 * @param text - The text to extract emails from
 * @returns Array of email addresses found
 */
export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return text.match(emailRegex) || [];
}

/**
 * Sanitizes and formats email content for safe display
 * @param email - Email object with body fields
 * @param attachments - Optional attachments for inline image support
 * @returns Sanitized HTML string for safe rendering
 */
export function sanitizeEmailContent(email: {
  body_html?: string | null;
  body_full?: string | null;
  body_preview?: string | null;
  body_content_type?: string | null;
}, attachments?: any[]): string {
  // Priority: body_html > body_full > body_preview
  let content = '';
  let isHtml = false;

  if (email.body_html && email.body_content_type === 'html') {
    content = email.body_html;
    isHtml = true;
  } else if (email.body_full) {
    if (email.body_content_type === 'html') {
      content = email.body_full;
      isHtml = true;
    } else {
      content = email.body_full;
      isHtml = false;
    }
  } else if (email.body_preview) {
    content = email.body_preview;
    isHtml = false;
  } else {
    return '<p class="text-gray-500 italic">No message content available</p>';
  }

  if (isHtml) {
    // Process HTML content with attachments if available
    let processedHtml = content;
    if (attachments && attachments.length > 0) {
      processedHtml = processEmailHtml(content, attachments);
    }

    // Sanitize HTML content
    const sanitizedHtml = DOMPurify.sanitize(processedHtml, {
      ALLOWED_TAGS: [
        'p', 'br', 'div', 'span', 'strong', 'em', 'u', 'b', 'i', 'a', 
        'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
        'hr', 'pre', 'code', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
      ],
      ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'title', 'class', 'style'],
      FORBID_TAGS: [
        'html', 'head', 'meta', 'style', 'script', 'title', 'link', 'base', 
        'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 
        'button', 'noscript', 'applet', 'bgsound', 'link', 'meta', 'title'
      ],
      KEEP_CONTENT: true
    });

    // Additional cleanup for better formatting
    let cleanedHtml = sanitizedHtml
      .replace(/<html[^>]*>.*?<body[^>]*>(.*?)<\/body>.*?<\/html>/gis, '$1')
      .replace(/<head[^>]*>.*?<\/head>/gis, '')
      .replace(/<meta[^>]*>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<title[^>]*>.*?<\/title>/gis, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/<base[^>]*>/gi, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .trim();

    // Wrap in a container with proper styling
    return `<div class="prose prose-sm max-w-none text-gray-700">${cleanedHtml}</div>`;
  } else {
    // Handle plain text content
    const escapedContent = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const linkedContent = escapedContent.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>');

    // Convert line breaks to HTML
    const formattedContent = linkedContent.replace(/\n/g, '<br>');

    return `<div class="whitespace-pre-wrap text-gray-700">${formattedContent}</div>`;
  }
}

/**
 * Formats quoted email content for replies
 * @param email - Email object with sender and content information
 * @returns Formatted quoted content string
 */
export function formatQuotedEmail(email: {
  from_name?: string | null;
  from_email?: string | null;
  subject?: string | null;
  received_at?: string | null;
  body_html?: string | null;
  body_full?: string | null;
  body_preview?: string | null;
  body_content_type?: string | null;
}): string {
  const originalSender = email.from_name || email.from_email || 'Unknown sender';
  const originalDate = email.received_at ? new Date(email.received_at).toLocaleString() : 'Unknown date';
  const originalSubject = email.subject || 'No subject';

  // Get the original email content
  const originalContent = email.body_html || email.body_full || email.body_preview || '';

  // Sanitize the HTML content
  const sanitizedHtml = DOMPurify.sanitize(originalContent, {
    ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'strong', 'em', 'u', 'b', 'i', 'a', 'ul', 'ol', 'li', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target'],
    FORBID_TAGS: [
      'html', 'head', 'meta', 'style', 'script', 'title', 'link', 'base', 'iframe', 'object', 'embed', 
      'form', 'input', 'textarea', 'select', 'button', 'label', 'fieldset', 'legend', 'optgroup', 
      'option', 'datalist', 'output', 'progress', 'meter', 'canvas', 'svg', 'math', 'video', 'audio', 
      'source', 'track', 'map', 'area', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 
      'colgroup', 'col', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'pre', 'code', 'kbd', 'samp', 'var', 
      'cite', 'q', 'abbr', 'acronym', 'dfn', 'del', 'ins', 'mark', 'small', 'sub', 'sup', 'time', 'wbr', 
      'ruby', 'rt', 'rp', 'bdi', 'bdo'
    ],
    KEEP_CONTENT: true
  });

  // Additional cleanup for better formatting
  let cleanedContent = sanitizedHtml
    .replace(/<html[^>]*>.*?<body[^>]*>(.*?)<\/body>.*?<\/html>/gis, '$1')
    .replace(/<head[^>]*>.*?<\/head>/gis, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<title[^>]*>.*?<\/title>/gis, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<base[^>]*>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
    .replace(/<object[^>]*>.*?<\/object>/gis, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/<form[^>]*>.*?<\/form>/gis, '')
    .replace(/<input[^>]*>/gi, '')
    .replace(/<button[^>]*>.*?<\/button>/gis, '')
    .replace(/<select[^>]*>.*?<\/select>/gis, '')
    .replace(/<textarea[^>]*>.*?<\/textarea>/gis, '')
    .replace(/<label[^>]*>.*?<\/label>/gis, '')
    .replace(/<fieldset[^>]*>.*?<\/fieldset>/gis, '')
    .replace(/<legend[^>]*>.*?<\/legend>/gis, '')
    .replace(/<optgroup[^>]*>.*?<\/optgroup>/gis, '')
    .replace(/<option[^>]*>.*?<\/option>/gis, '')
    .replace(/<datalist[^>]*>.*?<\/datalist>/gis, '')
    .replace(/<output[^>]*>.*?<\/output>/gis, '')
    .replace(/<progress[^>]*>.*?<\/progress>/gis, '')
    .replace(/<meter[^>]*>.*?<\/meter>/gis, '')
    .replace(/<canvas[^>]*>.*?<\/canvas>/gis, '')
    .replace(/<svg[^>]*>.*?<\/svg>/gis, '')
    .replace(/<math[^>]*>.*?<\/math>/gis, '')
    .replace(/<video[^>]*>.*?<\/video>/gis, '')
    .replace(/<audio[^>]*>.*?<\/audio>/gis, '')
    .replace(/<source[^>]*>/gi, '')
    .replace(/<track[^>]*>/gi, '')
    .replace(/<map[^>]*>.*?<\/map>/gis, '')
    .replace(/<area[^>]*>/gi, '')
    .replace(/<table[^>]*>.*?<\/table>/gis, '')
    .replace(/<thead[^>]*>.*?<\/thead>/gis, '')
    .replace(/<tbody[^>]*>.*?<\/tbody>/gis, '')
    .replace(/<tfoot[^>]*>.*?<\/tfoot>/gis, '')
    .replace(/<tr[^>]*>.*?<\/tr>/gis, '')
    .replace(/<th[^>]*>.*?<\/th>/gis, '')
    .replace(/<td[^>]*>.*?<\/td>/gis, '')
    .replace(/<caption[^>]*>.*?<\/caption>/gis, '')
    .replace(/<colgroup[^>]*>.*?<\/colgroup>/gis, '')
    .replace(/<col[^>]*>/gi, '')
    .replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gis, '')
    .replace(/<hr[^>]*>/gi, '')
    .replace(/<pre[^>]*>.*?<\/pre>/gis, '')
    .replace(/<code[^>]*>.*?<\/code>/gis, '')
    .replace(/<kbd[^>]*>.*?<\/kbd>/gis, '')
    .replace(/<samp[^>]*>.*?<\/samp>/gis, '')
    .replace(/<var[^>]*>.*?<\/var>/gis, '')
    .replace(/<cite[^>]*>.*?<\/cite>/gis, '')
    .replace(/<q[^>]*>.*?<\/q>/gis, '')
    .replace(/<abbr[^>]*>.*?<\/abbr>/gis, '')
    .replace(/<acronym[^>]*>.*?<\/acronym>/gis, '')
    .replace(/<dfn[^>]*>.*?<\/dfn>/gis, '')
    .replace(/<del[^>]*>.*?<\/del>/gis, '')
    .replace(/<ins[^>]*>.*?<\/ins>/gis, '')
    .replace(/<mark[^>]*>.*?<\/mark>/gis, '')
    .replace(/<small[^>]*>.*?<\/small>/gis, '')
    .replace(/<sub[^>]*>.*?<\/sub>/gis, '')
    .replace(/<sup[^>]*>.*?<\/sup>/gis, '')
    .replace(/<time[^>]*>.*?<\/time>/gis, '')
    .replace(/<wbr[^>]*>/gi, '')
    .replace(/<ruby[^>]*>.*?<\/ruby>/gis, '')
    .replace(/<rt[^>]*>.*?<\/rt>/gis, '')
    .replace(/<rp[^>]*>.*?<\/rp>/gis, '')
    .replace(/<bdi[^>]*>.*?<\/bdi>/gis, '')
    .replace(/<bdo[^>]*>.*?<\/bdo>/gis, '')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  // Format the quoted message with proper structure
  const quotedMessage = `\n\n--- Original Message ---
From: ${originalSender}
Date: ${originalDate}
Subject: ${originalSubject}

${cleanedContent}`;

  return quotedMessage;
} 