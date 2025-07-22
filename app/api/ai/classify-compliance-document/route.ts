import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("🧠 AI classifying compliance document...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Parse the request body
    const body = await req.json();
    const { file_url, file_name, building_id } = body;

    if (!file_url || !file_name || !building_id) {
      return NextResponse.json({ 
        error: "Missing required fields: file_url, file_name, building_id" 
      }, { status: 400 });
    }

    // Fetch building compliance assets for classification
    const { data: buildingAssets, error: assetsError } = await supabase
      .from("building_assets")
      .select(`
        *,
        compliance_items (
          id,
          item_type,
          category,
          frequency,
          assigned_to,
          notes
        )
      `)
      .eq("building_id", parseInt(building_id))
      .eq("applies", true);

    if (assetsError) {
      console.error("❌ Failed to fetch building assets:", assetsError);
      return NextResponse.json({ 
        error: "Failed to fetch building compliance assets",
        details: assetsError.message 
      }, { status: 500 });
    }

    console.log("✅ Building assets fetched:", buildingAssets?.length || 0);

    // AI Classification Logic
    const classificationResult = await classifyDocument(file_name, buildingAssets || []);

    // Log the classification query
    const { error: logError } = await supabase
      .from("ai_logs")
      .insert({
        user_id: user.id,
        question: `Classify compliance document: ${file_name}`,
        response: JSON.stringify(classificationResult),
        timestamp: new Date().toISOString()
      });

    if (logError) {
      console.warn("⚠️ Could not log AI query:", logError);
    }

    const responseData = {
      message: "Document classified successfully",
      classification: classificationResult,
      debug_info: {
        user_id: user.id,
        file_name,
        building_id,
        timestamp: new Date().toISOString(),
        available_assets: buildingAssets?.length || 0
      }
    };

    console.log("🎉 AI classification completed successfully");
    console.log("📊 Classification result:", classificationResult);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ AI classification error:", error);
    return NextResponse.json({ 
      error: "Internal server error during AI classification",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

async function classifyDocument(fileName: string, buildingAssets: any[]): Promise<{
  asset_id: string;
  asset_name: string;
  confidence: number;
  doc_type: string;
}> {
  const fileNameLower = fileName.toLowerCase();
  
  // Define classification patterns
  const patterns = [
    // Fire Safety
    {
      keywords: ['fire', 'fra', 'fire risk assessment', 'fire safety'],
      docType: 'Fire Risk Assessment',
      category: 'Fire'
    },
    // Gas Safety
    {
      keywords: ['gas', 'gas safety', 'gas certificate', 'corgi'],
      docType: 'Gas Safety Certificate',
      category: 'Gas'
    },
    // Electrical
    {
      keywords: ['electrical', 'eicr', 'electrical certificate', 'pat', 'portable appliance'],
      docType: 'Electrical Safety Certificate',
      category: 'Electrical'
    },
    // Lift
    {
      keywords: ['lift', 'elevator', 'lift certificate', 'lift maintenance'],
      docType: 'Lift Maintenance Certificate',
      category: 'Equipment'
    },
    // Asbestos
    {
      keywords: ['asbestos', 'asbestos survey', 'asbestos report'],
      docType: 'Asbestos Survey',
      category: 'Health'
    },
    // Energy
    {
      keywords: ['energy', 'epc', 'energy performance', 'energy certificate'],
      docType: 'Energy Performance Certificate',
      category: 'Energy'
    },
    // Insurance
    {
      keywords: ['insurance', 'building insurance', 'insurance certificate'],
      docType: 'Building Insurance Certificate',
      category: 'Insurance'
    },
    // Water
    {
      keywords: ['water', 'water hygiene', 'legionella', 'water testing'],
      docType: 'Water Hygiene Certificate',
      category: 'Health'
    },
    // Section 20
    {
      keywords: ['section 20', 's20', 'notice', 'consultation'],
      docType: 'Section 20 Notice',
      category: 'General'
    },
    // General certificates
    {
      keywords: ['certificate', 'cert', 'inspection', 'test'],
      docType: 'Certificate',
      category: 'General'
    }
  ];

  // Find matching pattern
  let bestMatch = null;
  let highestConfidence = 0;

  for (const pattern of patterns) {
    const matches = pattern.keywords.filter(keyword => 
      fileNameLower.includes(keyword)
    ).length;
    
    const confidence = (matches / pattern.keywords.length) * 100;
    
    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestMatch = pattern;
    }
  }

  // Find the best matching asset
  let bestAsset = null;
  let assetConfidence = 0;

  if (bestMatch) {
    for (const asset of buildingAssets) {
      const assetName = asset.compliance_items?.item_type?.toLowerCase() || '';
      const assetCategory = asset.compliance_items?.category?.toLowerCase() || '';
      
      // Check if asset name or category matches the pattern
      const nameMatch = bestMatch.keywords.some(keyword => 
        assetName.includes(keyword)
      );
      const categoryMatch = assetCategory === bestMatch.category.toLowerCase();
      
      const matchScore = (nameMatch ? 0.7 : 0) + (categoryMatch ? 0.3 : 0);
      
      if (matchScore > assetConfidence) {
        assetConfidence = matchScore;
        bestAsset = asset;
      }
    }
  }

  // Calculate final confidence
  const finalConfidence = Math.min(95, highestConfidence * (assetConfidence || 0.5));

  // Return classification result
  if (bestAsset && finalConfidence > 30) {
    return {
      asset_id: bestAsset.compliance_item_id.toString(),
      asset_name: bestAsset.compliance_items?.item_type || 'Unknown Asset',
      confidence: Math.round(finalConfidence),
      doc_type: bestMatch?.docType || 'Certificate'
    };
  } else {
    // Fallback to first available asset
    const fallbackAsset = buildingAssets[0];
    return {
      asset_id: fallbackAsset?.compliance_item_id?.toString() || '1',
      asset_name: fallbackAsset?.compliance_items?.item_type || 'General Compliance',
      confidence: 25,
      doc_type: 'Certificate'
    };
  }
} 