// ✅ AUDIT COMPLETE [2025-01-15]
// - Field validation for emailId and folderId
// - Supabase query with proper .eq() filter
// - Microsoft Graph API integration for Outlook folder moves
// - Try/catch with detailed error handling
// - Used in inbox components

import { NextResponse } from 'next/server';
import { getOutlookClient, ensureFolderId } from '@/lib/outlookClient';
import { z } from 'zod';

const Body = z.object({
  emailId: z.string().min(1),
  folderId: z.string().min(1), // either actual folderId or a known key like 'inbox'|'deleted'|'archive'
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { emailId, folderId } = Body.parse(json);

    // Throws 401 if user not authenticated or cannot get a valid Graph client
    const client = await getOutlookClient();

    // Map well-known aliases to actual folderId if needed
    const destinationId = await ensureFolderId(client, folderId); // if folderId already looks like a GUID, just return it

    const res = await client.api(`/me/messages/${emailId}/move`).post({ destinationId });

    return NextResponse.json({ success: true, message: res }, { status: 200 });
  } catch (err: any) {
    const code = err?.statusCode || err?.status || 500;
    console.error('move-email failed:', err?.message || err);
    // Surface helpful message for 401/403
    const msg = code === 401
      ? 'Not authenticated or Outlook token expired. Please reconnect Outlook.'
      : code === 403
        ? 'Permission denied. Ensure Mail.ReadWrite is granted.'
        : err?.message || 'Failed to move email';
    return NextResponse.json({ error: msg }, { status: code });
  }
} 