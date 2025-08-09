import { NextResponse } from 'next/server';
import { getOutlookClient } from '@/lib/outlookClient';

export async function GET() {
  try {
    const client = await getOutlookClient();
    const res = await client
      .api('/me/mailFolders')
      .select('id,displayName,wellKnownName,childFolderCount')
      .top(200)
      .get();

    // Map to consistent object
    const folders = (res?.value || []).map((f) => ({
      id: f.id,
      displayName: f.displayName || f.wellKnownName || 'Untitled',
      wellKnownName: f.wellKnownName || null,
      childFolderCount: f.childFolderCount || 0,
    }));

    return NextResponse.json({ items: folders });
  } catch (err: any) {
    console.error('list folders failed:', err?.message || err);
    if (err?.status === 401) {
      if (err.message?.includes('Outlook not connected')) {
        return NextResponse.json({ error: 'Outlook not connected. Please connect your Outlook account first.', code: 'OUTLOOK_NOT_CONNECTED' }, { status: 401 });
      } else {
        return NextResponse.json({ error: 'Authentication failed. Please log in again.', code: 'AUTH_FAILED' }, { status: 401 });
      }
    }
    return NextResponse.json({ error: 'Failed to list folders', details: err?.message || 'Unknown error' }, { status: err?.statusCode || 500 });
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