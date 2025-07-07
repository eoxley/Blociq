import { NextResponse } from "next/server";

export async function GET() {
  // ✅ Dynamically import to avoid breaking at build time
  const { ConfidentialClientApplication } = await import("@azure/msal-node");

  // ✅ Check that required env vars exist
  const {
    AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET,
    AZURE_TENANT_ID,
  } = process.env;

  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_TENANT_ID) {
    return NextResponse.json(
      {
        error:
          "Missing Azure credentials: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, or AZURE_TENANT_ID",
      },
      { status: 500 }
    );
  }

  const clientApp = new ConfidentialClientApplication({
    auth: {
      clientId: AZURE_CLIENT_ID,
      clientSecret: AZURE_CLIENT_SECRET,
      authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    },
  });

  // ⚠️ Example: acquire token (replace with your actual scopes & logic)
  try {
    const result = await clientApp.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });

    return NextResponse.json({
      message: "Successfully authenticated with Microsoft Graph",
      tokenExpires: result.expiresOn?.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to authenticate with Microsoft Graph",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
