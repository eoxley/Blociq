import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reminderService } from '@/lib/accounting/reminder-service';
import { z } from 'zod';

const DeadlinesQuerySchema = z.object({
  building_id: z.string().uuid(),
  action: z.enum(['list', 'create', 'update', 'complete', 'analyze']).default('list'),
  reminder_id: z.string().uuid().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');
    const action = searchParams.get('action') || 'list';

    const validatedData = DeadlinesQuerySchema.parse({
      building_id: buildingId,
      action,
    });
    
    const supabase = await createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to building
    const { data: userBuilding } = await supabase
      .from('user_buildings')
      .select('role')
      .eq('building_id', validatedData.building_id)
      .eq('user_id', user.id)
      .single();

    if (!userBuilding) {
      return NextResponse.json({ error: 'Building access denied' }, { status: 403 });
    }

    // Get upcoming reminders
    const reminders = await reminderService.getUpcomingReminders(validatedData.building_id, 90);

    // Analyze and categorize reminders
    const analysis = analyzeReminders(reminders);

    return NextResponse.json({
      success: true,
      data: {
        reminders,
        analysis,
        summary: {
          total: reminders.length,
          overdue: reminders.filter(r => r.days_until_due < 0).length,
          due_soon: reminders.filter(r => r.days_until_due >= 0 && r.days_until_due <= 7).length,
          upcoming: reminders.filter(r => r.days_until_due > 7).length,
        }
      },
    });

  } catch (error) {
    console.error('Error fetching deadlines:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = DeadlinesQuerySchema.parse(body);
    
    const supabase = await createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to building
    const { data: userBuilding } = await supabase
      .from('user_buildings')
      .select('role')
      .eq('building_id', validatedData.building_id)
      .eq('user_id', user.id)
      .single();

    if (!userBuilding) {
      return NextResponse.json({ error: 'Building access denied' }, { status: 403 });
    }

    let result;

    switch (validatedData.action) {
      case 'create':
        result = await createStandardPeriods(validatedData.building_id);
        break;
      
      case 'update':
        if (!validatedData.reminder_id || !validatedData.status) {
          return NextResponse.json({ error: 'reminder_id and status are required for update' }, { status: 400 });
        }
        result = await reminderService.updateReminderStatus(
          validatedData.reminder_id,
          validatedData.status,
          user.id,
          validatedData.notes
        );
        break;
      
      case 'complete':
        if (!validatedData.reminder_id) {
          return NextResponse.json({ error: 'reminder_id is required for complete' }, { status: 400 });
        }
        result = await reminderService.markReminderAsCompleted(
          validatedData.reminder_id,
          user.id,
          validatedData.notes
        );
        break;
      
      case 'analyze':
        const reminders = await reminderService.getUpcomingReminders(validatedData.building_id, 90);
        result = generateAIInsights(reminders);
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Error processing deadline action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to analyze reminders
function analyzeReminders(reminders: any[]): {
  critical: any[];
  high_priority: any[];
  overdue: any[];
  due_this_week: any[];
  upcoming: any[];
  by_type: Record<string, any[]>;
} {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const analysis = {
    critical: [] as any[],
    high_priority: [] as any[],
    overdue: [] as any[],
    due_this_week: [] as any[],
    upcoming: [] as any[],
    by_type: {} as Record<string, any[]>,
  };

  for (const reminder of reminders) {
    const dueDate = new Date(reminder.due_date);
    const daysUntilDue = reminder.days_until_due;

    // Categorize by priority
    if (reminder.priority === 'critical') {
      analysis.critical.push(reminder);
    } else if (reminder.priority === 'high') {
      analysis.high_priority.push(reminder);
    }

    // Categorize by timing
    if (daysUntilDue < 0) {
      analysis.overdue.push(reminder);
    } else if (daysUntilDue <= 7) {
      analysis.due_this_week.push(reminder);
    } else {
      analysis.upcoming.push(reminder);
    }

    // Categorize by type
    if (!analysis.by_type[reminder.reminder_type]) {
      analysis.by_type[reminder.reminder_type] = [];
    }
    analysis.by_type[reminder.reminder_type].push(reminder);
  }

  return analysis;
}

// Helper function to create standard periods
async function createStandardPeriods(buildingId: string): Promise<{ periods_created: number }> {
  const currentYear = new Date().getFullYear();
  
  // Check if periods already exist for this year
  const supabase = await createClient();
  const { data: existingPeriods } = await supabase
    .from('accounting_periods')
    .select('id')
    .eq('building_id', buildingId)
    .gte('locked_before', `${currentYear}-01-01`)
    .lte('locked_before', `${currentYear}-12-31`);

  if (existingPeriods && existingPeriods.length > 0) {
    return { periods_created: 0 };
  }

  // Create standard periods
  await reminderService.createStandardPeriods(buildingId, currentYear);
  
  // Generate reminders for each period
  const { data: periods } = await supabase
    .from('accounting_periods')
    .select('id')
    .eq('building_id', buildingId)
    .gte('locked_before', `${currentYear}-01-01`)
    .lte('locked_before', `${currentYear}-12-31`);

  for (const period of periods || []) {
    await reminderService.generateRemindersForPeriod(period.id);
  }

  return { periods_created: periods?.length || 0 };
}

// Helper function to generate AI insights
function generateAIInsights(reminders: any[]): {
  insights: string[];
  recommendations: string[];
  risk_assessment: string;
} {
  const insights = [];
  const recommendations = [];
  let riskLevel = 'low';

  // Analyze overdue items
  const overdue = reminders.filter(r => r.days_until_due < 0);
  if (overdue.length > 0) {
    insights.push(`You have ${overdue.length} overdue deadline${overdue.length > 1 ? 's' : ''}.`);
    recommendations.push('Address overdue items immediately to avoid compliance issues.');
    riskLevel = 'high';
  }

  // Analyze critical items
  const critical = reminders.filter(r => r.priority === 'critical' && r.days_until_due <= 7);
  if (critical.length > 0) {
    insights.push(`${critical.length} critical deadline${critical.length > 1 ? 's' : ''} due within 7 days.`);
    recommendations.push('Prioritize critical deadlines and ensure adequate resources are allocated.');
    if (riskLevel !== 'high') riskLevel = 'medium';
  }

  // Analyze budget vs audit timing
  const budgetReminders = reminders.filter(r => r.reminder_type === 'budget');
  const auditReminders = reminders.filter(r => r.reminder_type === 'audit');
  
  if (budgetReminders.length > 0 && auditReminders.length > 0) {
    const budgetDue = new Date(budgetReminders[0].due_date);
    const auditDue = new Date(auditReminders[0].due_date);
    const daysBetween = Math.floor((auditDue.getTime() - budgetDue.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysBetween < 30) {
      insights.push('Budget approval and audit deadlines are close together - plan accordingly.');
      recommendations.push('Consider starting audit preparation early to avoid conflicts.');
    }
  }

  // Analyze quarterly distribution
  const quarterly = reminders.filter(r => r.reminder_type === 'quarterly');
  if (quarterly.length > 0) {
    insights.push('Quarterly reviews are well-distributed throughout the year.');
    recommendations.push('Use quarterly reviews to identify trends and adjust budgets proactively.');
  }

  // Generate risk assessment
  if (overdue.length > 2) {
    riskLevel = 'high';
  } else if (overdue.length > 0 || critical.length > 2) {
    riskLevel = 'medium';
  }

  return {
    insights,
    recommendations,
    risk_assessment: riskLevel,
  };
}




