// /lib/outlookAuth.ts

import { ConfidentialClientApplication } from "@azure/msal-node"

const msalConfig = {
  auth: {
    clientId: process.env.OUTLOOK_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}`,
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET!
  }
}

const cca = new ConfidentialClientApplication(msalConfig)

/**
 * Returns a Microsoft Graph access token using client credentials
 */
export async function getAccessToken(): Promise<string> {
  const tokenRequest = {
    scopes: ["https://graph.microsoft.com/.default"]
  }

  const response = await cca.acquireTokenByClientCredential(tokenRequest)

  if (!response?.accessToken) {
    throw new Error("Failed to acquire Microsoft Graph access token")
  }

  return response.accessToken
}
