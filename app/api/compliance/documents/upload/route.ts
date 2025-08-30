import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("📎 Uploading compliance document...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Parse the request body
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const assetId = formData.get('asset_id') as string;
    const buildingId = formData.get('building_id') as string;
    const title = formData.get('title') as string;
    const documentType = formData.get('document_type') as string;

    if (!file || !assetId || !buildingId) {
      return NextResponse.json({ 
        error: "Missing required fields: file, asset_id, and building_id are required" 
      }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Allowed types: PDF, JPEG, PNG, GIF, DOC, DOCX" 
      }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 10MB" 
      }, { status: 400 });
    }

    // Auto-classify document type based on filename and asset
    let autoClassifiedType = documentType || 'Certificate';
    const fileName = file.name.toLowerCase();
    
    if (fileName.includes('certificate') || fileName.includes('cert')) {
      autoClassifiedType = 'Certificate';
    } else if (fileName.includes('report') || fileName.includes('assessment')) {
      autoClassifiedType = 'Report';
    } else if (fileName.includes('inspection') || fileName.includes('check')) {
      autoClassifiedType = 'Inspection Report';
    } else if (fileName.includes('test') || fileName.includes('pat')) {
      autoClassifiedType = 'Test Certificate';
    } else if (fileName.includes('notice') || fileName.includes('s20')) {
      autoClassifiedType = 'Section 20 Notice';
    } else if (fileName.includes('quote') || fileName.includes('estimate')) {
      autoClassifiedType = 'Quote/Estimate';
    } else if (fileName.includes('invoice') || fileName.includes('bill')) {
      autoClassifiedType = 'Invoice';
    }

    // Upload file to Supabase Storage
    const fileNameStorage = `compliance/${buildingId}/${assetId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-documents')
      .upload(fileNameStorage, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("❌ File upload failed:", uploadError);
      return NextResponse.json({ 
        error: "Failed to upload file",
        details: uploadError.message 
      }, { status: 500 });
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('compliance-documents')
      .getPublicUrl(fileNameStorage);

    // Save document record to database
    const { data: document, error: documentError } = await supabase
      .from("compliance_docs")
      .insert({
        building_id: parseInt(buildingId),
        compliance_item_id: parseInt(assetId),
        doc_type: autoClassifiedType,
        doc_url: publicUrl,
        uploaded_by: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (documentError) {
      console.error("❌ Failed to save document record:", documentError);
      return NextResponse.json({ 
        error: "Failed to save document record",
        details: documentError.message 
      }, { status: 500 });
    }

    console.log("✅ Compliance document uploaded successfully:", document.id);

    // Update the building asset's last_checked date if this is a certificate/report
    if (['Certificate', 'Report', 'Inspection Report', 'Test Certificate'].includes(autoClassifiedType)) {
      const { error: updateError } = await supabase
        .from("building_assets")
        .update({ 
          last_checked: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("building_id", parseInt(buildingId))
        .eq("compliance_item_id", parseInt(assetId));

      if (updateError) {
        console.warn("⚠️ Failed to update building asset last_checked:", updateError);
      } else {
        console.log("✅ Updated building asset last_checked date");
      }
    }

    const responseData = {
      message: "Compliance document uploaded successfully",
      document: {
        id: document.id,
        title: title || file.name,
        document_type: autoClassifiedType,
        file_url: document.doc_url,
        uploaded_at: document.created_at,
        building_id: document.building_id,
        compliance_item_id: document.compliance_item_id
      },
      auto_classified: autoClassifiedType !== documentType,
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        file_name: fileNameStorage,
        original_name: file.name,
        file_size: file.size
      }
    };

    console.log("🎉 Compliance document upload completed successfully");

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Compliance document upload error:", error);
    return NextResponse.json({ 
      error: "Internal server error during document upload",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 