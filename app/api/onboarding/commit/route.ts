import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { structuredIds } = await request.json();

    if (!structuredIds || !Array.isArray(structuredIds) || structuredIds.length === 0) {
      return NextResponse.json({ error: 'Structured IDs array required' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // Process each structured record
    for (const structuredId of structuredIds) {
      try {
        // Get the structured record
        const { data: structuredRecord, error: recordError } = await supabase
          .from('staging_structured')
          .select('*')
          .eq('id', structuredId)
          .single();

        if (recordError || !structuredRecord) {
          errors.push({ structuredId, error: 'Record not found' });
          continue;
        }

        // Check if already committed
        if (structuredRecord.committed_to_production) {
          errors.push({ structuredId, error: 'Already committed to production' });
          continue;
        }

        // Check if status is accepted
        if (structuredRecord.status !== 'accepted') {
          errors.push({ structuredId, error: 'Record must be accepted before committing' });
          continue;
        }

        // Commit to production table
        const commitResult = await commitToProduction(structuredRecord, supabase);
        
        if (commitResult.success) {
          // Update staging_structured status
          const { error: updateError } = await supabase
            .from('staging_structured')
            .update({
              committed_to_production: true,
              production_table_id: commitResult.productionId,
              committed_at: new Date().toISOString(),
              committed_by: user.id
            })
            .eq('id', structuredId);

          if (updateError) {
            errors.push({ structuredId, error: `Failed to update staging record: ${updateError.message}` });
          } else {
            results.push({
              structuredId,
              success: true,
              productionTable: structuredRecord.suggested_table,
              productionId: commitResult.productionId
            });
          }
        } else {
          errors.push({ structuredId, error: commitResult.error });
        }

      } catch (error) {
        console.error(`Error processing structured record ${structuredId}:`, error);
        errors.push({ structuredId, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: structuredIds.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('Commit API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function commitToProduction(structuredRecord: any, supabase: any, userId: string) {
  try {
    const { suggested_table, data, raw_id } = structuredRecord;
    
    // Get building_id from the raw file record
    const { data: rawFile, error: rawError } = await supabase
      .from('onboarding_raw')
      .select('building_id, agency_id')
      .eq('id', raw_id)
      .single();

    if (rawError) {
      return { success: false, error: `Failed to get building context: ${rawError.message}` };
    }

    const building_id = rawFile.building_id;
    const agency_id = rawFile.agency_id;

    let result: any;

    // Route to specific commit handlers based on suggested_table
    switch (suggested_table) {
      case 'leases':
        result = await handleLeaseCommit(data, building_id, agency_id, supabase);
        break;
      case 'building_compliance_assets':
        result = await handleFRACommit(data, building_id, agency_id, supabase);
        break;
      case 'unit_apportionments':
        result = await handleApportionmentCommit(data, building_id, agency_id, supabase);
        break;
      case 'ar_demand_headers':
        result = await handleDemandsCommit(data, building_id, agency_id, supabase);
        break;
      case 'budgets':
        result = await handleBudgetCommit(data, building_id, agency_id, supabase);
        break;
      case 'buildings':
        result = await handleBuildingCommit(data, agency_id, supabase);
        break;
      case 'units':
        result = await handleUnitCommit(data, building_id, agency_id, supabase);
        break;
      case 'leaseholders':
        result = await handleLeaseholderCommit(data, agency_id, supabase);
        break;
      default:
        return { success: false, error: `Unsupported table type: ${suggested_table}` };
    }

    if (!result.success) {
      return result;
    }

    // Log the commit to audit_log
    await supabase.from('audit_log').insert({
      staging_id: structuredRecord.id,
      user_id: userId,
      action: 'commit_to_production',
      table_name: suggested_table,
      record_id: result.productionId,
      timestamp: new Date().toISOString(),
      status: 'success',
      details: {
        building_id,
        agency_id,
        data_keys: Object.keys(data)
      }
    });

    return {
      success: true,
      productionId: result.productionId,
      data: result.data,
      auditLogId: result.auditLogId
    };

  } catch (error) {
    console.error('Commit to production error:', error);
    
    // Log failed commit attempt
    try {
      await supabase.from('audit_log').insert({
        staging_id: structuredRecord.id,
        user_id: userId,
        action: 'commit_to_production',
        table_name: structuredRecord.suggested_table,
        timestamp: new Date().toISOString(),
        status: 'failed',
        details: { error: error.message }
      });
    } catch (logError) {
      console.error('Failed to log audit entry:', logError);
    }

    return { success: false, error: error.message };
  }
}

function cleanDataForTable(data: any, tableName: string): any {
  // Remove any fields that shouldn't be in the production table
  const cleaned = { ...data };
  
  // Remove system fields that might be in the extracted data
  delete cleaned.id;
  delete cleaned.created_at;
  delete cleaned.updated_at;
  
  // Table-specific cleaning and validation
  switch (tableName) {
    case 'buildings':
      // Ensure required fields have defaults
      if (!cleaned.building_type) cleaned.building_type = 'residential';
      if (cleaned.is_hrb === undefined) cleaned.is_hrb = false;
      if (cleaned.is_active === undefined) cleaned.is_active = true;
      break;
      
    case 'units':
      // Ensure required fields
      if (!cleaned.unit_type) cleaned.unit_type = 'flat';
      if (cleaned.balcony === undefined) cleaned.balcony = false;
      if (cleaned.parking_spaces === undefined) cleaned.parking_spaces = 0;
      if (cleaned.is_let === undefined) cleaned.is_let = true;
      break;
      
    case 'leaseholders':
      // Ensure required fields
      if (!cleaned.preferred_contact_method) cleaned.preferred_contact_method = 'email';
      if (cleaned.is_company === undefined) cleaned.is_company = false;
      if (cleaned.is_director === undefined) cleaned.is_director = false;
      break;
      
    case 'leases':
      // Ensure required fields
      if (!cleaned.lease_type) cleaned.lease_type = 'residential';
      if (cleaned.subletting_permitted === undefined) cleaned.subletting_permitted = false;
      if (cleaned.pets_permitted === undefined) cleaned.pets_permitted = false;
      if (cleaned.lease_plan_attached === undefined) cleaned.lease_plan_attached = false;
      break;
      
    case 'unit_apportionments':
      // Ensure required fields
      if (!cleaned.apportionment_type) cleaned.apportionment_type = 'service_charge';
      if (!cleaned.percentage) cleaned.percentage = 0;
      if (!cleaned.effective_from) cleaned.effective_from = new Date().toISOString().split('T')[0];
      break;
      
    case 'building_compliance_assets':
      // Ensure required fields
      if (!cleaned.status) cleaned.status = 'pending';
      break;

    case 'ar_demand_headers':
      // Ensure required fields
      if (!cleaned.status) cleaned.status = 'pending';
      if (!cleaned.demand_date) cleaned.demand_date = new Date().toISOString().split('T')[0];
      if (cleaned.total_amount === undefined) cleaned.total_amount = 0;
      break;

    case 'budgets':
      // Ensure required fields
      if (!cleaned.year) cleaned.year = new Date().getFullYear().toString();
      if (!cleaned.version) cleaned.version = '1.0';
      if (!cleaned.status) cleaned.status = 'draft';
      if (cleaned.total_income === undefined) cleaned.total_income = 0;
      if (cleaned.total_expenditure === undefined) cleaned.total_expenditure = 0;
      break;

    case 'building_documents':
      // Ensure required fields
      if (!cleaned.category) cleaned.category = 'general';
      if (cleaned.is_public === undefined) cleaned.is_public = false;
      break;

    case 'clients':
      // Ensure required fields
      if (!cleaned.client_type) cleaned.client_type = 'freeholder';
      break;

    case 'rmc_directors':
      // Ensure required fields
      if (cleaned.is_active === undefined) cleaned.is_active = true;
      break;
  }
  
  return cleaned;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const committed = searchParams.get('committed');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query for committed records
    let query = supabase
      .from('staging_structured')
      .select(`
        *,
        raw_file:onboarding_raw!staging_structured_raw_id_fkey(
          file_name,
          file_type,
          detected_type,
          building_name,
          batch:onboarding_batches!onboarding_raw_batch_id_fkey(batch_name)
        ),
        committed_by_user:profiles!staging_structured_committed_by_fkey(first_name, last_name)
      `)
      .eq('committed_to_production', committed === 'true' ? true : false)
      .order('committed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (batchId) {
      query = query.eq('raw_file.batch_id', batchId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch committed records' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('GET commits error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
