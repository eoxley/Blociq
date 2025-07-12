// /lib/outlookAuth.ts

import { ConfidentialClientApplication } from "@azure/msal-node"

// Check if all required environment variables are available
const hasRequiredEnvVars = process.env.OUTLOOK_CLIENT_ID && 
                          process.env.OUTLOOK_TENANT_ID && 
                          process.env.OUTLOOK_CLIENT_SECRET

const msalConfig = hasRequiredEnvVars ? {
  auth: {
    clientId: process.env.OUTLOOK_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}`,
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET!
  }
} : null

const cca = msalConfig ? new ConfidentialClientApplication(msalConfig) : null

/**
 * Returns a Microsoft Graph access token using client credentials
 */
export async function getAccessToken(): Promise<string> {
  if (!cca) {
    throw new Error("Microsoft Graph credentials not configured. Please set OUTLOOK_CLIENT_ID, OUTLOOK_TENANT_ID, and OUTLOOK_CLIENT_SECRET environment variables.")
  }

  const tokenRequest = {
    scopes: ["https://graph.microsoft.com/.default"]
  }

  const response = await cca.acquireTokenByClientCredential(tokenRequest)

  if (!response?.accessToken) {
    throw new Error("Failed to acquire Microsoft Graph access token")
  }

  return response.accessToken
}
