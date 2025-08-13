/**
 * Handles CID inline images by fetching attachments and replacing cid: URLs with data URLs
 * This utility processes email content to display inline images properly
 */

export interface Attachment {
  id: string
  name: string
  contentId?: string
  contentType: string
  contentBytes: string
  size: number
}

export interface CidReplacement {
  cid: string
  dataUrl: string
  contentType: string
}

/**
 * Fetches attachments for a message via Microsoft Graph API
 */
export async function fetchMessageAttachments(messageId: string): Promise<Attachment[]> {
  try {
    const response = await fetch(`/api/outlook/v2/messages/${messageId}/attachments`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch attachments: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.ok || !data.items) {
      throw new Error('Invalid response format from attachments API')
    }
    
    return data.items.map((attachment: any) => ({
      id: attachment.id,
      name: attachment.name,
      contentId: attachment.contentId,
      contentType: attachment.contentType,
      contentBytes: attachment.contentBytes,
      size: attachment.size || 0
    }))
  } catch (error) {
    console.error('Error fetching message attachments:', error)
    return []
  }
}

/**
 * Converts attachment content to a data URL
 */
export function createDataUrl(contentBytes: string, contentType: string): string {
  try {
    // Convert base64 to blob
    const byteCharacters = atob(contentBytes)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: contentType })
    
    // Create data URL
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error creating data URL:', error)
    return ''
  }
}

/**
 * Processes HTML content to replace cid: URLs with data URLs
 */
export function processCidImages(html: string, attachments: Attachment[]): string {
  if (!html || !attachments.length) {
    return html
  }

  let processed = html

  // Find all cid: URLs in the HTML
  const cidRegex = /cid:([^"'\s>]+)/gi
  const cidMatches = html.match(cidRegex) || []

  // Create a map of contentId to attachment
  const cidMap = new Map<string, Attachment>()
  attachments.forEach(attachment => {
    if (attachment.contentId) {
      // Remove the angle brackets if present
      const cleanCid = attachment.contentId.replace(/[<>]/g, '')
      cidMap.set(cleanCid, attachment)
    }
  })

  // Replace each cid: URL with its corresponding data URL
  cidMatches.forEach(cidUrl => {
    const cid = cidUrl.replace('cid:', '')
    const attachment = cidMap.get(cid)
    
    if (attachment) {
      const dataUrl = createDataUrl(attachment.contentBytes, attachment.contentType)
      if (dataUrl) {
        // Replace the cid: URL in the HTML
        processed = processed.replace(
          new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
          dataUrl
        )
      }
    }
  })

  return processed
}

/**
 * Main function to process email content with inline images
 */
export async function processEmailWithInlineImages(
  messageId: string, 
  htmlContent: string
): Promise<{ processedHtml: string; attachments: Attachment[] }> {
  try {
    // Fetch attachments for the message
    const attachments = await fetchMessageAttachments(messageId)
    
    // Process the HTML to replace cid: URLs
    const processedHtml = processCidImages(htmlContent, attachments)
    
    return {
      processedHtml,
      attachments
    }
  } catch (error) {
    console.error('Error processing email with inline images:', error)
    return {
      processedHtml: htmlContent,
      attachments: []
    }
  }
}

/**
 * Cleanup function to revoke object URLs to prevent memory leaks
 */
export function cleanupDataUrls(attachments: Attachment[]): void {
  attachments.forEach(attachment => {
    if (attachment.contentId) {
      // Note: In a real implementation, you'd want to track the created URLs
      // and revoke them. For now, this is a placeholder for cleanup logic.
    }
  })
}
