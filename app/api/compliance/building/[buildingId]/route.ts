import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    console.log("🏢 Fetching building compliance data...");
    
    const { buildingId } = await params;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);
    console.log("🏢 Building ID:", buildingId);

    // Get URL parameters
    const { searchParams } = new URL(req.url);
    const includeDocuments = searchParams.get('include_documents') === 'true';

    // Fetch building compliance assets with compliance items
    const { data: buildingAssets, error: assetsError } = await supabase
      .from("building_assets")
      .select(`
        *,
        compliance_items (
          id,
          item_type,
          category,
          frequency,
          status,
          assigned_to,
          notes
        )
      `)
      .eq("building_id", parseInt(buildingId));

    if (assetsError) {
      console.error("❌ Failed to fetch building assets:", assetsError);
      return NextResponse.json({ 
        error: "Failed to fetch building compliance assets",
        details: assetsError.message 
      }, { status: 500 });
    }

    console.log("✅ Building assets fetched:", buildingAssets?.length || 0);

    // Transform and enhance the data
    const enhancedAssets = await Promise.all((buildingAssets || []).map(async (asset) => {
      const complianceItem = asset.compliance_items;
      
      // Calculate status based on dates
      let status: 'compliant' | 'overdue' | 'missing' | 'due_soon' = 'missing';
      
      if (asset.applies && asset.next_due) {
        const dueDate = new Date(asset.next_due);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) {
          status = 'overdue';
        } else if (daysUntilDue <= 30) {
          status = 'due_soon';
        } else {
          status = 'compliant';
        }
      }

      // Fetch documents if requested
      let documents: Array<{
        id: string;
        title: string;
        document_type: string;
        file_url: string;
        file_size: number;
        uploaded_at: string;
        is_public: boolean;
      }> = [];
      
      if (includeDocuments) {
        const { data: docs, error: docsError } = await supabase
          .from("compliance_docs")
          .select("*")
          .eq("building_id", parseInt(buildingId))
          .eq("compliance_item_id", asset.compliance_item_id)
          .order("created_at", { ascending: false });

        if (!docsError && docs) {
          documents = docs.map(doc => ({
            id: doc.id,
            title: doc.doc_type || 'Compliance Document',
            document_type: doc.doc_type || 'Certificate',
            file_url: doc.doc_url || '',
            file_size: 0, // Not stored in current schema
            uploaded_at: doc.created_at || doc.uploaded_at || '',
            is_public: true // Default to public for compliance docs
          }));
        }
      }

      return {
        id: asset.id.toString(),
        name: complianceItem?.item_type || 'Unknown Item',
        description: `Compliance requirement for ${complianceItem?.item_type || 'building asset'}`,
        category: complianceItem?.category || 'General',
        required_if: 'always' as const, // Default for existing items
        default_frequency: complianceItem?.frequency || '1 year',
        applies: asset.applies,
        last_checked: asset.last_checked,
        next_due: asset.next_due,
        notes: asset.notes,
        status,
        documents,
        compliance_item_id: asset.compliance_item_id,
        assigned_to: complianceItem?.assigned_to,
        created_at: asset.created_at,
        updated_at: asset.updated_at
      };
    }));

    // Calculate summary statistics
    const total = enhancedAssets.filter(asset => asset.applies).length;
    const compliant = enhancedAssets.filter(asset => asset.status === 'compliant').length;
    const overdue = enhancedAssets.filter(asset => asset.status === 'overdue').length;
    const missing = enhancedAssets.filter(asset => asset.status === 'missing').length;
    const dueSoon = enhancedAssets.filter(asset => asset.status === 'due_soon').length;

    // Group by category
    const assetsByCategory = enhancedAssets.reduce((groups, asset) => {
      const category = asset.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(asset);
      return groups;
    }, {} as Record<string, any[]>);

    const responseData = {
      message: "Building compliance data fetched successfully",
      building_id: buildingId,
      summary: {
        total,
        compliant,
        overdue,
        missing,
        dueSoon
      },
      assets: enhancedAssets,
      assets_by_category: assetsByCategory,
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        assets_count: enhancedAssets.length,
        include_documents: includeDocuments
      }
    };

    console.log("🎉 Building compliance data fetch completed successfully");
    console.log("📊 Summary:", {
      total,
      compliant,
      overdue,
      missing,
      dueSoon
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Building compliance fetch error:", error);
    return NextResponse.json({ 
      error: "Internal server error during compliance data fetch",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 