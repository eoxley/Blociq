import { NextRequest, NextResponse } from 'next/server';
import { reminderService } from '@/lib/accounting/reminder-service';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process daily reminders
    const results = await reminderService.processDailyReminders();

    // Log results
    console.log('Daily reminders processed:', {
      sent: results.sent,
      overdue: results.overdue,
      errors: results.errors.length,
    });

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('Daily reminder job failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET(request: NextRequest) {
  try {
    const results = await reminderService.processDailyReminders();
    
    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('Daily reminder job failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}




