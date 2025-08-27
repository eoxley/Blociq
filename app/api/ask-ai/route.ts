// app/api/ask-ai/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // Prefer service role server-side (safe in API routes only). If absent, fall back to anon.
  (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
  { auth: { persistSession: false } }
);

function parseQuery(q: string) {
  // ultra-light parser: extract unit (e.g., 5 or 5A) and a likely building name
  // Tweak if your buildings vary: add more names or pull from DB later.
  const unitMatch = q.match(/\b(?:flat|unit|apt|apartment|no\.?|#)?\s*([0-9]+[A-Za-z]?)\b/i);
  const unit = unitMatch?.[1] ?? null;

  const knownBuildings = [
    'Ashwood House',
    'Kensington Gardens Square',
    'Pimlico Place',
    'Elmington', 'Westbridge', 'Kings Court'
  ];
  const lower = q.toLowerCase();
  const building = knownBuildings.find(b => lower.includes(b.toLowerCase())) ?? null;

  // If no known building keyword, try a loose "[word] House" capture
  const generic = lower.match(/\b([a-z]+)\s+house\b/i)?.[0];
  return { unit, building: building ?? (generic ? generic.replace(/\b\w/, c => c.toUpperCase()) : null) };
}

async function lookupLeaseholder(building: string | null, unit: string | null) {
  if (!building && !unit) return null;

  // Prefer the view if present
  let { data, error } = await supabase
    .from('vw_units_leaseholders')
    .select('building_name, unit_label, leaseholder_name, leaseholder_email')
    .ilike('building_name', building ? `%${building}%` : '%')
    .ilike('unit_label', unit ? `%${unit}%` : '%')
    .limit(1);

  if (error && (error as any).message?.includes('relation') && (error as any).message?.includes('does not exist')) {
    // Fallback to base tables if the view is missing
    const { data: rows, error: err2 } = await supabase
      .from('units')
      .select(`
        unit_label,
        building:buildings(name),
        leaseholder:leaseholders(name, email)
      `)
      .ilike('unit_label', unit ? `%${unit}%` : '%')
      .limit(5);
    if (err2) throw err2;

    const match = (rows ?? []).find(r =>
      building ? (r.building as any)?.name?.toLowerCase().includes(building.toLowerCase()) : true
    );

    if (!match) return null;
    return {
      building_name: (match.building as any)?.name ?? null,
      unit_label: match.unit_label ?? null,
      leaseholder_name: (match.leaseholder as any)?.name ?? null,
      leaseholder_email: (match.leaseholder as any)?.email ?? null,
    };
  }

  if (error) throw error;
  return data?.[0] ?? null;
}

async function analyzeDocumentWithAI(extractedText: string, fileName: string) {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are analyzing a document for a UK leasehold block management platform called BlocIQ using British English.

Document: ${fileName}
Extracted Text: ${extractedText}

Please analyze this document and provide the following information in JSON format using British English:

1. classification: One of "Fire Risk Assessment", "EICR", "Insurance Certificate", "Lift Maintenance", "Lease Agreement", "Other"
2. document_type: Specific type within the classification (e.g., "Fire Risk Assessment - Type 1", "Electrical Installation Condition Report", "Building Insurance Certificate", "Lift Maintenance Certificate", "Meeting Minutes", "Lease Agreement", "Scope of Works")
3. summary: A comprehensive summary using this exact prompt: "Summarise this document. List all findings, actions, deadlines, or responsibilities. Extract relevant inspection and expiry dates." (max 300 words)
4. inspection_date: Date of inspection if applicable (YYYY-MM-DD format or null)
5. next_due_date: Next due date if applicable (YYYY-MM-DD format or null)
6. responsible_party: Who is responsible for this document/action (e.g., "Management Company", "Leaseholder", "Contractor", "Insurance Provider", "Local Authority")
7. action_required: What action is needed (e.g., "Review annually", "File for records", "Update compliance tracker", "Renew by date")
8. confidence: Confidence level in classification (0-100)
9. suggested_compliance_asset: If compliance-related, suggest which compliance asset this relates to (e.g., "Fire Safety", "Electrical Safety", "Gas Safety", "Asbestos Management", "Legionella Control", "Lift Safety")
10. contractor_name: Name of contractor if mentioned (or null)
11. building_name: Building name if mentioned in document (or null)
12. key_dates: Array of important dates found in document (YYYY-MM-DD format)
13. key_entities: Array of important people, companies, or organizations mentioned
14. leaseholder_name: If this is a lease document, extract the leaseholder name (or null)
15. lease_start_date: If this is a lease document, extract the lease start date (YYYY-MM-DD format or null)
16. lease_end_date: If this is a lease document, extract the lease end date (YYYY-MM-DD format or null)
17. apportionment: If this is a lease document, extract the service charge apportionment percentage (or null)

Focus on UK leasehold terminology and compliance requirements. If dates are mentioned, extract them carefully.
Return only valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a document analysis expert for UK leasehold block management. Return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const analysis = JSON.parse(response);

    // Validate and clean up the analysis
    return {
      classification: analysis.classification || 'Other',
      document_type: analysis.document_type || 'Unknown',
      summary: analysis.summary || 'No summary available',
      inspection_date: analysis.inspection_date || null,
      next_due_date: analysis.next_due_date || null,
      responsible_party: analysis.responsible_party || 'Management Company',
      action_required: analysis.action_required || 'Review document',
      confidence: Math.min(100, Math.max(0, analysis.confidence || 50)),
      suggested_compliance_asset: analysis.suggested_compliance_asset || null,
      contractor_name: analysis.contractor_name || null,
      building_name: analysis.building_name || null,
      key_dates: Array.isArray(analysis.key_dates) ? analysis.key_dates : [],
      key_entities: Array.isArray(analysis.key_entities) ? analysis.key_entities : [],
      leaseholder_name: analysis.leaseholder_name || null,
      lease_start_date: analysis.lease_start_date || null,
      lease_end_date: analysis.lease_end_date || null,
      apportionment: analysis.apportionment || null
    };

  } catch (error) {
    console.error('❌ Error analyzing document:', error);
    return null;
  }
}

async function extractTextWithGoogleVision(fileBuffer: Buffer): Promise<string> {
  try {
    const visionCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!visionCreds) {
      throw new Error('Google Vision credentials not configured');
    }

    const vision = await import('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient({
      credentials: JSON.parse(visionCreds)
    });

    const [result] = await client.documentTextDetection({
      image: { content: fileBuffer.toString('base64') }
    });

    const detections = result.fullTextAnnotation;
    return detections?.text || '';
  } catch (error) {
    console.error('Google Vision OCR failed:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, files } = body;

    // Handle file uploads with OCR and analysis
    if (files && Array.isArray(files) && files.length > 0) {
      console.log('📄 Processing uploaded files:', files.length);
      
      const results = [];
      
      for (const file of files) {
        try {
          console.log(`🔍 Processing file: ${file.name}`);
          
          // Extract text using Google Vision OCR
          let extractedText = '';
          try {
            const fileBuffer = Buffer.from(file.data, 'base64');
            extractedText = await extractTextWithGoogleVision(fileBuffer);
            console.log(`✅ OCR completed for ${file.name}, extracted ${extractedText.length} characters`);
          } catch (ocrError) {
            console.error(`❌ OCR failed for ${file.name}:`, ocrError);
            extractedText = `Unable to extract text from ${file.name}. The document may be scanned or corrupted.`;
          }

          // Analyze document with AI
          const analysis = await analyzeDocumentWithAI(extractedText, file.name);
          
          if (analysis) {
            // Format suggested actions properly
            const suggestedActions = [
              {
                key: 'review_document',
                label: 'Review Document Analysis',
                icon: 'file-text',
                action: 'Review the AI-generated analysis and summary'
              },
              {
                key: 'update_compliance',
                label: 'Update Compliance Tracker',
                icon: 'check-circle',
                action: 'Add to compliance monitoring system'
              },
              {
                key: 'schedule_followup',
                label: 'Schedule Follow-up',
                icon: 'calendar',
                action: 'Set reminders for key dates'
              }
            ];

            // Add specific actions based on document type
            if (analysis.classification === 'Lease Agreement') {
              suggestedActions.push({
                key: 'extract_lease_details',
                label: 'Extract Lease Details',
                icon: 'home',
                action: 'Extract key lease terms and dates'
              });
            }

            if (analysis.next_due_date) {
              suggestedActions.push({
                key: 'set_reminder',
                label: 'Set Due Date Reminder',
                icon: 'bell',
                action: `Remind on ${analysis.next_due_date}`
              });
            }

            results.push({
              filename: file.name,
              extractedText: extractedText.substring(0, 500) + '...',
              analysis: analysis,
              suggestedActions: suggestedActions,
              source: 'google_vision_ocr'
            });
          } else {
            results.push({
              filename: file.name,
              extractedText: extractedText.substring(0, 500) + '...',
              analysis: null,
              suggestedActions: [
                {
                  key: 'manual_review',
                  label: 'Manual Review Required',
                  icon: 'eye',
                  action: 'Review document manually due to analysis failure'
                }
              ],
              source: 'google_vision_ocr_fallback'
            });
          }
        } catch (fileError) {
          console.error(`❌ Failed to process file ${file.name}:`, fileError);
          results.push({
            filename: file.name,
            error: 'Processing failed',
            suggestedActions: [
              {
                key: 'retry_upload',
                label: 'Retry Upload',
                icon: 'refresh-cw',
                action: 'Try uploading the file again'
              }
            ]
          });
        }
      }

      // Log usage analytics
      try {
        await supabase.from('ai_logs').insert({
          question: `Document analysis for ${files.length} file(s)`,
          response: JSON.stringify(results),
          context: JSON.stringify({ fileCount: files.length, source: 'document_analysis' })
        });
      } catch (logError) {
        // Ignore logging errors
      }

      return NextResponse.json({
        success: true,
        type: 'document_analysis',
        results: results,
        message: `Successfully processed ${results.length} document(s)`
      });
    }

    // Handle leaseholder queries (existing functionality)
    if (question && typeof question === 'string') {
      const { unit, building } = parseQuery(question);

      // 1) Try to answer directly from DB
      const ctx = await lookupLeaseholder(building, unit);

      if (ctx?.leaseholder_name) {
        const answer = `The leaseholder of ${ctx.unit_label}, ${ctx.building_name} is ${ctx.leaseholder_name}${ctx.leaseholder_email ? ` (${ctx.leaseholder_email})` : ''}.`;
        // best-effort log (ignore failures)
        try {
          await supabase.from('ai_logs').insert({
            question, response: answer, context: JSON.stringify({ building, unit, source: 'vw_units_leaseholders' })
          });
        } catch (logError) {
          // Ignore logging errors
        }
        return NextResponse.json({ answer, source: 'supabase' });
      }

      // 2) If not found, say so (don't waffle)
      const fallback =
        `I couldn't find a matching leaseholder in BlocIQ for${unit ? ` unit ${unit}` : ''}${building ? ` at ${building}` : ''}. ` +
        `Please check the unit label/building name or upload the latest leaseholder list via Onboarding.`;

      try {
        await supabase.from('ai_logs').insert({
          question, response: fallback, context: JSON.stringify({ building, unit, found: false })
        });
      } catch (logError) {
        // Ignore logging errors
      }
      return NextResponse.json({ answer: fallback, source: 'fallback' });
    }

    return NextResponse.json({ error: 'Missing question or files' }, { status: 400 });

  } catch (e: any) {
    console.error('Ask AI failed:', e);
    return NextResponse.json({ error: e?.message ?? 'Unexpected error' }, { status: 500 });
  }
} 