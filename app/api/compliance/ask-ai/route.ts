import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from "next/headers";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    console.log("🤖 Processing compliance AI query...");
    
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { question, buildingId, context } = body;

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    console.log(`🏗️ AI Query for building ${buildingId || 'general'}: ${question}`);

    // Gather relevant context based on the question and building
    const complianceContext = await gatherComplianceContext(supabase, user.id, buildingId, question);
    
    // Generate AI response using the compliance context
    const aiResponse = await generateComplianceAIResponse(question, complianceContext, context);

    const response = {
      answer: aiResponse.answer,
      confidence: aiResponse.confidence,
      sources: aiResponse.sources,
      suggestions: aiResponse.suggestions,
      context: {
        buildingId,
        documentsAnalyzed: complianceContext.documentsCount,
        assetsAnalyzed: complianceContext.assetsCount,
        timestamp: new Date().toISOString()
      }
    };

    console.log("✅ AI compliance query processed successfully");
    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ AI compliance query error:", error);
    return NextResponse.json({ 
      error: "Failed to process AI query",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

async function gatherComplianceContext(
  supabase: any, 
  userId: string, 
  buildingId?: string, 
  question?: string
): Promise<{
  buildings: any[];
  assets: any[];
  documents: any[];
  recentExtractions: any[];
  overduItems: any[];
  documentsCount: number;
  assetsCount: number;
}> {
  
  try {
    // Get user's buildings
    let buildingsQuery = supabase
      .from('buildings')
      .select('id, name, address, property_type')
      .eq('user_id', userId);

    if (buildingId) {
      buildingsQuery = buildingsQuery.eq('id', buildingId);
    }

    const { data: buildings } = await buildingsQuery;

    const buildingIds = buildings?.map(b => b.id) || [];
    
    if (buildingIds.length === 0) {
      return {
        buildings: [],
        assets: [],
        documents: [],
        recentExtractions: [],
        overduItems: [],
        documentsCount: 0,
        assetsCount: 0
      };
    }

    // Get compliance assets for these buildings
    const { data: assets } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        status,
        next_due_date,
        last_carried_out,
        inspector_provider,
        certificate_reference,
        document_count,
        compliance_assets (
          name,
          category,
          description
        ),
        buildings (
          name
        )
      `)
      .in('building_id', buildingIds)
      .order('next_due_date', { ascending: true });

    // Get recent compliance documents with AI extractions
    const { data: documents } = await supabase
      .from('compliance_documents')
      .select(`
        id,
        original_filename,
        document_type,
        document_category,
        processing_status,
        upload_date,
        building_id,
        ai_document_extractions (
          inspection_date,
          next_due_date,
          inspector_name,
          compliance_status,
          extracted_data
        )
      `)
      .in('building_id', buildingIds)
      .eq('processing_status', 'completed')
      .order('upload_date', { ascending: false })
      .limit(20);

    // Get recent AI extractions
    const { data: recentExtractions } = await supabase
      .from('ai_document_extractions')
      .select(`
        *,
        compliance_documents (
          original_filename,
          document_type,
          building_id
        )
      `)
      .in('compliance_documents.building_id', buildingIds)
      .order('extraction_date', { ascending: false })
      .limit(10);

    // Identify overdue items
    const today = new Date();
    const overduItems = assets?.filter(asset => {
      return asset.next_due_date && new Date(asset.next_due_date) < today;
    }) || [];

    return {
      buildings: buildings || [],
      assets: assets || [],
      documents: documents || [],
      recentExtractions: recentExtractions || [],
      overduItems,
      documentsCount: documents?.length || 0,
      assetsCount: assets?.length || 0
    };

  } catch (error) {
    console.error('Error gathering compliance context:', error);
    return {
      buildings: [],
      assets: [],
      documents: [],
      recentExtractions: [],
      overduItems: [],
      documentsCount: 0,
      assetsCount: 0
    };
  }
}

async function generateComplianceAIResponse(
  question: string, 
  context: any, 
  userContext?: string
): Promise<{
  answer: string;
  confidence: number;
  sources: string[];
  suggestions: string[];
}> {
  
  // This is a simplified AI response generator
  // In a real implementation, you'd use an LLM API like OpenAI, Anthropic, etc.
  
  const lowerQuestion = question.toLowerCase();
  
  // Analyze the question type and context
  let answer = '';
  let confidence = 75;
  let sources: string[] = [];
  let suggestions: string[] = [];

  // Check for specific compliance topics
  if (lowerQuestion.includes('overdue') || lowerQuestion.includes('expired')) {
    const overduCount = context.overduItems.length;
    answer = overduCount > 0 
      ? `You have ${overduCount} overdue compliance items. The most urgent are: ${context.overduItems.slice(0, 3).map((item: any) => `${item.compliance_assets?.name} (due ${item.next_due_date})`).join(', ')}`
      : 'Great news! You have no overdue compliance items currently.';
    
    sources.push('Building compliance assets database');
    suggestions.push('Schedule inspections for overdue items');
    suggestions.push('Contact certified contractors for urgent items');
    confidence = 90;
    
  } else if (lowerQuestion.includes('gas') || lowerQuestion.includes('cp12')) {
    const gasAssets = context.assets.filter((asset: any) => 
      asset.compliance_assets?.category?.toLowerCase().includes('gas')
    );
    answer = gasAssets.length > 0
      ? `You have ${gasAssets.length} gas safety assets. Next due dates: ${gasAssets.map((a: any) => `${a.compliance_assets?.name}: ${a.next_due_date || 'Not scheduled'}`).join(', ')}`
      : 'No gas safety assets found in your portfolio.';
    
    sources.push('Gas safety compliance records');
    suggestions.push('Ensure annual gas safety checks');
    suggestions.push('Keep CP12 certificates current');
    
  } else if (lowerQuestion.includes('electrical') || lowerQuestion.includes('eicr')) {
    const electricalAssets = context.assets.filter((asset: any) => 
      asset.compliance_assets?.category?.toLowerCase().includes('electrical')
    );
    answer = electricalAssets.length > 0
      ? `You have ${electricalAssets.length} electrical assets. Status: ${electricalAssets.map((a: any) => `${a.compliance_assets?.name}: ${a.status || 'Unknown'}`).join(', ')}`
      : 'No electrical compliance assets found.';
    
    sources.push('Electrical safety compliance records');
    suggestions.push('Schedule EICR inspections every 5 years (or 1 year for HMOs)');
    suggestions.push('Address any C2 or C1 defects immediately');
    
  } else if (lowerQuestion.includes('fire') || lowerQuestion.includes('fra')) {
    const fireAssets = context.assets.filter((asset: any) => 
      asset.compliance_assets?.category?.toLowerCase().includes('fire')
    );
    answer = fireAssets.length > 0
      ? `Fire safety status: ${fireAssets.map((a: any) => `${a.compliance_assets?.name}: ${a.status || 'Pending'}`).join(', ')}`
      : 'No fire safety assessments found. Consider scheduling Fire Risk Assessments.';
    
    sources.push('Fire safety compliance records');
    suggestions.push('Ensure annual fire risk assessments');
    suggestions.push('Keep fire safety equipment serviced');
    
  } else if (lowerQuestion.includes('document') || lowerQuestion.includes('certificate')) {
    answer = `You have ${context.documentsCount} compliance documents uploaded. Recent uploads include: ${context.documents.slice(0, 3).map((doc: any) => doc.document_type).join(', ')}`;
    sources.push(`${context.documentsCount} compliance documents`);
    suggestions.push('Regularly upload new certificates and reports');
    suggestions.push('Review AI-extracted data for accuracy');
    
  } else if (lowerQuestion.includes('cost') || lowerQuestion.includes('budget')) {
    // Estimate costs based on asset types
    const assetCount = context.assets.length;
    const estimatedAnnualCost = assetCount * 200; // Rough estimate
    answer = `Based on your ${assetCount} compliance assets, estimated annual compliance costs are approximately £${estimatedAnnualCost}. This includes inspections, certifications, and basic maintenance.`;
    sources.push('Compliance asset analysis');
    suggestions.push('Budget for regular inspections');
    suggestions.push('Consider annual service contracts');
    confidence = 60; // Lower confidence for cost estimates
    
  } else {
    // General response
    const totalAssets = context.assets.length;
    const totalDocs = context.documentsCount;
    answer = `Your compliance portfolio includes ${totalAssets} assets across ${context.buildings.length} properties with ${totalDocs} documents. ${context.overduItems.length > 0 ? `${context.overduItems.length} items are overdue and need attention.` : 'All items are current.'}`;
    
    sources.push('Complete compliance database');
    suggestions.push('Review upcoming due dates regularly');
    suggestions.push('Upload certificates promptly after inspections');
    suggestions.push('Use AI document analysis for data extraction');
    confidence = 80;
  }

  // Add context-specific suggestions
  if (context.overduItems.length > 0) {
    suggestions.push(`Priority: Address ${context.overduItems.length} overdue items`);
  }

  if (context.documentsCount > 0) {
    suggestions.push('Review AI-extracted data for accuracy');
  }

  return {
    answer,
    confidence,
    sources,
    suggestions: [...new Set(suggestions)] // Remove duplicates
  };
}