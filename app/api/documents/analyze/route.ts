import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    console.log("🧠 Analyzing document...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { documentId, documentText, fileName, documentType } = body;

    if (!documentId || !documentText) {
      return NextResponse.json({ 
        error: "Missing required fields: documentId and documentText are required" 
      }, { status: 400 });
    }

    console.log("✅ Analyzing document:", fileName);

    // Check if document text is substantial enough to analyze
    if (!documentText || documentText.length < 50) {
      console.log("⚠️ Document text too short for analysis");
      
      // Update document with fallback summary
      const { error: updateError } = await supabase
        .from('building_documents')
        .update({
          summary: "Document contains limited readable text. Consider re-uploading with OCR or a text-based version.",
          suggested_action: "Re-upload document with better text extraction or enable OCR processing.",
          confidence_level: "low"
        })
        .eq('id', documentId);

      if (updateError) {
        console.error("❌ Failed to update document with fallback summary:", updateError);
      }

      return NextResponse.json({
        success: true,
        summary: "Document contains limited readable text. Consider re-uploading with OCR or a text-based version.",
        suggested_action: "Re-upload document with better text extraction or enable OCR processing.",
        confidence_level: "low"
      });
    }

    // Create AI prompt for document analysis
    const analysisPrompt = `
You are BlocIQ, a UK property management AI assistant. Analyze the following uploaded document and provide:

1. A concise summary of the key findings (max 200 words)
2. A suggested action for the property manager (max 100 words)
3. A confidence level (high/medium/low) based on the clarity of the document

Document Information:
- File Name: ${fileName}
- Document Type: ${documentType || 'Unknown'}
- Content Length: ${documentText.length} characters

Document Content:
${documentText.slice(0, 3000)} // Limit to first 3000 characters for analysis

Please respond in the following JSON format:
{
  "summary": "Brief summary of key findings",
  "suggested_action": "Specific action for property manager",
  "confidence_level": "high|medium|low",
  "key_findings": ["finding1", "finding2", "finding3"],
  "compliance_status": "compliant|requires_action|clear|unknown"
}

Focus on:
- Compliance requirements and deadlines
- Safety issues or risks
- Required follow-up actions
- Cost implications
- Legal requirements
- Maintenance recommendations
`;

    // Call OpenAI for analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a property management expert. Analyze documents and provide actionable insights in JSON format.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const aiResponse = completion.choices[0].message.content;
    
    // Parse AI response
    let analysisResult;
    try {
      analysisResult = JSON.parse(aiResponse || '{}');
    } catch (error) {
      console.error("❌ Failed to parse AI response:", error);
      analysisResult = {
        summary: "Document analyzed but response format was unclear.",
        suggested_action: "Review document manually for key findings.",
        confidence_level: "medium",
        key_findings: [],
        compliance_status: "unknown"
      };
    }

    // Update document with analysis results
    const { error: updateError } = await supabase
      .from('building_documents')
      .update({
        summary: analysisResult.summary || "No summary generated",
        suggested_action: analysisResult.suggested_action || "No action suggested",
        confidence_level: analysisResult.confidence_level || "medium",
        key_findings: analysisResult.key_findings || [],
        compliance_status: analysisResult.compliance_status || "unknown",
        analyzed_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error("❌ Failed to update document with analysis:", updateError);
      return NextResponse.json({ 
        error: "Failed to save analysis results",
        details: updateError.message 
      }, { status: 500 });
    }

    console.log("✅ Document analysis completed successfully");

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      document_id: documentId
    });

  } catch (error) {
    console.error("❌ Document analysis error:", error);
    return NextResponse.json({ 
      error: "Internal server error during document analysis",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 