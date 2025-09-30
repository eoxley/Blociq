import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');
    
    if (!buildingId) {
      return NextResponse.json({ error: 'building_id is required' }, { status: 400 });
    }
    
    const supabase = createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to building
    const { data: userBuilding } = await supabase
      .from('user_buildings')
      .select('role')
      .eq('building_id', buildingId)
      .eq('user_id', user.id)
      .single();

    if (!userBuilding) {
      return NextResponse.json({ error: 'Building access denied' }, { status: 403 });
    }

    // Get contractors used in last 12 months with compliance status
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: contractors, error: contractorsError } = await supabase
      .from('contractors')
      .select(`
        id,
        name,
        categories,
        contractor_documents (
          doc_type,
          status,
          valid_to,
          created_at
        ),
        works_orders!inner (
          id,
          created_at,
          status,
          gross_total: works_order_lines (total)
        )
      `)
      .eq('works_orders.building_id', buildingId)
      .gte('works_orders.created_at', twelveMonthsAgo.toISOString())
      .order('name');

    if (contractorsError) {
      return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 });
    }

    // Process contractor compliance data
    const complianceData = contractors?.map(contractor => {
      // Get insurance status
      const insurance = contractor.contractor_documents.find(doc => doc.doc_type === 'insurance');
      const insuranceStatus = insurance ? insurance.status : 'missing';
      const insuranceExpiry = insurance ? insurance.valid_to : null;
      
      // Get other document statuses
      const ram = contractor.contractor_documents.find(doc => doc.doc_type === 'ram');
      const methodStatement = contractor.contractor_documents.find(doc => doc.doc_type === 'method_statement');
      const hmrc = contractor.contractor_documents.find(doc => doc.doc_type === 'hmrc');
      
      // Calculate total spend
      const totalSpend = contractor.works_orders.reduce((sum, wo) => {
        const woTotal = wo.works_order_lines?.reduce((lineSum, line) => lineSum + (line.total || 0), 0) || 0;
        return sum + woTotal;
      }, 0);
      
      // Count active works orders
      const activeWorksOrders = contractor.works_orders.filter(wo => 
        ['draft', 'issued', 'in_progress'].includes(wo.status)
      ).length;

      return {
        id: contractor.id,
        name: contractor.name,
        categories: contractor.categories,
        insurance_status: insuranceStatus,
        insurance_expiry: insuranceExpiry,
        ram_status: ram ? ram.status : 'missing',
        method_statement_status: methodStatement ? methodStatement.status : 'missing',
        hmrc_status: hmrc ? hmrc.status : 'missing',
        total_spend: totalSpend,
        active_works_orders: activeWorksOrders,
        last_used: contractor.works_orders[0]?.created_at,
        compliance_score: calculateComplianceScore(insurance, ram, methodStatement, hmrc),
      };
    }) || [];

    // Categorize contractors by compliance status
    const complianceSummary = {
      total_contractors: complianceData.length,
      valid_insurance: complianceData.filter(c => c.insurance_status === 'valid').length,
      expired_insurance: complianceData.filter(c => c.insurance_status === 'expired').length,
      missing_insurance: complianceData.filter(c => c.insurance_status === 'missing').length,
      high_risk: complianceData.filter(c => c.compliance_score < 50).length,
      medium_risk: complianceData.filter(c => c.compliance_score >= 50 && c.compliance_score < 80).length,
      low_risk: complianceData.filter(c => c.compliance_score >= 80).length,
    };

    // Generate AI insights
    const insights = generateComplianceInsights(complianceData, complianceSummary);

    return NextResponse.json({
      success: true,
      data: {
        contractors: complianceData,
        summary: complianceSummary,
        insights,
      },
    });

  } catch (error) {
    console.error('Error fetching contractor compliance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate compliance score
function calculateComplianceScore(insurance: any, ram: any, methodStatement: any, hmrc: any): number {
  let score = 0;
  let total = 0;

  // Insurance (40% weight)
  if (insurance) {
    total += 40;
    if (insurance.status === 'valid') {
      score += 40;
    } else if (insurance.status === 'expired') {
      score += 20; // Partial credit for having it but expired
    }
  } else {
    total += 40; // Still count as total even if missing
  }

  // RAM (20% weight)
  if (ram) {
    total += 20;
    if (ram.status === 'valid') {
      score += 20;
    } else if (ram.status === 'expired') {
      score += 10;
    }
  } else {
    total += 20;
  }

  // Method Statement (20% weight)
  if (methodStatement) {
    total += 20;
    if (methodStatement.status === 'valid') {
      score += 20;
    } else if (methodStatement.status === 'expired') {
      score += 10;
    }
  } else {
    total += 20;
  }

  // HMRC (20% weight)
  if (hmrc) {
    total += 20;
    if (hmrc.status === 'valid') {
      score += 20;
    } else if (hmrc.status === 'expired') {
      score += 10;
    }
  } else {
    total += 20;
  }

  return total > 0 ? Math.round((score / total) * 100) : 0;
}

// Helper function to generate AI insights
function generateComplianceInsights(contractors: any[], summary: any): string[] {
  const insights = [];

  // Insurance insights
  if (summary.expired_insurance > 0) {
    insights.push(`${summary.expired_insurance} contractor${summary.expired_insurance > 1 ? 's have' : ' has'} expired insurance. Request updated certificates before approving new works orders.`);
  }

  if (summary.missing_insurance > 0) {
    insights.push(`${summary.missing_insurance} contractor${summary.missing_insurance > 1 ? 's are' : ' is'} missing insurance documentation. This is a compliance risk for new works.`);
  }

  // High-risk contractors
  if (summary.high_risk > 0) {
    insights.push(`${summary.high_risk} contractor${summary.high_risk > 1 ? 's are' : ' is'} considered high-risk due to missing or expired documentation.`);
  }

  // Spending insights
  const highSpendContractors = contractors.filter(c => c.total_spend > 10000);
  if (highSpendContractors.length > 0) {
    insights.push(`${highSpendContractors.length} high-spend contractor${highSpendContractors.length > 1 ? 's' : ''} (over £10k) should have up-to-date compliance documentation.`);
  }

  // Active works orders
  const contractorsWithActiveWOs = contractors.filter(c => c.active_works_orders > 0);
  if (contractorsWithActiveWOs.length > 0) {
    const nonCompliantActive = contractorsWithActiveWOs.filter(c => c.insurance_status !== 'valid');
    if (nonCompliantActive.length > 0) {
      insights.push(`${nonCompliantActive.length} contractor${nonCompliantActive.length > 1 ? 's with' : ' with'} active works orders have invalid insurance. Consider pausing work until compliance is updated.`);
    }
  }

  // Positive insights
  if (summary.valid_insurance === summary.total_contractors && summary.total_contractors > 0) {
    insights.push('All contractors have valid insurance documentation. Excellent compliance!');
  }

  if (summary.low_risk > summary.high_risk) {
    insights.push('Most contractors have good compliance scores. Focus on the few high-risk cases.');
  }

  return insights;
}


