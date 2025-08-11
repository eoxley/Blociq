import { NextResponse } from "next/server";
import { getOutlookAccessToken } from "@/lib/outlook/auth";

export async function POST(req: Request) {
  try {
    const { messageId, destinationFolderId } = await req.json();
    
    if (!messageId || !destinationFolderId) {
      return NextResponse.json(
        { error: "Missing params" },
        { status: 400 }
      );
    }

    const token = await getOutlookAccessToken();
    
    const r = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${messageId}/move`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinationId: destinationFolderId
        }),
      }
    );

    const data = await r.json();
    
    if (!r.ok) {
      return NextResponse.json(
        { error: "Move failed", detail: data },
        { status: r.status }
      );
    }

    return NextResponse.json({ ok: true, moved: data?.id });

  } catch (e: any) {
    return NextResponse.json(
      { error: "Move failed", detail: e?.message },
      { status: 500 }
    );
  }
}
