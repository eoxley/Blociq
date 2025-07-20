import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
  const { emailId, draft } = await req.json();

  // Step 1: Get the original email
  const { data: email, error: fetchError } = await supabase
    .from('incoming_emails')
    .select('*')
    .eq('id', emailId)
    .single();

  if (fetchError || !email) {
    console.error('Email not found:', fetchError?.message);
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  // Step 2: Send email (using a placeholder - swap with real logic later)
  console.log(`📤 Sending email to: ${email.from_email}`);
  console.log(`Subject: RE: ${email.subject}`);
  console.log(`Body:\n${draft}`);

  // TODO: Replace this with actual Outlook or SendGrid integration

  // Step 3: Mark email as handled
  await supabase
    .from('incoming_emails')
    .update({ handled: true })
    .eq('id', emailId);

  // Step 4: Log history
  await supabase.from('email_history').insert({
    email_id: emailId,
    sent_text: draft,
  });

  return NextResponse.json({ success: true });
}
