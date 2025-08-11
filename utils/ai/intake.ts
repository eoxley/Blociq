import { AI_ENABLED, OPENAI_API_KEY } from '@/lib/ai/config';
import { DocumentIntakeResult, createDefaultDocumentIntake } from '@/lib/zod/documentIntake';

const DOCUMENT_INTAKE_SYSTEM_PROMPT = `You are BlocIQ's document intake brain. You receive a single document (PDF/image/Docx) and optional hints (building name/id).
Return ONE JSON object only, no prose.

Operate in British English. Be precise. If unsure, give best inference with a confidence score.

Tasks:
1) Classify the document into one of:
   ["fire_certificate","extinguisher_service_certificate","hose_reel_service","alarm_service","emergency_lighting","lift_inspection","gas_safety","electrical_cert","insurance_policy","minutes","budget","invoice","quote","scope_of_works","lease","deed_of_variation","ews1","contract","correspondence","other"]

2) Extract fields relevant to the class. ALWAYS include:
   - document_title
   - issuing_company_name
   - issuing_company_contact (phone/email if present)
   - inspection_or_issue_date (ISO YYYY-MM-DD if partial, e.g. "2021-09" -> "2021-09-01")
   - period_covered_end_date (if present)
   - building_name
   - building_address
   - building_postcode
   - people (array of {role, name})  // e.g. "engineer", "customer sign-off"
   - standard_or_code_refs (e.g. "BS 5306-3:2017")
   - equipment (array; when applicable) with items like {type, size, count, locations, status}
   - notes (short free text of defects/advisories)
   - page_count
   - source_confidence (0–1)
   - text_extracted (short summary 1–3 sentences)

3) Suggest filing:
   - suggested_category  // e.g. "Fire Safety Equipment – Extinguishers & Hose Reels"
   - suggested_table     // e.g. "building_documents" or "compliance_documents"
   - suggested_compliance_asset_key  // e.g. "fire_extinguishers" | "hose_reels" | null
   - next_due_date  // if periodic (e.g., +12 months), infer if safe; else null
   - reminders (array of {label, date, reason})

4) Actions & flags:
   - follow_ups (array of short actionable strings, e.g. "Confirm listed defects resolved", "Schedule annual service")
   - blocking_issues (array)  // e.g. "Illegible date", "No building address"
   - ocr_needed (bool)  // true if scan was low quality or text missing
   - duplicates_possible (bool) + duplicate_match_hint (e.g. {title,date})

Rules:
- If data is illegible/partial, return null for field and add to blocking_issues.
- Do not invent: infer only with clear basis and lower confidence.
- Use building hints if provided; otherwise extract from the document.
- Dates: prefer ISO; if only month/year known, set day=01 and note limitation in notes.
- Keep values concise and machine-usable.

Output JSON schema (keys in this order):
{
  "classification": "...",
  "document_title": "...",
  "issuing_company_name": "...",
  "issuing_company_contact": "...",
  "inspection_or_issue_date": "YYYY-MM-DD|null",
  "period_covered_end_date": "YYYY-MM-DD|null",
  "building_name": "...|null",
  "building_address": "...|null",
  "building_postcode": "...|null",
  "people": [],
  "standard_or_code_refs": [],
  "equipment": [],
  "notes": "...",
  "page_count": 0,
  "source_confidence": 0.0,
  "text_extracted": "...",
  "suggested_category": "...",
  "suggested_table": "...",
  "suggested_compliance_asset_key": "...|null",
  "next_due_date": "YYYY-MM-DD|null",
  "reminders": [],
  "follow_ups": [],
  "blocking_issues": [],
  "ocr_needed": false,
  "duplicates_possible": false,
  "duplicate_match_hint": null
}`;

interface IntakeRequest {
  file_name: string;
  page_count: number;
  extracted_text: string;
  building_hint?: string | null;
  meta: {
    contentType: string;
    size: number;
  };
}

export async function analyzeDocumentIntake(request: IntakeRequest): Promise<DocumentIntakeResult> {
  if (!AI_ENABLED || !OPENAI_API_KEY) {
    // Return default result if AI is disabled
    return createDefaultDocumentIntake(request.file_name);
  }

  try {
    const userPrompt = `Analyze this document:

File: ${request.file_name}
Pages: ${request.page_count}
Content Type: ${request.meta.contentType}
Size: ${request.meta.size} bytes
Building Hint: ${request.building_hint || 'None provided'}

Extracted Text:
${request.extracted_text}

Return ONLY a valid JSON object matching the schema. No prose, no explanations.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: DOCUMENT_INTAKE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent JSON output
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // Extract JSON from the response (handle cases where AI adds prose)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const jsonString = jsonMatch[0];
    const parsed = JSON.parse(jsonString);
    
    return parsed as DocumentIntakeResult;

  } catch (error) {
    console.error('Document intake analysis failed:', error);
    
    // Return default result with error information
    const defaultResult = createDefaultDocumentIntake(request.file_name);
    defaultResult.blocking_issues.push(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    defaultResult.source_confidence = 0.0;
    
    return defaultResult;
  }
}
