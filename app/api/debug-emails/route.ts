import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Please log in to check emails'
      }, { status: 401 });
    }

    console.log('🔍 Debugging emails for user:', user.email);

    // Get email count and sample data (excluding deleted emails)
    const { data: emails, error: emailsError, count } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false) // Filter out deleted emails
      .order('received_at', { ascending: false })
      .limit(10);

    if (emailsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch emails',
        message: emailsError.message
      }, { status: 500 });
    }

    // Check if emails have proper data
    const emailAnalysis = emails?.map(email => ({
      id: email.id,
      subject: email.subject,
      from_email: email.from_email,
      from_name: email.from_name,
      received_at: email.received_at,
      has_outlook_id: !!email.outlook_id,
      has_user_id: !!email.user_id,
      is_real_email: !!(email.outlook_id && email.from_email && email.subject),
      sample_data: email.subject?.includes('test') || email.from_email?.includes('test')
    })) || [];

    // Analyze email sources
    const realEmails = emailAnalysis.filter(e => e.is_real_email);
    const testEmails = emailAnalysis.filter(e => e.sample_data);
    const dummyEmails = emailAnalysis.filter(e => !e.is_real_email && !e.sample_data);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      emailStats: {
        total: count || 0,
        real: realEmails.length,
        test: testEmails.length,
        dummy: dummyEmails.length
      },
      sampleEmails: emailAnalysis.slice(0, 5),
      analysis: {
        hasRealEmails: realEmails.length > 0,
        hasTestEmails: testEmails.length > 0,
        hasDummyEmails: dummyEmails.length > 0,
        primarySource: realEmails.length > 0 ? 'real' : testEmails.length > 0 ? 'test' : 'dummy'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in debug-emails:', error);
    return NextResponse.json({ 
      error: 'Unexpected error',
      message: 'Failed to check emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 