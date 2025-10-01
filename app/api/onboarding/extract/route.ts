import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const { rawId } = await request.json();

    if (!rawId) {
      return NextResponse.json({ error: 'Raw ID required' }, { status: 400 });
    }

    // Get the raw file record
    const { data: rawFile, error: rawError } = await supabase
      .from('onboarding_raw')
      .select('*')
      .eq('id', rawId)
      .single();

    if (rawError || !rawFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Update status to processing
    await supabase
      .from('onboarding_raw')
      .update({ 
        processing_status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', rawId);

    try {
      // Extract text from file
      const extractedText = await extractTextFromFile(rawFile);
      
      if (!extractedText) {
        throw new Error('Failed to extract text from file');
      }

      // Analyze document type and extract structured data
      const analysisResult = await analyzeDocument(extractedText, rawFile.file_name);

      // Save structured data to staging_structured table
      const { data: structuredData, error: structuredError } = await supabase
        .from('staging_structured')
        .insert({
          raw_id: rawId,
          suggested_table: analysisResult.suggestedTable,
          extraction_method: 'ai_analysis',
          data: analysisResult.extractedData,
          original_text: extractedText,
          confidence: analysisResult.confidence,
          status: 'pending'
        })
        .select()
        .single();

      if (structuredError) {
        throw new Error('Failed to save structured data');
      }

      // Update raw file status to completed
      await supabase
        .from('onboarding_raw')
        .update({ 
          processing_status: 'completed',
          detected_type: analysisResult.detectedType,
          detected_category: analysisResult.category,
          confidence_score: analysisResult.confidence,
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', rawId);

      return NextResponse.json({
        success: true,
        data: {
          rawId,
          structuredId: structuredData.id,
          detectedType: analysisResult.detectedType,
          suggestedTable: analysisResult.suggestedTable,
          confidence: analysisResult.confidence,
          extractedData: analysisResult.extractedData
        }
      });

    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      // Update status to failed
      await supabase
        .from('onboarding_raw')
        .update({ 
          processing_status: 'failed',
          processing_error: processingError.message
        })
        .eq('id', rawId);

      return NextResponse.json({ 
        error: 'Processing failed', 
        details: processingError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Extract API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function extractTextFromFile(rawFile: any): Promise<string> {
  try {
    if (rawFile.file_type === 'application/pdf') {
      // For PDF files, we'll use OCR or PDF text extraction
      // For now, return a structured placeholder that helps AI classification
      return `PDF Document: ${rawFile.file_name}
      
This is a PDF document that requires text extraction. The filename suggests it may contain:
- Lease information (if filename contains "lease")
- Fire Risk Assessment (if filename contains "FRA" or "fire")
- Building information (if filename contains "building")
- Financial data (if filename contains "budget", "account", "demand")

Please analyze the filename and any available metadata to determine the document type and extract relevant information.`;
    }
    
    if (rawFile.file_type === 'text/plain' || rawFile.file_type === 'text/csv') {
      // For text files, fetch and return content
      const response = await fetch(rawFile.file_url);
      const content = await response.text();
      return `Text Document: ${rawFile.file_name}

${content}`;
    }
    
    if (rawFile.file_type.includes('spreadsheet') || rawFile.file_type.includes('excel')) {
      // For Excel files, we'll need to implement proper parsing
      // For now, return structured information based on filename
      return `Spreadsheet Document: ${rawFile.file_name}
      
This is an Excel/CSV spreadsheet. Based on the filename, it likely contains:
- Apportionment data (if filename contains "apportionment", "percentage")
- Service charge demands (if filename contains "demand", "charge", "arrears")
- Budget information (if filename contains "budget", "account")
- Unit information (if filename contains "unit", "flat")

The spreadsheet likely contains tabular data with columns for units, percentages, amounts, or other property management data.`;
    }
    
    if (rawFile.file_type.includes('word') || rawFile.file_type.includes('document')) {
      // For Word documents, we'll need to implement proper parsing
      return `Word Document: ${rawFile.file_name}
      
This is a Word document that may contain:
- Lease agreements (if filename contains "lease")
- Building information (if filename contains "building")
- Compliance documents (if filename contains "compliance", "certificate")
- General property management documentation

Please analyze the filename and document type to extract relevant structured data.`;
    }
    
    // For other file types, provide basic information
    return `Document: ${rawFile.file_name}
Type: ${rawFile.file_type}

This document requires analysis to determine its content type and extract relevant property management data.`;
    
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error(`Failed to extract text from file: ${error.message}`);
  }
}

async function analyzeDocument(text: string, fileName: string) {
  const systemPrompt = `You are an expert at analyzing UK property management documents and extracting structured data for block management.

Your task is to:
1. Determine the document type and identify the target Supabase table
2. Extract structured data in the exact JSON format for that table
3. Provide a confidence score (0.0-1.0)

Available target tables and their expected data formats:

**leases** - Lease documents:
{
  "unit_number": "Flat 2A",
  "lease_type": "residential",
  "start_date": "2023-01-01",
  "end_date": "2250-01-01", 
  "ground_rent": 250,
  "service_charge_percentage": 1.25,
  "restrictions": "No pets, no subletting",
  "permitted_use": "residential only"
}

**building_compliance_assets** - FRA, certificates, compliance docs:
{
  "asset_name": "Fire Risk Assessment",
  "description": "Annual FRA for building safety",
  "last_serviced_date": "2023-01-12",
  "next_service_date": "2024-01-12",
  "status": "current",
  "issues": ["Fire doors wedged", "Missing signage"],
  "contractor_name": "ABC Fire Safety Ltd"
}

**unit_apportionments** - Service charge apportionments (array):
[
  { "unit_number": "Flat A1", "percentage": 1.25 },
  { "unit_number": "Flat A2", "percentage": 1.306 },
  { "unit_number": "Flat B1", "percentage": 1.15 }
]

**ar_demand_headers** - Service charge demands/arrears:
[
  { "unit_number": "Flat A1", "current_charge": 5178.75, "arrears_balance": 21693.05 },
  { "unit_number": "Flat A2", "current_charge": 5405.50, "arrears_balance": 0 }
]

**budgets** - Annual budgets/accounts:
{
  "year": "2025",
  "total_income": 541369,
  "total_expenditure": 542486,
  "categories": {
    "lifts": 10265,
    "gardening": 5297,
    "insurance": 107967,
    "management": 25000
  }
}

**buildings** - Building information:
{
  "building_name": "123 Main Street",
  "address": "123 Main Street, London",
  "postcode": "SW1A 1AA",
  "building_type": "residential",
  "total_units": 12,
  "is_hrb": true
}

**units** - Unit details:
{
  "unit_number": "Flat 2A",
  "unit_type": "flat",
  "floor": 2,
  "bedrooms": 2,
  "bathrooms": 1,
  "square_footage": 850,
  "balcony": true,
  "parking_spaces": 1
}

**leaseholders** - Leaseholder information:
{
  "full_name": "John Smith",
  "email": "john@example.com",
  "phone": "07123456789",
  "address": "123 Main Street, Flat 2A, London SW1A 1AA",
  "is_company": false
}

Return your analysis in this JSON format:
{
  "detectedType": "document_type",
  "category": "legal|compliance|financial|property_info",
  "suggestedTable": "target_table_name",
  "confidence": 0.95,
  "extractedData": {
    // Structured data matching the target table schema exactly
  }
}`;

  const userPrompt = `Analyze this UK property management document:

Filename: ${fileName}

Content:
${text.substring(0, 4000)}

Extract structured data and determine the appropriate target table. Be precise with UK property management terminology and ensure the extracted data matches the expected schema exactly.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 3000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const analysis = JSON.parse(content);
    
    // Validate response structure
    if (!analysis.detectedType || !analysis.suggestedTable || !analysis.extractedData) {
      throw new Error('Invalid analysis response structure');
    }

    // Validate suggested table is allowed
    const allowedTables = [
      'buildings', 'units', 'leaseholders', 'leases', 
      'unit_apportionments', 'building_compliance_assets',
      'ar_demand_headers', 'budgets', 'building_documents'
    ];

    if (!allowedTables.includes(analysis.suggestedTable)) {
      throw new Error(`Invalid suggested table: ${analysis.suggestedTable}`);
    }

    return analysis;

  } catch (error) {
    console.error('AI analysis error:', error);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Check authentication
    const { data: { user }, error: authError } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

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
    const rawId = searchParams.get('rawId');
    const status = searchParams.get('status');
    const suggestedTable = searchParams.get('suggestedTable');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('staging_structured')
      .select(`
        *,
        raw_file:onboarding_raw!staging_structured_raw_id_fkey(
          file_name,
          file_type,
          detected_type,
          building_name,
          processing_status
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (rawId) {
      query = query.eq('raw_id', rawId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (suggestedTable) {
      query = query.eq('suggested_table', suggestedTable);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error fetching extractions:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({
        error: 'Failed to fetch extractions',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('GET extractions error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
