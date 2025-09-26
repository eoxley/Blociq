// Enhanced Knowledge Search - Use existing AI metadata for immediate improvement
// This endpoint creates searchable content from existing AI-extracted metadata

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Creating searchable content from AI metadata...');

    const supabase = createServiceClient();

    // Get documents with AI metadata but no OCR text
    const { data: docs, error: fetchError } = await supabase
      .from('building_documents')
      .select('*')
      .not('metadata', 'is', null)
      .is('ocr_text', null);

    if (fetchError) {
      console.error('❌ Error fetching documents:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch documents',
        details: fetchError.message
      }, { status: 500, headers: CORS_HEADERS });
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json({
        message: 'No documents with AI metadata found',
        processed: 0
      }, { headers: CORS_HEADERS });
    }

    console.log(`📄 Found ${docs.length} documents with AI metadata to process`);

    const results = [];

    for (const doc of docs) {
      try {
        console.log(`🔄 Processing metadata for: ${doc.name}`);

        const aiMetadata = doc.metadata?.ai_extracted;

        if (!aiMetadata) {
          console.log(`⚠️ No AI metadata found for ${doc.name}`);
          results.push({
            id: doc.id,
            name: doc.name,
            status: 'no_metadata',
            error: 'No AI-extracted metadata found'
          });
          continue;
        }

        // Create comprehensive searchable content from AI metadata
        const searchableContent = [
          // Basic info
          doc.name,
          doc.type,
          doc.category,

          // AI-extracted summary and findings
          aiMetadata.summary,
          aiMetadata.document_type,
          aiMetadata.compliance_status,

          // Key findings (very rich data)
          ...(aiMetadata.key_findings?.map(finding =>
            `${finding.location} ${finding.observation} ${finding.action_required} ${finding.classification} ${finding.priority}`
          ) || []),

          // Recommendations (actionable insights)
          ...(aiMetadata.recommendations?.map(rec =>
            `${rec.action} ${rec.reason} ${rec.timeframe} ${rec.regulation_reference}`
          ) || []),

          // Risk assessment
          aiMetadata.risk_assessment?.overall_risk,
          ...(aiMetadata.risk_assessment?.compliance_gaps || []),
          ...(aiMetadata.risk_assessment?.immediate_hazards || []),

          // Property and inspection details
          aiMetadata.property_details?.address,
          aiMetadata.property_details?.description,
          aiMetadata.inspection_details?.inspector_name,
          aiMetadata.inspection_details?.inspector_company,
          aiMetadata.inspection_details?.inspection_date,

          // Regulatory compliance
          ...(aiMetadata.regulatory_compliance?.relevant_regulations || []),
          ...(aiMetadata.regulatory_compliance?.landlord_obligations || []),

          // Additional searchable terms
          aiMetadata.expiry_date,
          aiMetadata.next_review_date,
          doc.metadata?.certificate_number,
          doc.metadata?.inspector_name,
          doc.metadata?.inspection_date

        ].filter(Boolean) // Remove null/undefined values
         .join(' ') // Combine into searchable text
         .replace(/\s+/g, ' ') // Normalize whitespace
         .toLowerCase(); // Make case-insensitive

        console.log(`📚 Created ${searchableContent.length} characters of searchable content for ${doc.name}`);

        // Update database with searchable content
        const { error: updateError } = await supabase
          .from('building_documents')
          .update({
            ocr_text: searchableContent,
            metadata: {
              ...doc.metadata,
              text_extraction: {
                processed_at: new Date().toISOString(),
                method: 'ai-metadata-extraction',
                searchable_length: searchableContent.length,
                sources: ['ai_extracted_data', 'document_metadata']
              }
            }
          })
          .eq('id', doc.id);

        if (updateError) {
          console.error(`❌ Failed to update ${doc.name}:`, updateError);
          results.push({
            id: doc.id,
            name: doc.name,
            status: 'failed',
            error: updateError.message
          });
          continue;
        }

        console.log(`✅ Successfully processed ${doc.name}`);
        results.push({
          id: doc.id,
          name: doc.name,
          status: 'success',
          searchable_length: searchableContent.length,
          preview: searchableContent.substring(0, 200) + '...'
        });

      } catch (error) {
        console.error(`❌ Error processing ${doc.name}:`, error);
        results.push({
          id: doc.id,
          name: doc.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log(`✅ Metadata processing complete: ${successCount} successful, ${failedCount} failed`);

    return NextResponse.json({
      message: 'AI metadata processing complete',
      processed: successCount,
      failed: failedCount,
      total: docs.length,
      results: results
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('❌ Service error:', error);
    return NextResponse.json({
      error: 'Service failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Get enhanced status
    const { data: docs, error } = await supabase
      .from('building_documents')
      .select('id, name, ocr_text, metadata');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
    }

    const total = docs?.length || 0;
    const withOCR = docs?.filter(doc => doc.ocr_text && doc.ocr_text.trim().length > 0).length || 0;
    const withAIMetadata = docs?.filter(doc => doc.metadata?.ai_extracted).length || 0;
    const pending = total - withOCR;

    return NextResponse.json({
      status: 'ready',
      total_documents: total,
      with_searchable_content: withOCR,
      with_ai_metadata: withAIMetadata,
      pending_processing: pending,
      can_enhance_immediately: withAIMetadata - withOCR
    }, { headers: CORS_HEADERS });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: CORS_HEADERS });
  }
}