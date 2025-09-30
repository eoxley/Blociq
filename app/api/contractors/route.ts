import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from('contractors')
      .select(`
        *,
        contractor_documents (
          id,
          document_type,
          document_name,
          expiry_date,
          status
        )
      `)
      .eq('is_active', true)
      .order('company_name');

    if (category) {
      query = query.contains('categories', [category]);
    }

    if (search) {
      query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%`);
    }

    const { data: contractors, error } = await query;

    if (error) {
      console.error('Error fetching contractors:', error);
      return NextResponse.json({
        error: 'Failed to fetch contractors',
        message: error.message
      }, { status: 500 });
    }

    // Add validation status for each contractor
    const contractorsWithStatus = contractors?.map(contractor => {
      const hasValidInsurance = contractor.contractor_documents?.some(
        (doc: any) => doc.document_type === 'insurance' && doc.status === 'valid'
      );
      
      const hasValidRams = contractor.contractor_documents?.some(
        (doc: any) => doc.document_type === 'rams' && doc.status === 'valid'
      );

      return {
        ...contractor,
        validation_status: {
          hasValidInsurance,
          hasValidRams,
          isFullyValid: hasValidInsurance && hasValidRams
        }
      };
    });

    return NextResponse.json({
      success: true,
      contractors: contractorsWithStatus || []
    });

  } catch (error) {
    console.error('Error in contractors GET:', error);
    return NextResponse.json({
      error: 'Failed to fetch contractors',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const {
      company_name,
      contact_name,
      email,
      phone,
      address,
      vat_number,
      bank_account_number,
      bank_sort_code,
      categories
    } = body;

    // Validate required fields
    if (!company_name || !categories?.length) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'company_name and categories are required'
      }, { status: 400 });
    }

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Generate contractor number
    const { data: lastContractor } = await supabase
      .from('contractors')
      .select('contractor_number')
      .like('contractor_number', 'CTR-%')
      .order('contractor_number', { ascending: false })
      .limit(1)
      .single();

    const lastNumber = lastContractor?.contractor_number?.split('-')[1] || '0000';
    const newNumber = `CTR-${String(parseInt(lastNumber) + 1).padStart(4, '0')}`;

    // Create contractor
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .insert({
        contractor_number: newNumber,
        company_name,
        contact_name,
        email,
        phone,
        address,
        vat_number,
        bank_account_number,
        bank_sort_code,
        categories
      })
      .select()
      .single();

    if (contractorError) {
      console.error('Error creating contractor:', contractorError);
      return NextResponse.json({
        error: 'Failed to create contractor',
        message: contractorError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contractor created successfully',
      contractor: contractor
    });

  } catch (error) {
    console.error('Error in contractors POST:', error);
    return NextResponse.json({
      error: 'Failed to create contractor',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
