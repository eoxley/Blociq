import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface ComplianceAssetReminder {
  building_id: string;
  building_name: string;
  asset_id: string;
  asset_name: string;
  asset_category: string | null;
  next_due_date: string;
  status: 'Overdue' | 'Due Soon';
  days_until_due: number;
  last_updated: string;
}

interface ComplianceDocumentReminder {
  building_id: string;
  building_name: string;
  doc_id: string;
  doc_type: string | null;
  expiry_date: string;
  status: 'Expired' | 'Expiring Soon';
  days_until_expiry: number;
  start_date: string | null;
}

interface ReminderResponse {
  overdue_assets: ComplianceAssetReminder[];
  due_soon_assets: ComplianceAssetReminder[];
  expired_documents: ComplianceDocumentReminder[];
  expiring_documents: ComplianceDocumentReminder[];
  summary: {
    total_overdue_assets: number;
    total_due_soon_assets: number;
    total_expired_documents: number;
    total_expiring_documents: number;
    total_buildings_affected: number;
    critical_items: number;
  };
  generated_at: string;
}

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  
  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Scan building_compliance_assets for overdue and due soon items
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        next_due_date,
        last_updated,
        buildings (
          id,
          name
        ),
        compliance_assets (
          id,
          name,
          category
        )
      `)
      .not('next_due_date', 'is', null)
      .order('next_due_date', { ascending: true });

    if (assetsError) {
      console.error('Error fetching compliance assets:', assetsError);
      return NextResponse.json({ 
        error: 'Failed to fetch compliance assets',
        details: assetsError.message 
      }, { status: 500 });
    }

    // 2. Scan compliance_documents for expired and expiring items
    const { data: complianceDocs, error: docsError } = await supabase
      .from('compliance_docs')
      .select(`
        id,
        building_id,
        doc_type,
        expiry_date,
        start_date,
        buildings (
          id,
          name
        )
      `)
      .not('expiry_date', 'is', null)
      .order('expiry_date', { ascending: true });

    if (docsError) {
      console.error('Error fetching compliance documents:', docsError);
      return NextResponse.json({ 
        error: 'Failed to fetch compliance documents',
        details: docsError.message 
      }, { status: 500 });
    }

    // Process compliance assets
    const overdueAssets: ComplianceAssetReminder[] = [];
    const dueSoonAssets: ComplianceAssetReminder[] = [];

    complianceAssets?.forEach(asset => {
      if (!asset.next_due_date || !asset.buildings || !asset.compliance_assets) return;

      const dueDate = new Date(asset.next_due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const reminderItem: ComplianceAssetReminder = {
        building_id: asset.building_id,
        building_name: asset.buildings.name,
        asset_id: asset.asset_id,
        asset_name: asset.compliance_assets.name,
        asset_category: asset.compliance_assets.category,
        next_due_date: asset.next_due_date,
        status: dueDate < today ? 'Overdue' : 'Due Soon',
        days_until_due: daysUntilDue,
        last_updated: asset.last_updated
      };

      if (dueDate < today) {
        overdueAssets.push(reminderItem);
      } else if (dueDate <= thirtyDaysFromNow) {
        dueSoonAssets.push(reminderItem);
      }
    });

    // Process compliance documents
    const expiredDocuments: ComplianceDocumentReminder[] = [];
    const expiringDocuments: ComplianceDocumentReminder[] = [];

    complianceDocs?.forEach(doc => {
      if (!doc.expiry_date || !doc.buildings) return;

      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const reminderItem: ComplianceDocumentReminder = {
        building_id: doc.building_id,
        building_name: doc.buildings.name,
        doc_id: doc.id,
        doc_type: doc.doc_type,
        expiry_date: doc.expiry_date,
        status: expiryDate < today ? 'Expired' : 'Expiring Soon',
        days_until_expiry: daysUntilExpiry,
        start_date: doc.start_date
      };

      if (expiryDate < today) {
        expiredDocuments.push(reminderItem);
      } else if (expiryDate <= thirtyDaysFromNow) {
        expiringDocuments.push(reminderItem);
      }
    });

    // Calculate summary statistics
    const allBuildings = new Set([
      ...overdueAssets.map(item => item.building_id),
      ...dueSoonAssets.map(item => item.building_id),
      ...expiredDocuments.map(item => item.building_id),
      ...expiringDocuments.map(item => item.building_id)
    ]);

    const criticalItems = overdueAssets.length + expiredDocuments.length;

    const summary = {
      total_overdue_assets: overdueAssets.length,
      total_due_soon_assets: dueSoonAssets.length,
      total_expired_documents: expiredDocuments.length,
      total_expiring_documents: expiringDocuments.length,
      total_buildings_affected: allBuildings.size,
      critical_items: criticalItems
    };

    const response: ReminderResponse = {
      overdue_assets: overdueAssets,
      due_soon_assets: dueSoonAssets,
      expired_documents: expiredDocuments,
      expiring_documents: expiringDocuments,
      summary,
      generated_at: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in compliance reminder check:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint for custom reminder checks with specific date ranges
export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { 
      dueSoonDays = 30, 
      expiringSoonDays = 30,
      buildingIds = null,
      categories = null 
    } = await req.json();

    const today = new Date();
    const dueSoonDate = new Date(today.getTime() + dueSoonDays * 24 * 60 * 60 * 1000);
    const expiringSoonDate = new Date(today.getTime() + expiringSoonDays * 24 * 60 * 60 * 1000);

    // Build query with optional filters
    let assetsQuery = supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        next_due_date,
        last_updated,
        buildings (
          id,
          name
        ),
        compliance_assets (
          id,
          name,
          category
        )
      `)
      .not('next_due_date', 'is', null);

    let docsQuery = supabase
      .from('compliance_docs')
      .select(`
        id,
        building_id,
        doc_type,
        expiry_date,
        start_date,
        buildings (
          id,
          name
        )
      `)
      .not('expiry_date', 'is', null);

    // Apply building filter if specified
    if (buildingIds && buildingIds.length > 0) {
      assetsQuery = assetsQuery.in('building_id', buildingIds);
      docsQuery = docsQuery.in('building_id', buildingIds);
    }

    const responses = await Promise.all([
      assetsQuery.order('next_due_date', { ascending: true }),
      docsQuery.order('expiry_date', { ascending: true })
    ]);

    // Safe destructuring with fallback
    const [assetsResult, docsResult] = responses || [{}, {}];

    if (assetsResult.error) {
      throw new Error(`Assets query error: ${assetsResult.error.message}`);
    }

    if (docsResult.error) {
      throw new Error(`Documents query error: ${docsResult.error.message}`);
    }

    // Process results with custom date ranges
    const overdueAssets: ComplianceAssetReminder[] = [];
    const dueSoonAssets: ComplianceAssetReminder[] = [];
    const expiredDocuments: ComplianceDocumentReminder[] = [];
    const expiringDocuments: ComplianceDocumentReminder[] = [];

    // Process assets
    assetsResult.data?.forEach(asset => {
      if (!asset.next_due_date || !asset.buildings || !asset.compliance_assets) return;

      // Apply category filter if specified
      if (categories && categories.length > 0 && !categories.includes(asset.compliance_assets.category)) {
        return;
      }

      const dueDate = new Date(asset.next_due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const reminderItem: ComplianceAssetReminder = {
        building_id: asset.building_id,
        building_name: asset.buildings.name,
        asset_id: asset.asset_id,
        asset_name: asset.compliance_assets.name,
        asset_category: asset.compliance_assets.category,
        next_due_date: asset.next_due_date,
        status: dueDate < today ? 'Overdue' : 'Due Soon',
        days_until_due: daysUntilDue,
        last_updated: asset.last_updated
      };

      if (dueDate < today) {
        overdueAssets.push(reminderItem);
      } else if (dueDate <= dueSoonDate) {
        dueSoonAssets.push(reminderItem);
      }
    });

    // Process documents
    docsResult.data?.forEach(doc => {
      if (!doc.expiry_date || !doc.buildings) return;

      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const reminderItem: ComplianceDocumentReminder = {
        building_id: doc.building_id,
        building_name: doc.buildings.name,
        doc_id: doc.id,
        doc_type: doc.doc_type,
        expiry_date: doc.expiry_date,
        status: expiryDate < today ? 'Expired' : 'Expiring Soon',
        days_until_expiry: daysUntilExpiry,
        start_date: doc.start_date
      };

      if (expiryDate < today) {
        expiredDocuments.push(reminderItem);
      } else if (expiryDate <= expiringSoonDate) {
        expiringDocuments.push(reminderItem);
      }
    });

    // Calculate summary
    const allBuildings = new Set([
      ...overdueAssets.map(item => item.building_id),
      ...dueSoonAssets.map(item => item.building_id),
      ...expiredDocuments.map(item => item.building_id),
      ...expiringDocuments.map(item => item.building_id)
    ]);

    const summary = {
      total_overdue_assets: overdueAssets.length,
      total_due_soon_assets: dueSoonAssets.length,
      total_expired_documents: expiredDocuments.length,
      total_expiring_documents: expiringDocuments.length,
      total_buildings_affected: allBuildings.size,
      critical_items: overdueAssets.length + expiredDocuments.length,
      filters_applied: {
        dueSoonDays,
        expiringSoonDays,
        buildingIds: buildingIds || 'all',
        categories: categories || 'all'
      }
    };

    const response: ReminderResponse = {
      overdue_assets: overdueAssets,
      due_soon_assets: dueSoonAssets,
      expired_documents: expiredDocuments,
      expiring_documents: expiringDocuments,
      summary,
      generated_at: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in custom compliance reminder check:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 