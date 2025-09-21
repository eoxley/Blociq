import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to link leases'
      }, { status: 401 });
    }

    const user = session.user;
    const body = await req.json();

    const {
      documentJobId,
      buildingId,
      unitId = null,
      scope = 'unit',
      leaseholderName = null,
      leaseStart = null,
      leaseEnd = null,
      apportionment = null,
      groundRent = null,
      analysisJson = null
    } = body;

    console.log('🔗 Linking lease:', {
      documentJobId,
      buildingId,
      unitId,
      scope,
      leaseholderName: leaseholderName ? `${leaseholderName.substring(0, 20)}...` : null
    });

    // Validate required fields
    if (!documentJobId || !buildingId) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'documentJobId and buildingId are required'
      }, { status: 400 });
    }

    // Validate scope
    if (!['building', 'unit'].includes(scope)) {
      return NextResponse.json({
        error: 'Invalid scope',
        message: 'Scope must be either "building" or "unit"'
      }, { status: 400 });
    }

    // If scope is unit, unitId is required
    if (scope === 'unit' && !unitId) {
      return NextResponse.json({
        error: 'Unit ID required',
        message: 'unitId is required when scope is "unit"'
      }, { status: 400 });
    }

    // Get the document job to extract analysis data if not provided
    const { data: documentJob, error: jobError } = await supabase
      .from('document_jobs')
      .select('id, filename, summary_json, user_id')
      .eq('id', documentJobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !documentJob) {
      return NextResponse.json({
        error: 'Document job not found',
        message: 'The document job could not be found or you do not have permission to access it.'
      }, { status: 404 });
    }

    // Verify user has access to the building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, created_by')
      .eq('id', buildingId)
      .single();

    if (buildingError || !building) {
      return NextResponse.json({
        error: 'Building not found',
        message: 'The specified building could not be found.'
      }, { status: 404 });
    }

    // Check if user has access to this building
    const { data: buildingAccess } = await supabase
      .from('building_access')
      .select('role')
      .eq('building_id', buildingId)
      .eq('user_id', user.id)
      .single();

    const hasAccess = building.created_by === user.id ||
                     (buildingAccess && ['owner', 'manager'].includes(buildingAccess.role));

    if (!hasAccess) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'You do not have permission to link leases to this building.'
      }, { status: 403 });
    }

    // If unitId is provided, verify it exists and belongs to the building
    if (unitId) {
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .select('id, unit_number, building_id')
        .eq('id', unitId)
        .eq('building_id', buildingId)
        .single();

      if (unitError || !unit) {
        return NextResponse.json({
          error: 'Unit not found',
          message: 'The specified unit could not be found in this building.'
        }, { status: 404 });
      }
    }

    // Extract analysis data from document job if not provided
    const finalAnalysisJson = analysisJson || documentJob.summary_json || {};

    // Extract key information from analysis if not explicitly provided
    const extractedLeaseStart = leaseStart ||
      finalAnalysisJson.basic_property_details?.lease_term?.match(/(\d{4})/)?.[1] ||
      null;

    const extractedLeaseEnd = leaseEnd ||
      finalAnalysisJson.basic_property_details?.lease_term?.match(/(\d{4}).*?(\d{4})/)?.[2] ||
      null;

    const extractedLeaseholderName = leaseholderName ||
      finalAnalysisJson.basic_property_details?.parties?.find((p: string) =>
        p.toLowerCase().includes('lessee')
      )?.replace(/^Lessee:\s*/i, '') ||
      null;

    const extractedApportionment = apportionment ||
      finalAnalysisJson.detailed_sections?.find((s: any) =>
        s.section_title?.toLowerCase().includes('service charge')
      )?.content?.find((c: string) => c.match(/(\d+\.?\d*)%/))?.match(/(\d+\.?\d*)%/)?.[1] ||
      null;

    const extractedGroundRent = groundRent ||
      finalAnalysisJson.detailed_sections?.find((s: any) =>
        s.section_title?.toLowerCase().includes('ground rent')
      )?.content?.[0] ||
      null;

    // Check for existing lease for this building/unit combination
    const { data: existingLease } = await supabase
      .from('leases')
      .select('id')
      .eq('building_id', buildingId)
      .eq('unit_id', unitId)
      .eq('scope', scope)
      .single();

    if (existingLease) {
      return NextResponse.json({
        error: 'Lease already exists',
        message: `A lease already exists for this ${scope === 'building' ? 'building' : 'unit'}.`
      }, { status: 409 });
    }

    // Create the lease record
    const leaseData = {
      building_id: buildingId,
      unit_id: unitId,
      scope: scope,
      unit_number: unitId ? null : 'Building-wide', // Will be updated if unit info is available
      leaseholder_name: extractedLeaseholderName,
      start_date: extractedLeaseStart ? new Date(extractedLeaseStart + '-01-01').toISOString().split('T')[0] : null,
      end_date: extractedLeaseEnd ? new Date(extractedLeaseEnd + '-12-31').toISOString().split('T')[0] : null,
      ground_rent: extractedGroundRent,
      apportionment: extractedApportionment ? parseFloat(extractedApportionment) : null,
      service_charge_apportionment: extractedApportionment ? parseFloat(extractedApportionment) : null,
      analysis_json: finalAnalysisJson,
      document_job_id: documentJobId,
      file_path: `lease-lab/${documentJobId}.pdf`, // Assuming PDF format
      responsibilities: finalAnalysisJson.detailed_sections?.filter((s: any) =>
        s.section_title?.toLowerCase().includes('responsibilities')
      ).map((s: any) => s.content).flat() || [],
      restrictions: finalAnalysisJson.detailed_sections?.filter((s: any) =>
        s.section_title?.toLowerCase().includes('restrictions') ||
        s.section_title?.toLowerCase().includes('use restrictions')
      ).map((s: any) => s.content).flat() || [],
      rights: finalAnalysisJson.detailed_sections?.filter((s: any) =>
        s.section_title?.toLowerCase().includes('rights') ||
        s.section_title?.toLowerCase().includes('access')
      ).map((s: any) => s.content).flat() || [],
      metadata: {
        created_from_job: documentJobId,
        original_filename: documentJob.filename,
        extraction_quality: finalAnalysisJson.disclaimer ? 'ai_generated' : 'unknown',
        linked_at: new Date().toISOString()
      }
    };

    const { data: newLease, error: createError } = await supabase
      .from('leases')
      .insert(leaseData)
      .select(`
        id,
        building_id,
        unit_id,
        scope,
        leaseholder_name,
        start_date,
        end_date,
        apportionment,
        ground_rent,
        created_at,
        buildings!inner(name),
        units(unit_number)
      `)
      .single();

    if (createError) {
      console.error('❌ Failed to create lease:', createError);
      return NextResponse.json({
        error: 'Failed to create lease',
        message: createError.message
      }, { status: 500 });
    }

    console.log('✅ Lease created successfully:', {
      id: newLease.id,
      scope: newLease.scope,
      building: newLease.buildings.name,
      unit: newLease.units?.unit_number || 'Building-wide'
    });

    return NextResponse.json({
      success: true,
      lease: newLease,
      message: `Lease successfully linked to ${scope === 'building' ? 'building' : 'unit'}`
    });

  } catch (error) {
    console.error('❌ Error linking lease:', error);
    return NextResponse.json({
      error: 'Failed to link lease',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    const unitId = searchParams.get('unitId');
    const scope = searchParams.get('scope');

    let query = supabase
      .from('leases')
      .select(`
        id,
        building_id,
        unit_id,
        scope,
        leaseholder_name,
        start_date,
        end_date,
        apportionment,
        ground_rent,
        status,
        created_at,
        updated_at,
        buildings!inner(name, address),
        units(unit_number, floor)
      `)
      .order('created_at', { ascending: false });

    if (buildingId) {
      query = query.eq('building_id', buildingId);
    }

    if (unitId) {
      query = query.eq('unit_id', unitId);
    }

    if (scope) {
      query = query.eq('scope', scope);
    }

    const { data: leases, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Failed to fetch leases:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch leases',
        message: fetchError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      leases: leases || []
    });

  } catch (error) {
    console.error('❌ Error fetching leases:', error);
    return NextResponse.json({
      error: 'Failed to fetch leases',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}