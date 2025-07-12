// /lib/outlookAuth.ts

import { ConfidentialClientApplication } from "@azure/msal-node"

const clientId = process.env.OUTLOOK_CLIENT_ID;
const tenantId = process.env.OUTLOOK_TENANT_ID;
const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;

if (!clientId || !tenantId || !clientSecret) {
  console.warn("Microsoft Outlook credentials not configured. Set OUTLOOK_CLIENT_ID, OUTLOOK_TENANT_ID, and OUTLOOK_CLIENT_SECRET environment variables.");
}

const msalConfig = clientId && tenantId && clientSecret ? {
  auth: {
    clientId: clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientSecret: clientSecret
  }
} : null;

const cca = msalConfig ? new ConfidentialClientApplication(msalConfig) : null;

/**
 * Returns a Microsoft Graph access token using client credentials
 */
export async function getAccessToken(): Promise<string> {
  if (!cca) {
    throw new Error("Microsoft Outlook credentials not configured. Please set OUTLOOK_CLIENT_ID, OUTLOOK_TENANT_ID, and OUTLOOK_CLIENT_SECRET environment variables.");
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
