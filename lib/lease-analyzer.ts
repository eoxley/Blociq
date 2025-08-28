/**
 * Lease Document Analyzer for BlocIQ
 * Uses OpenAI API to extract structured lease data and compliance information
 */

import { LeaseAnalysis, LeaseComplianceItem, LEASE_COMPLIANCE_CHECKLIST } from '@/types/ai';

export async function analyzeLeaseDocument(
  extractedText: string, 
  filename: string,
  buildingId?: string
): Promise<LeaseAnalysis> {
  
  const leasePrompt = `
You are analyzing a lease document. Provide a comprehensive analysis in the following structure:

DOCUMENT ANALYSIS:
${extractedText}

Please extract and analyze:

1. **LEASE SUMMARY** - Provide a detailed narrative summary including:
   - Property address and description
   - Landlord and tenant names
   - Lease term dates and duration
   - Financial details (premium, rent, service charges)
   - Key rights and restrictions
   - Service provisions

2. **STRUCTURED DATA** - Extract specific details:
   - Property address
   - Landlord name
   - Tenant name
   - Lease start/end dates
   - Lease term (e.g., "125 years")
   - Premium amount
   - Initial rent amount
   - Service charge percentage

3. **COMPLIANCE CHECKLIST** - For each item below, respond Y/N/Unknown and provide brief details if found:
   ${LEASE_COMPLIANCE_CHECKLIST.map(item => `- ${item}`).join('\n   ')}

4. **FINANCIAL OBLIGATIONS** - List all financial responsibilities

5. **KEY RIGHTS** - List tenant rights and entitlements

6. **RESTRICTIONS** - List prohibitions and limitations

7. **SUGGESTED ACTIONS** - Provide 3-5 actionable next steps for the property manager

Format the response as structured JSON.
  `;

  try {
    // Use OpenAI directly since we're in a server-side context
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: 'user', content: leasePrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const aiResult = completion.choices[0].message.content;
    if (!aiResult) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(aiResult);

    // Transform into LeaseAnalysis format
    return {
      filename,
      summary: analysis.leaseSummary || analysis.summary || 'Lease document analyzed successfully',
      documentType: 'lease',
      leaseDetails: analysis.structuredData || {},
      complianceChecklist: analysis.complianceChecklist?.map((item: any) => ({
        item: item.name || item.item,
        status: item.status,
        details: item.details
      })) || [],
      financialObligations: analysis.financialObligations || [],
      keyRights: analysis.keyRights || [],
      restrictions: analysis.restrictions || [],
      suggestedActions: analysis.suggestedActions?.map((action: any, index: number) => ({
        key: `lease_action_${index}`,
        label: action.title || action.label || action,
        icon: 'FileText',
        action: action.action || 'review'
      })) || [],
      extractionMethod: 'ai_lease_analysis',
      confidence: 0.9
    };

  } catch (error) {
    console.error('Lease analysis error:', error);
    
    // Fallback to basic analysis
    return {
      filename,
      summary: `Lease document analysis failed. Document contains ${extractedText.length} characters of text.`,
      documentType: 'lease',
      complianceChecklist: LEASE_COMPLIANCE_CHECKLIST.map(item => ({
        item,
        status: 'Unknown' as const
      })),
      suggestedActions: [{
        key: 'manual_review',
        label: 'Manual lease review required',
        icon: 'AlertTriangle',
        action: 'review'
      }],
      extractionMethod: 'fallback',
      confidence: 0.1
    };
  }
}
