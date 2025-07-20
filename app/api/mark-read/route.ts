import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
  const { emailId } = await req.json();

  const { error } = await supabase
    .from('incoming_emails')
    .update({ unread: false })
    .eq('id', emailId);

  if (error) {
    console.error('Failed to mark as read:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
