// /lib/outlookAuth.ts

import { ConfidentialClientApplication } from "@azure/msal-node"

/**
 * Returns a Microsoft Graph access token using client credentials
 */
export async function getAccessToken(): Promise<string> {
  // Check if required environment variables are available
  if (!process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_TENANT_ID || !process.env.OUTLOOK_CLIENT_SECRET) {
    throw new Error("Microsoft Graph credentials are not configured. Please set OUTLOOK_CLIENT_ID, OUTLOOK_TENANT_ID, and OUTLOOK_CLIENT_SECRET environment variables.");
  }

  const msalConfig = {
    auth: {
      clientId: process.env.OUTLOOK_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}`,
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET!
    }
  }

  const cca = new ConfidentialClientApplication(msalConfig)

  const tokenRequest = {
    scopes: ["https://graph.microsoft.com/.default"]
  }

  const response = await cca.acquireTokenByClientCredential(tokenRequest)

  if (!response?.accessToken) {
    throw new Error("Failed to acquire Microsoft Graph access token")
  }

  return response.accessToken
}
