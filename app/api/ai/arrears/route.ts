import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { buildingId, leaseholderId, scope = 'building' } = body;

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    let arrearsData;
    let context;

    if (scope === 'building' && buildingId) {
      // Building-level arrears analysis
      const { data: demands } = await supabase
        .from('ar_demand_headers')
        .select(`
          id,
          demand_number,
          demand_date,
          due_date,
          total_amount,
          outstanding_amount,
          status,
          demand_type,
          leaseholders!inner (
            id,
            full_name,
            units!inner (
              unit_number,
              buildings!inner (
                id,
                name,
                address
              )
            )
          )
        `)
        .eq('building_id', buildingId)
        .gt('outstanding_amount', 0)
        .order('due_date', { ascending: true });

      const { data: receipts } = await supabase
        .from('ar_receipts')
        .select(`
          id,
          receipt_date,
          total_amount,
          leaseholders!inner (
            id,
            full_name,
            units!inner (
              unit_number,
              buildings!inner (
                id
              )
            )
          )
        `)
        .eq('leaseholders.units.buildings.id', buildingId)
        .gte('receipt_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      arrearsData = {
        demands: demands || [],
        receipts: receipts || []
      };

      context = {
        type: 'building_arrears',
        building_id: buildingId
      };
    } else if (scope === 'leaseholder' && leaseholderId) {
      // Leaseholder-level arrears analysis
      const { data: demands } = await supabase
        .from('ar_demand_headers')
        .select(`
          id,
          demand_number,
          demand_date,
          due_date,
          total_amount,
          outstanding_amount,
          status,
          demand_type,
          leaseholders!inner (
            id,
            full_name,
            units!inner (
              unit_number,
              buildings!inner (
                id,
                name,
                address
              )
            )
          )
        `)
        .eq('leaseholder_id', leaseholderId)
        .order('due_date', { ascending: true });

      const { data: receipts } = await supabase
        .from('ar_receipts')
        .select(`
          id,
          receipt_date,
          total_amount,
          payment_method
        `)
        .eq('leaseholder_id', leaseholderId)
        .order('receipt_date', { ascending: false })
        .limit(10);

      arrearsData = {
        demands: demands || [],
        receipts: receipts || []
      };

      context = {
        type: 'leaseholder_arrears',
        leaseholder_id: leaseholderId
      };
    } else {
      return NextResponse.json({
        error: 'Invalid parameters',
        message: 'Either buildingId or leaseholderId must be provided'
      }, { status: 400 });
    }

    // Analyze arrears data
    const totalOutstanding = arrearsData.demands.reduce((sum: number, demand: any) => 
      sum + (demand.outstanding_amount || 0), 0
    );

    const overdueCount = arrearsData.demands.filter((demand: any) => 
      new Date(demand.due_date) < new Date()
    ).length;

    const averageDaysOverdue = arrearsData.demands
      .filter((demand: any) => new Date(demand.due_date) < new Date())
      .reduce((sum: number, demand: any) => {
        const daysOverdue = Math.ceil(
          (new Date().getTime() - new Date(demand.due_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + daysOverdue;
      }, 0) / Math.max(overdueCount, 1);

    const recentReceipts = arrearsData.receipts.filter((receipt: any) => 
      new Date(receipt.receipt_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const paymentTrend = recentReceipts.length > 0 ? 'improving' : 'declining';

    // Generate AI insights
    const insights = [];
    const recommendations = [];
    const citations = [];

    if (totalOutstanding > 0) {
      insights.push({
        type: 'arrears_summary',
        title: 'Arrears Overview',
        content: `Total outstanding amount: £${totalOutstanding.toFixed(2)} across ${arrearsData.demands.length} demand(s). ${overdueCount} are overdue.`,
        severity: overdueCount > 0 ? 'high' : 'medium'
      });

      citations.push({
        type: 'demand_headers',
        ids: arrearsData.demands.map((d: any) => d.id),
        description: 'Outstanding demands'
      });
    }

    if (averageDaysOverdue > 30) {
      recommendations.push({
        type: 'collection_action',
        title: 'Consider Collection Action',
        content: `Average days overdue is ${Math.round(averageDaysOverdue)} days. Consider formal collection procedures.`,
        priority: 'high'
      });
    }

    if (paymentTrend === 'declining') {
      recommendations.push({
        type: 'payment_reminder',
        title: 'Send Payment Reminders',
        content: 'No recent payments received. Consider sending payment reminders or contacting leaseholders.',
        priority: 'medium'
      });
    }

    // Risk assessment
    let riskLevel = 'low';
    if (overdueCount > 3 || averageDaysOverdue > 60) {
      riskLevel = 'high';
    } else if (overdueCount > 1 || averageDaysOverdue > 30) {
      riskLevel = 'medium';
    }

    const analysis = {
      summary: {
        total_outstanding: totalOutstanding,
        overdue_count: overdueCount,
        average_days_overdue: Math.round(averageDaysOverdue),
        payment_trend: paymentTrend,
        risk_level: riskLevel
      },
      insights,
      recommendations,
      citations,
      context
    };

    // Log the AI interaction
    await supabase
      .from('ai_interactions_log')
      .insert({
        user_id: session.user.id,
        building_id: buildingId,
        lease_id: leaseholderId,
        query: 'Analyze arrears situation',
        response: JSON.stringify(analysis),
        context_type: 'arrears_analysis',
        metadata: {
          scope,
          total_outstanding: totalOutstanding,
          overdue_count: overdueCount,
          risk_level: riskLevel
        }
      });

    return NextResponse.json({
      success: true,
      analysis,
      data: arrearsData
    });

  } catch (error) {
    console.error('Error in arrears AI analysis:', error);
    return NextResponse.json({
      error: 'Failed to analyze arrears',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
