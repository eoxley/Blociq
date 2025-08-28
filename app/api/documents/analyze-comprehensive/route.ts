import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { processDocumentOCR } from '@/lib/ocr';
import { analyzeDocument } from '@/lib/document-analysis-orchestrator';
import { analyzeLeaseDocument } from '@/lib/lease-analyzer';

export async function POST(req: NextRequest) {
  try {
    console.log("🧠 Comprehensive document analysis starting...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { file, fileName, buildingId } = body;

    if (!file || !fileName) {
      return NextResponse.json({ 
        error: "Missing required fields: file and fileName are required" 
      }, { status: 400 });
    }

    console.log("✅ Analyzing document:", fileName);

    try {
      // Step 1: Process document through OCR
      const ocrResult = await processDocumentOCR(file);
      
      if (!ocrResult.text) {
        return NextResponse.json({
          success: false,
          error: "OCR processing failed",
          details: "No text extracted"
        }, { status: 400 });
      }

      // Step 1.5: Detect if this is a lease document
      const isLease = fileName.toLowerCase().includes('lease') || 
                      ocrResult.text.toLowerCase().includes('lease agreement') ||
                      ocrResult.text.toLowerCase().includes('tenancy agreement') ||
                      ocrResult.text.toLowerCase().includes('leasehold') ||
                      ocrResult.text.toLowerCase().includes('lessor') ||
                      ocrResult.text.toLowerCase().includes('lessee');

      let comprehensiveAnalysis;
      
      if (isLease) {
        console.log("🏠 Lease document detected, using specialized lease analyzer");
        // Use specialized lease analyzer
        comprehensiveAnalysis = await analyzeLeaseDocument(ocrResult.text, fileName, buildingId || '');
      } else {
        console.log("📋 Using general document analyzer");
        // Use existing general analysis
        comprehensiveAnalysis = await analyzeDocument(ocrResult.text, fileName, `Analyze document: ${fileName}`);
      }
      
      console.log("📋 Document analyzed comprehensively:", comprehensiveAnalysis.documentType);

      // Step 3: Generate suggested actions based on analysis
      const suggestedActions = generateSuggestedActions(comprehensiveAnalysis, comprehensiveAnalysis.documentType);

      console.log("✅ Comprehensive document analysis completed successfully");

      return NextResponse.json({
        success: true,
        documentType: comprehensiveAnalysis.documentType,
        analysis: comprehensiveAnalysis,
        suggestedActions,
        extractedText: ocrResult.text,
        filename: fileName
      });

    } catch (analysisError) {
      console.error("❌ Document analysis error:", analysisError);
      return NextResponse.json({ 
        error: "Document analysis failed",
        details: analysisError instanceof Error ? analysisError.message : "Unknown error"
      }, { status: 500 });
    }

  } catch (error) {
    console.error("❌ Comprehensive document analysis error:", error);
    return NextResponse.json({ 
      error: "Internal server error during document analysis",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

function generateSuggestedActions(analysis: any, documentType: string): any[] {
  const actions = [];
  
  // Common actions for all document types
  if (analysis.keyDates && analysis.keyDates.deadlines && analysis.keyDates.deadlines.length > 0) {
    actions.push({
      type: 'calendar',
      title: 'Add key dates to calendar',
      priority: 'High',
      description: `Add ${analysis.keyDates.deadlines.length} key dates from ${documentType} to calendar`
    });
  }

  if (analysis.actionItems && analysis.actionItems.immediate && analysis.actionItems.immediate.length > 0) {
    actions.push({
      type: 'todo',
      title: 'Create immediate action tasks',
      priority: 'High',
      description: `Create ${analysis.actionItems.immediate.length} immediate action tasks from ${documentType}`
    });
  }

  if (analysis.actionItems && analysis.actionItems.shortTerm && analysis.actionItems.shortTerm.length > 0) {
    actions.push({
      type: 'todo',
      title: 'Create short-term tasks',
      priority: 'Medium',
      description: `Create ${analysis.actionItems.shortTerm.length} short-term tasks from ${documentType}`
    });
  }

  // Document-specific actions based on comprehensive analysis
  switch (documentType) {
    case 'lease':
      if (analysis.keyDates && analysis.keyDates.expiryDate) {
        actions.push({
          type: 'reminder',
          title: 'Set lease expiry reminder',
          priority: 'Medium',
          description: `Set reminder for lease expiry on ${analysis.keyDates.expiryDate}`
        });
      }
      break;
      
    case 'eicr':
      if (analysis.keyDates && analysis.keyDates.nextReviewDate) {
        actions.push({
          type: 'calendar',
          title: 'Schedule next EICR test',
          priority: 'High',
          description: `Schedule EICR test for ${analysis.keyDates.nextReviewDate}`
        });
      }
      break;
      
    case 'gas-safety':
      if (analysis.keyDates && analysis.keyDates.nextReviewDate) {
        actions.push({
          type: 'calendar',
          title: 'Schedule gas safety inspection',
          priority: 'High',
          description: `Schedule gas safety inspection for ${analysis.keyDates.nextReviewDate}`
        });
      }
      break;
      
    case 'fire-risk-assessment':
      if (analysis.keyDates && analysis.keyDates.nextReviewDate) {
        actions.push({
          type: 'calendar',
          title: 'Schedule fire risk assessment review',
          priority: 'Medium',
          description: `Schedule fire risk assessment review for ${analysis.keyDates.nextReviewDate}`
        });
      }
      break;
  }

  return actions;
}
