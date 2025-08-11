import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { extractDocumentText, truncateText } from '@/utils/extractDoc';
import { analyzeDocumentIntake } from '@/utils/ai/intake';
import { DocumentIntakeSchema, createDefaultDocumentIntake } from '@/lib/zod/documentIntake';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const buildingHint = formData.get('building_hint') as string | null;
    const buildingId = formData.get('building_id') as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Extract text from document
    const extractionResult = await extractDocumentText(file, file.name);
    
    // If no text extracted and OCR was tried, return default result
    if (!extractionResult.text && extractionResult.ocrTried) {
      const defaultResult = createDefaultDocumentIntake(file.name);
      return NextResponse.json({
        ok: true,
        data: defaultResult,
        storage: null,
        building_id: buildingId
      });
    }

    // Upload file to Supabase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `uploads/${session.user.id}/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('building_documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('File upload failed:', uploadError);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

    // Analyze document with AI
    const truncatedText = truncateText(extractionResult.text);
    const aiResult = await analyzeDocumentIntake({
      file_name: file.name,
      page_count: extractionResult.pageCount,
      extracted_text: truncatedText,
      building_hint: buildingHint,
      meta: {
        contentType: file.type,
        size: file.size
      }
    });

    // Validate AI result with Zod
    const validationResult = DocumentIntakeSchema.safeParse(aiResult);
    if (!validationResult.success) {
      console.error('AI result validation failed:', validationResult.error);
      
      // In development, return validation errors for debugging
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          error: 'AI result validation failed',
          validationErrors: validationResult.error.errors,
          rawResult: aiResult
        }, { status: 422 });
      }
      
      // In production, return default result
      const defaultResult = createDefaultDocumentIntake(file.name);
      defaultResult.blocking_issues.push('AI result validation failed');
      
      return NextResponse.json({
        ok: true,
        data: defaultResult,
        storage: { path: filePath },
        building_id: buildingId
      });
    }

    const validatedResult = validationResult.data;

    // Try to match building if not provided
    let finalBuildingId = buildingId;
    if (!finalBuildingId && validatedResult.building_name) {
      const { data: buildings } = await supabase
        .from('buildings')
        .select('id, name, postcode')
        .or(`name.ilike.%${validatedResult.building_name}%,postcode.eq.${validatedResult.building_postcode}`)
        .limit(1);
      
      if (buildings?.[0]) {
        finalBuildingId = buildings[0].id;
      }
    }

    // Save to database
    const { data: dbResult, error: dbError } = await supabase
      .from('building_documents')
      .insert({
        building_id: finalBuildingId,
        file_path: filePath,
        file_name: file.name,
        content_type: file.type,
        page_count: extractionResult.pageCount,
        classification: validatedResult.classification,
        suggested_category: validatedResult.suggested_category,
        suggested_table: validatedResult.suggested_table,
        suggested_compliance_asset_key: validatedResult.suggested_compliance_asset_key,
        inspection_or_issue_date: validatedResult.inspection_or_issue_date,
        next_due_date: validatedResult.next_due_date,
        source_confidence: validatedResult.source_confidence,
        ai_json: validatedResult,
        user_id: session.user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database save failed:', dbError);
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
    }

    // Create reminder if next_due_date is present
    if (validatedResult.next_due_date) {
      try {
        await supabase
          .from('reminders')
          .insert({
            user_id: session.user.id,
            building_id: finalBuildingId,
            title: `Document due: ${validatedResult.document_title}`,
            description: `Document ${validatedResult.document_title} is due on ${validatedResult.next_due_date}`,
            due_date: validatedResult.next_due_date,
            type: 'document_due',
            metadata: {
              document_id: dbResult.id,
              classification: validatedResult.classification
            }
          });
      } catch (reminderError) {
        console.error('Failed to create reminder:', reminderError);
        // Don't fail the whole request for reminder creation
      }
    }

    return NextResponse.json({
      ok: true,
      data: validatedResult,
      storage: { path: filePath },
      building_id: finalBuildingId,
      document_id: dbResult.id
    });

  } catch (error) {
    console.error('Document intake error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
