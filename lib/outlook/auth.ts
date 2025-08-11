import { getValidAccessToken } from '@/lib/outlookAuth';

/**
 * Get a valid Outlook access token for Graph API calls
 * This function returns a valid Graph token for the connected mailbox
 */
export async function getOutlookAccessToken(): Promise<string> {
  try {
    const token = await getValidAccessToken();
    
    // Add token verification logging (server-side only, during development)
    if (process.env.NODE_ENV === 'development') {
      try {
        // Decode the JWT token to get user info (this is safe server-side)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log("[Outlook] token for:", payload.preferred_username || payload.upn || 'unknown user');
      } catch (decodeError) {
        console.log("[Outlook] token acquired (could not decode payload)");
      }
    }
    
    return token;
  } catch (error) {
    console.error("[Outlook] Failed to get access token:", error);
    throw error;
  }
}
