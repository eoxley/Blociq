import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    console.log("📎 Uploading document to major works project...");
    
    const { projectId } = await params;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);
    console.log("🏗️ Project ID:", projectId);

    // Verify the project exists
    const { data: project, error: projectError } = await supabase
      .from("major_works_projects")
      .select("id, title, building_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("❌ Project not found:", projectError);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.log("✅ Project verified:", project.title);

    // Parse the request body
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const documentType = formData.get('document_type') as string;
    const isPublic = formData.get('is_public') === 'true';

    if (!file || !title || !documentType) {
      return NextResponse.json({ 
        error: "Missing required fields: file, title, and document_type are required" 
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

    // Upload file to Supabase Storage
    const fileName = `${projectId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('major-works-documents')
      .upload(fileName, file, {
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
      .from('major-works-documents')
      .getPublicUrl(fileName);

    // Save document record to database
    const { data: document, error: documentError } = await supabase
      .from("major_works_documents")
      .insert({
        project_id: projectId,
        title: title,
        description: description || null,
        document_type: documentType,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
        is_public: isPublic
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

    console.log("✅ Document uploaded successfully:", document.id);

    // Add a log entry for the document upload
    await supabase
      .from("major_works_logs")
      .insert({
        project_id: projectId,
        action: "Document Uploaded",
        description: `Document "${title}" uploaded to project`,
        metadata: {
          document_id: document.id,
          document_type: documentType,
          file_size: file.size,
          uploaded_by: user.id
        },
        created_by: user.id
      });

    const responseData = {
      message: "Document uploaded successfully",
      document: {
        id: document.id,
        title: document.title,
        description: document.description,
        document_type: document.document_type,
        file_url: document.file_url,
        file_size: document.file_size,
        file_type: document.file_type,
        uploaded_at: document.uploaded_at,
        is_public: document.is_public
      },
      project: {
        id: project.id,
        title: project.title,
        building_id: project.building_id
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        file_name: fileName,
        original_name: file.name
      }
    };

    console.log("🎉 Document upload completed successfully");

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Document upload error:", error);
    return NextResponse.json({ 
      error: "Internal server error during document upload",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    console.log("📎 Fetching documents for major works project...");
    
    const { projectId } = await params;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);
    console.log("🏗️ Project ID:", projectId);

    // Get URL parameters for filtering
    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get('document_type');
    const isPublic = searchParams.get('is_public');

    // Build the query
    let query = supabase
      .from("major_works_documents")
      .select("*")
      .eq("project_id", projectId)
      .order("uploaded_at", { ascending: false });

    // Apply filters
    if (documentType) {
      query = query.eq("document_type", documentType);
    }

    if (isPublic !== null) {
      query = query.eq("is_public", isPublic === 'true');
    }

    const { data: documents, error: documentsError } = await query;

    if (documentsError) {
      console.error("❌ Failed to fetch documents:", documentsError);
      return NextResponse.json({ 
        error: "Failed to fetch documents",
        details: documentsError.message 
      }, { status: 500 });
    }

    console.log("✅ Documents fetched successfully:", documents?.length || 0);

    // Group documents by type
    const documentsByType = documents?.reduce((acc: any, doc: any) => {
      const type = doc.document_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(doc);
      return acc;
    }, {}) || {};

    const responseData = {
      message: "Documents fetched successfully",
      project_id: projectId,
      documents: documents || [],
      documents_by_type: documentsByType,
      summary: {
        total_documents: documents?.length || 0,
        document_types: Object.keys(documentsByType),
        public_documents: documents?.filter(d => d.is_public).length || 0,
        private_documents: documents?.filter(d => !d.is_public).length || 0
      },
      filters_applied: {
        document_type: documentType,
        is_public: isPublic
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        documents_count: documents?.length || 0
      }
    };

    console.log("🎉 Documents fetch completed successfully");

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Documents fetch error:", error);
    return NextResponse.json({ 
      error: "Internal server error during documents fetch",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 