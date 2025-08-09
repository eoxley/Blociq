import { NextResponse } from 'next/server';
import { getOutlookClient } from '@/lib/outlookClient';

export async function GET() {
  try {
    const client = await getOutlookClient();
    const res = await client.api('/me/mailFolders').select('id,displayName,childFolderCount,wellKnownName').top(200).get();
    return NextResponse.json({ items: res?.value || [] });
  } catch (err: any) {
    console.error('list folders failed:', err?.message || err);
    return NextResponse.json({ error: 'Failed to list folders' }, { status: err?.statusCode || 500 });
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
    const msg = code === 403 ? 'Permission denied. Require Mail.ReadWrite.' : (err?.message || 'Failed to create folder');
    console.error('create folder failed:', err?.message || err);
    return NextResponse.json({ error: msg }, { status: code });
  }
} 