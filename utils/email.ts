// Utility functions for email sending via Outlook integration

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
 * Sanitizes HTML content for safe rendering
 * @param html - The HTML content to sanitize
 * @returns Sanitized HTML content
 */
export function sanitizeHtml(html: string): string {
  // Basic sanitization - remove script tags and potentially dangerous attributes
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '');
  
  return sanitized;
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
 * Sanitizes email content for safe sending
 * @param content - The content to sanitize
 * @returns Sanitized content
 */
export function sanitizeEmailContent(content: string): string {
  // Remove potentially dangerous HTML tags
  const dangerousTags = /<(script|iframe|object|embed|form|input|textarea|select|button)[^>]*>.*?<\/\1>/gis;
  return content.replace(dangerousTags, '');
} 