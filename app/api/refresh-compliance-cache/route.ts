// ✅ AUDIT COMPLETE [2025-01-15]
// - Has try/catch wrapper
// - Validates required fields (buildingId)
// - Uses proper Supabase queries with authentication
// - Returns meaningful error responses
// - Includes authentication check

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { buildingId } = body;

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    console.log('🔄 Refreshing compliance cache for building:', buildingId);

    // Fetch latest compliance data
    const { data: buildingAssets, error: assetsError } = await supabase
      .from('building_assets')
      .select(`
        *,
        compliance_items (
          id,
          item_type,
          category,
          frequency,
          assigned_to,
          notes
        )
      `)
      .eq('building_id', parseInt(buildingId))
      .eq('applies', true);

    if (assetsError) {
      console.error('Error fetching compliance assets:', assetsError);
      return NextResponse.json({ error: 'Failed to refresh compliance cache' }, { status: 500 });
    }

    // Calculate compliance statistics
    const today = new Date();
    let overdueCount = 0;
    let dueSoonCount = 0;
    let compliantCount = 0;
    let missingCount = 0;

    buildingAssets?.forEach(asset => {
      if (asset.next_due) {
        const dueDate = new Date(asset.next_due);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) {
          overdueCount++;
        } else if (daysUntilDue <= 30) {
          dueSoonCount++;
        } else {
          compliantCount++;
        }
      } else {
        missingCount++;
      }
    });

    const complianceSummary = {
      totalItems: buildingAssets?.length || 0,
      overdue: overdueCount,
      dueSoon: dueSoonCount,
      compliant: compliantCount,
      missing: missingCount,
      lastRefreshed: new Date().toISOString()
    };

    console.log('✅ Compliance cache refreshed:', complianceSummary);

    return NextResponse.json({ 
      success: true,
      message: 'Compliance cache refreshed successfully',
      summary: complianceSummary
    });

  } catch (error) {
    console.error('❌ Error in refresh-compliance-cache route:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh compliance cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 