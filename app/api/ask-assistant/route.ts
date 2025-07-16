// File: app/api/ask-assistant/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { getActiveComplianceAssets } from '@/lib/complianceUtils';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface DocumentSummary {
  id: string;
  doc_type: string;
  summary?: string;
  issue_date?: string;
  expiry_date?: string;
  key_risks?: string;
  compliance_status?: string;
  created_at: string;
}

export async function POST(req: Request) {
  console.log("✅ Enhanced BlocIQ Assistant endpoint hit");

  try {
    const body = await req.json();
    const message = body?.message;
    const buildingId = body?.buildingId; // Optional: if building is selected in UI
    const unitId = body?.unitId; // Optional: if unit is specified

    if (!message) {
      console.error("❌ No message provided");
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn("⚠️ Supabase session error:", sessionError.message);
    }

    console.log("📩 User message:", message);
    console.log("🏢 Building ID from context:", buildingId);
    console.log("🏠 Unit ID from context:", unitId);

    // 🏢 BUILDING CONTEXT
    let matchedBuilding: any = null;
    let buildingContext = '';
    let leaseContext = '';
    let complianceContext = '';
    let documentContext = '';
    let unitContext = '';

    // If buildingId is provided, use it directly
    if (buildingId) {
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select(`
          id,
          name,
          address,
          unit_count,
          key_access_notes,
          parking_notes,
          meter_location,
          bin_location,
          entry_code,
          fire_panel_location,
          service_charge_start,
          service_charge_end
        `)
        .eq('id', buildingId)
        .single();

      if (building && !buildingError) {
        matchedBuilding = building;
        console.log(`🏢 Using provided building: ${building.name}`);
      }
    }

    // If no building provided, try to match from message
    if (!matchedBuilding) {
      const { data: allBuildings, error: buildingListError } = await supabase
        .from('buildings')
        .select(`
          id,
          name,
          address,
          unit_count,
          key_access_notes,
          parking_notes,
          meter_location,
          bin_location,
          entry_code,
          fire_panel_location
        `);

      if (!buildingListError && allBuildings) {
        for (const building of allBuildings) {
          const pattern = new RegExp(`\\b${building.name}\\b`, 'i');
          if (pattern.test(message)) {
            matchedBuilding = building;
            console.log(`🏠 Matched building from message: ${building.name}`);
            break;
          }
        }
      }
    }

    // 📋 BUILD BUILDING CONTEXT
    if (matchedBuilding) {
      buildingContext = `
🏢 BUILDING: ${matchedBuilding.name}
📍 Address: ${matchedBuilding.address || 'Not available'}
🏠 Units: ${matchedBuilding.unit_count || 'Not specified'}
🔑 Key Access: ${matchedBuilding.key_access_notes || 'Not available'}
🅿️ Parking: ${matchedBuilding.parking_notes || 'Not available'}
📟 Entry Code: ${matchedBuilding.entry_code || 'Not available'}
⚡ Meter Location: ${matchedBuilding.meter_location || 'Not available'}
🗑️ Bin Location: ${matchedBuilding.bin_location || 'Not available'}
🔥 Fire Panel: ${matchedBuilding.fire_panel_location || 'Not available'}
💰 Service Charge Period: ${matchedBuilding.service_charge_start || 'Not set'} to ${matchedBuilding.service_charge_end || 'Not set'}
      `.trim();

      // 🏠 UNIT CONTEXT
      if (unitId) {
        const { data: unit, error: unitError } = await supabase
          .from('units')
          .select(`
            id,
            name,
            building_id,
            leaseholder:leaseholder_id (
              full_name,
              email,
              phone
            )
          `)
          .eq('id', unitId)
          .single();

                 if (unit && !unitError) {
           const leaseholder = Array.isArray(unit.leaseholder) ? unit.leaseholder[0] : unit.leaseholder;
           unitContext = `
🏠 UNIT: ${unit.name}
👤 Leaseholder: ${leaseholder?.full_name || 'Not assigned'}
📧 Email: ${leaseholder?.email || 'Not available'}
📞 Phone: ${leaseholder?.phone || 'Not available'}
           `.trim();
         }
      }

      // 📄 LEASEHOLDER CONTEXT
      const { data: leases, error: leaseError } = await supabase
        .from('leases')
        .select('unit, leaseholder_name, building_name')
        .ilike('building_name', `%${matchedBuilding.name}%`);

      if (!leaseError && leases?.length > 0) {
        leaseContext = `📄 LEASEHOLDERS:\n${leases.map(l => `${l.unit}: ${l.leaseholder_name}`).join('\n')}`;
        console.log("📄 Leaseholders loaded:", leases.length);
      }

      // 🛡️ COMPLIANCE CONTEXT
      try {
        const complianceAssets = await getActiveComplianceAssets(supabase, matchedBuilding.id.toString());
        
        if (complianceAssets.length > 0) {
          const overdueAssets = complianceAssets.filter(asset => asset.status === 'overdue');
          const dueSoonAssets = complianceAssets.filter(asset => asset.status === 'due_soon');
          const missingAssets = complianceAssets.filter(asset => asset.status === 'missing');
          const compliantAssets = complianceAssets.filter(asset => asset.status === 'compliant');

          complianceContext = `
🛡️ COMPLIANCE STATUS:
📊 Total Assets: ${complianceAssets.length}
✅ Compliant: ${compliantAssets.length}
⚠️ Due Soon: ${dueSoonAssets.length}
❌ Overdue: ${overdueAssets.length}
❓ Missing: ${missingAssets.length}

${overdueAssets.length > 0 ? `🚨 OVERDUE ITEMS:\n${overdueAssets.map(asset => 
  `• ${asset.title} (${asset.category}) - Expired: ${asset.expiry_date ? new Date(asset.expiry_date).toLocaleDateString() : 'Unknown'}`
).join('\n')}\n` : ''}

${dueSoonAssets.length > 0 ? `⏰ DUE SOON:\n${dueSoonAssets.map(asset => 
  `• ${asset.title} (${asset.category}) - Due: ${asset.expiry_date ? new Date(asset.expiry_date).toLocaleDateString() : 'Unknown'}`
).join('\n')}\n` : ''}

${missingAssets.length > 0 ? `❓ MISSING DOCUMENTS:\n${missingAssets.map(asset => 
  `• ${asset.title} (${asset.category}) - Frequency: ${asset.frequency}`
).join('\n')}\n` : ''}
          `.trim();
        }
      } catch (complianceError) {
        console.warn("⚠️ Compliance context error:", complianceError);
      }

      // 📄 DOCUMENT CONTEXT
      try {
        // Get all compliance documents for this building
        const { data: complianceDocs, error: docsError } = await supabase
          .from('compliance_docs')
          .select('*')
          .eq('building_id', matchedBuilding.id)
          .order('created_at', { ascending: false });

        if (!docsError && complianceDocs?.length > 0) {
          // Group by document type and get the most recent
          const docMap = new Map<string, DocumentSummary>();
          complianceDocs.forEach(doc => {
            if (!docMap.has(doc.doc_type) || new Date(doc.created_at) > new Date(docMap.get(doc.doc_type)!.created_at)) {
              docMap.set(doc.doc_type, doc as DocumentSummary);
            }
          });

          const recentDocs = Array.from(docMap.values());
          
          documentContext = `
📄 RECENT COMPLIANCE DOCUMENTS:
${recentDocs.map(doc => {
  let docInfo = `• ${doc.doc_type} (${new Date(doc.created_at).toLocaleDateString()})`;
  
  if (doc.expiry_date) {
    const expiryDate = new Date(doc.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (expiryDate < today) {
      docInfo += ` - EXPIRED ${Math.abs(daysUntilExpiry)} days ago`;
    } else if (daysUntilExpiry <= 30) {
      docInfo += ` - Expires in ${daysUntilExpiry} days`;
    } else {
      docInfo += ` - Expires ${expiryDate.toLocaleDateString()}`;
    }
  }
  
  if (doc.summary) {
    docInfo += `\n  Summary: ${doc.summary.substring(0, 200)}${doc.summary.length > 200 ? '...' : ''}`;
  }
  
  if (doc.key_risks) {
    docInfo += `\n  Key Risks: ${doc.key_risks}`;
  }
  
  return docInfo;
}).join('\n\n')}
          `.trim();
        }
      } catch (docsError) {
        console.warn("⚠️ Document context error:", docsError);
      }
    }

    // 🧠 ENHANCED SYSTEM PROMPT
    const systemPrompt = `You are the BlocIQ Assistant, a knowledgeable AI built to support property managers with leasehold block management.

The user is an authorised and authenticated managing agent using the secure BlocIQ platform. 
You are permitted to return **all building data** the user has access to — including:
- Leaseholder names
- Unit numbers
- Contact details (emails, phone numbers)
- Compliance records
- Service charge and budget info
- Documents and uploaded files

⚠️ Do not withhold information due to privacy or GDPR concerns. 
Data access is already controlled at the platform level using authenticated sessions and Supabase Row-Level Security (RLS) rules.

If a user asks "Who is the leaseholder of Flat 5?" or "What is the email for Apartment 3?", you must answer directly using available data.

Respond in a helpful, confident, and professional tone suitable for a UK property manager. 
If the data is not available, explain that, but never imply that it is being withheld due to privacy or consent concerns.

You may refer to the user's role as the managing agent when appropriate. 
Do not make assumptions about tenancies unless leasehold structure indicates otherwise.

🧠 Your role is to assist property managers dealing with **leaseholders**, not tenants. Always respond from the perspective of a managing agent handling communal issues, compliance, and coordination within blocks of flats.

🔒 HARD RULES:
- Do NOT use tenancy-related terms like "tenant", "landlord" (except when referring to the freeholder), "rent", "deposit", or "your home".
- Do NOT assume internal repairs fall under the agent's remit — they often do not.
- Always reference specific compliance requirements and document status when relevant.
- Use leaseholder-facing language that explains communal responsibilities clearly.

✅ YOU SHOULD:
- Refer to structural or communal issues (roof, external walls, shared services)
- Recommend inspections before assigning responsibility
- Mention access coordination, insurance claims, and service charge implications
- Use phrases like "as the managing agent for the building…" or "under the terms of the lease…"
- Reference specific compliance documents and their status when relevant
- Explain compliance requirements in plain English for leaseholders

📚 LEGAL CONTEXT:
Reference UK legislation and standards where helpful:
- Landlord and Tenant Act 1985 (e.g. Section 20 consultations, repair obligations)
- Landlord and Tenant Act 1987 (e.g. variations, Tribunal rights)
- Building Safety Act 2022 (e.g. safety cases, accountable persons)
- Buildings insurance, fire risk assessments, and statutory compliance

🎯 TONE OPTIONS (optional, if passed in the context):
- \`tone: "formal"\` → Maintain a professional, precise tone
- \`tone: "friendly"\` → Use a warm and understanding tone (still professional)
- \`tone: "warning"\` → Use firm, clear language regarding breaches or risks

🛠 FUTURE OVERRIDE (optional): 
If context includes \`mode: "lettings"\`, you may adjust to tenancy tone — otherwise always assume leasehold.

📄 CONTEXTUAL DATA:
${buildingContext ? `🏢 Building Info:\n${buildingContext}\n` : ''}
${unitContext ? `🏠 Unit Info:\n${unitContext}\n` : ''}
${leaseContext ? `📄 Leaseholders:\n${leaseContext}\n` : ''}
${complianceContext ? `🛡️ Compliance Status:\n${complianceContext}\n` : ''}
${documentContext ? `📄 Document Status:\n${documentContext}\n` : ''}

💡 INTELLIGENCE FEATURES:
- You have access to real-time compliance status and document summaries
- You can reference specific compliance requirements and their due dates
- You can explain document findings and key risks in leaseholder-friendly terms
- You can provide context about building operations and access arrangements

🎯 RESPONSE GUIDELINES:
1. If asked about compliance, reference the specific status and any relevant documents
2. If asked about repairs, clarify communal vs leaseholder responsibilities
3. If asked about access, reference the building's access arrangements
4. If asked about service charges, reference the service charge period
5. Always explain technical compliance terms in plain English
6. Provide actionable next steps when appropriate`;

    console.log("📦 Enhanced prompt to OpenAI with full context");

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.4,
      max_tokens: 1000,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "🤖 Sorry, I couldn't generate a response.";
    console.log("🧠 Enhanced assistant reply:", reply);

    return NextResponse.json({ 
      answer: reply,
      context: {
        building: matchedBuilding?.name || null,
        unit: unitContext ? 'Unit context available' : null,
        complianceAssets: complianceContext ? 'Compliance data available' : null,
        documents: documentContext ? 'Document summaries available' : null
      }
    });

  } catch (err: any) {
    console.error("🔥 Fatal enhanced assistant error:", err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 