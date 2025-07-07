import { NextResponse } from "next/server";

export async function GET() {
  // ✅ Dynamically import MSAL to avoid breaking during Vercel build
  const { ConfidentialClientApplication } = await import("@azure/msal-node");

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

  try {
    const result = await clientApp.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });

    // ✅ Add null check before accessing result
    if (!result) {
      return NextResponse.json(
        { error: "No token result received from Microsoft Graph" },
        { status: 500 }
      );
    }

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
