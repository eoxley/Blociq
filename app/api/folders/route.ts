import { NextResponse } from 'next/server';
import { getOutlookClient, refreshAndGetOutlookClient } from '@/lib/outlookClient';

async function listFolders(client: any) {
  return client
    .api('/me/mailFolders')
    .select('id,displayName,wellKnownName,childFolderCount')
    .top(200)
    .get();
}

export async function GET() {
  try {
    let client = await getOutlookClient();        // uses cached/known-good token
    try {
      const res = await listFolders(client);
      const folders = (res?.value || []).map((f: any) => ({
        id: f.id,
        displayName: f.displayName || f.wellKnownName || 'Untitled',
        wellKnownName: f.wellKnownName || null,
        childFolderCount: f.childFolderCount || 0,
      }));
      return NextResponse.json({ items: folders });
    } catch (err: any) {
      const code = err?.statusCode || err?.status || 500;
      // If unauthorized, try one automatic refresh+retry
      if (code === 401) {
        console.warn('folders: 401 -> attempting token refresh');
        client = await refreshAndGetOutlookClient();
        const res2 = await listFolders(client);
        const folders2 = (res2?.value || []).map((f: any) => ({
          id: f.id,
          displayName: f.displayName || f.wellKnownName || 'Untitled',
          wellKnownName: f.wellKnownName || null,
          childFolderCount: f.childFolderCount || 0,
        }));
        return NextResponse.json({ items: folders2 });
      }
      // Surface the real error up to the client
      console.error('folders error:', err?.message || err);
      return NextResponse.json(
        { error: err?.message || 'Failed to load folders' },
        { status: code }
      );
    }
  } catch (outer: any) {
    const code = outer?.statusCode || outer?.status || 500;
    console.error('getOutlookClient failed:', outer?.message || outer);
    return NextResponse.json(
      { error: code === 401 ? 'Outlook not connected. Please reconnect.' : (outer?.message || 'Failed to list folders') },
      { status: code }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name, parentFolderId } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });

    const client = await getOutlookClient();
    // Create under parent or root (inbox or msgRoot)
    const path = parentFolderId ? `/me/mailFolders/${parentFolderId}/childFolders` : `/me/mailFolders`;
    const body = { displayName: name.trim() };

    const created = await client.api(path).post(body);
    return NextResponse.json({ success: true, folder: created });
  } catch (err: any) {
    const code = err?.statusCode || 500;
    console.error('create folder failed:', err?.message || err);
    if (err?.status === 401) {
      if (err.message?.includes('Outlook not connected')) {
        return NextResponse.json({ error: 'Outlook not connected. Please connect your Outlook account first.', code: 'OUTLOOK_NOT_CONNECTED' }, { status: 401 });
      } else {
        return NextResponse.json({ error: 'Authentication failed. Please log in again.', code: 'AUTH_FAILED' }, { status: 401 });
      }
    }
    const msg = code === 403 ? 'Permission denied. Require Mail.ReadWrite.' : (err?.message || 'Failed to create folder');
    return NextResponse.json({ error: msg }, { status: code });
  }
} 