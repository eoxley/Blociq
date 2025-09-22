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
      leaseholderName: leaseholderName ? `${leaseholderName.substring(0, 20)}...` : null,
      userId: user.id
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
    console.log(`🏢 Checking building access for buildingId: ${buildingId}, userId: ${user.id}`);

    // Try to fetch building with created_by column, fallback if column doesn't exist
    let building: any = null;
    let buildingError: any = null;

    try {
      const result = await supabase
        .from('buildings')
        .select('id, name, created_by')
        .eq('id', buildingId)
        .single();

      building = result.data;
      buildingError = result.error;
    } catch (error: any) {
      // If created_by column doesn't exist, try without it
      if (error?.code === '42703' || error?.message?.includes('created_by')) {
        console.log('🔄 created_by column missing, trying without it...');
        const fallbackResult = await supabase
          .from('buildings')
          .select('id, name')
          .eq('id', buildingId)
          .single();

        building = fallbackResult.data ? { ...fallbackResult.data, created_by: null } : null;
        buildingError = fallbackResult.error;
      } else {
        buildingError = error;
      }
    }

    console.log('🏢 Building query result:', { building, buildingError });

    if (buildingError || !building) {
      console.error('❌ Building not found or access denied:', {
        buildingId,
        userId: user.id,
        error: buildingError?.message,
        code: buildingError?.code
      });

      // Check if this might be a production building ID being used in development
      const isPossibleProdId = buildingId && buildingId.includes('-') && buildingId.length > 30;
      const suggestionMessage = isPossibleProdId
        ? ' This appears to be a production building ID. Please use a building ID from your local development database.'
        : '';

      return NextResponse.json({
        error: 'Building not found',
        message: `The specified building could not be found. Building ID: ${buildingId}${suggestionMessage}`,
        debug: {
          buildingId,
          userId: user.id,
          errorCode: buildingError?.code,
          errorMessage: buildingError?.message,
          isPossibleProdId,
          suggestion: isPossibleProdId ? 'Use a building ID from your local development database' : 'Verify the building ID is correct'
        }
      }, { status: 404 });
    }

    // Check if user has access to this building
    console.log(`🔐 Checking building access for userId: ${user.id}, buildingId: ${buildingId}`);

    const { data: buildingAccess, error: accessError } = await supabase
      .from('building_access')
      .select('role')
      .eq('building_id', buildingId)
      .eq('user_id', user.id)
      .single();

    console.log('🔐 Building access query result:', { buildingAccess, accessError });

    const isCreatedBy = building.created_by === user.id;
    const hasAccessRole = buildingAccess && ['owner', 'manager', 'agent'].includes(buildingAccess.role);
    // If created_by is null (column missing), allow access for development
    const fallbackAccess = building.created_by === null;

    // Development mode: allow access for testing
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

    // Allow access if user is the creator, has a role, or in development mode
    const hasAccess = isCreatedBy || hasAccessRole || fallbackAccess || isDevelopment;

    console.log('🔐 Access check results:', {
      isCreatedBy,
      hasAccessRole,
      fallbackAccess,
      isDevelopment,
      hasAccess,
      buildingCreatedBy: building.created_by,
      userId: user.id,
      userRole: buildingAccess?.role,
      nodeEnv: process.env.NODE_ENV
    });

    if (!hasAccess) {
      console.error('❌ Access denied for building link:', {
        userId: user.id,
        buildingId,
        buildingCreatedBy: building.created_by,
        userRole: buildingAccess?.role
      });

      return NextResponse.json({
        error: 'Access denied',
        message: 'You do not have permission to link leases to this building.',
        debug: {
          userId: user.id,
          buildingId,
          buildingCreatedBy: building.created_by,
          userRole: buildingAccess?.role,
          isCreatedBy,
          hasAccessRole,
          isDevelopment,
          nodeEnv: process.env.NODE_ENV
        }
      }, { status: 403 });
    }

    // Note: Unit verification removed as we're not using unit_id in the schema

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
      .single();

    if (existingLease) {
      return NextResponse.json({
        error: 'Lease already exists',
        message: `A lease already exists for this building.`
      }, { status: 409 });
    }

    // Create the lease record using actual schema fields
    const leaseData = {
      building_id: buildingId,
      unit_number: unitId ? `Unit ${unitId}` : 'Building-wide',
      leaseholder_name: extractedLeaseholderName || 'Unknown Leaseholder',
      start_date: extractedLeaseStart ? new Date(extractedLeaseStart + '-01-01').toISOString().split('T')[0] : null,
      end_date: extractedLeaseEnd ? new Date(extractedLeaseEnd + '-12-31').toISOString().split('T')[0] : null,
      status: 'active',
      ground_rent: extractedGroundRent || 'Not specified',
      service_charge_percentage: extractedApportionment ? parseFloat(extractedApportionment) : null,
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
      file_path: `lease-lab/${documentJobId}.pdf`,
      ocr_text: documentJob.filename,
      metadata: {
        created_from_job: documentJobId,
        original_filename: documentJob.filename,
        extraction_quality: finalAnalysisJson.disclaimer ? 'ai_generated' : 'unknown',
        linked_at: new Date().toISOString(),
        document_job_id: documentJobId
      }
    };

    const { data: newLease, error: createError } = await supabase
      .from('leases')
      .insert(leaseData)
      .select(`
        id,
        building_id,
        unit_number,
        leaseholder_name,
        start_date,
        end_date,
        ground_rent,
        service_charge_percentage,
        status,
        created_at,
        buildings!inner(name)
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
      building: newLease.buildings.name,
      unit: newLease.unit_number || 'Building-wide'
    });

    return NextResponse.json({
      success: true,
      lease: newLease,
      message: `Lease successfully linked to building`
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
        unit_number,
        leaseholder_name,
        start_date,
        end_date,
        ground_rent,
        service_charge_percentage,
        status,
        created_at,
        updated_at,
        buildings!inner(name, address)
      `)
      .order('created_at', { ascending: false });

    if (buildingId) {
      query = query.eq('building_id', buildingId);
    }

    // Note: unitId and scope filters removed as these fields don't exist in the schema

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