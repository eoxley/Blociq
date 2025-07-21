import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// GET /api/communications/templates - List all templates
export async function GET(req: NextRequest) {
  try {
    console.log("📋 Fetching communication templates...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from("communication_templates")
      .select("*")
      .eq("is_active", true)
      .order("last_used_at", { ascending: false, nullsLast: true })
      .order("created_at", { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq("type", type);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: templates, error: templatesError } = await query;

    if (templatesError) {
      console.error("❌ Failed to fetch templates:", templatesError);
      return NextResponse.json({ 
        error: "Failed to fetch templates",
        details: (templatesError as any).message || "Unknown error"
      }, { status: 500 });
    }

    console.log("✅ Templates fetched successfully:", templates?.length || 0);

    // Get usage statistics
    const { data: stats } = await supabase
      .from("template_usage_stats")
      .select("*");

    const responseData = {
      message: "Communication templates fetched successfully",
      templates: templates || [],
      stats: stats || [],
      filters: {
        type,
        category,
        search
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        templates_count: templates?.length || 0
      }
    };

    console.log("🎉 Communication templates list completed successfully");
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Communication templates error:", error);
    return NextResponse.json({ 
      error: "Internal server error during templates fetch",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// POST /api/communications/templates - Create new template
export async function POST(req: NextRequest) {
  try {
    console.log("📝 Creating new communication template...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    const body = await req.json();
    const { 
      name, 
      description, 
      type, 
      category, 
      body: templateBody, 
      placeholders, 
      subject 
    } = body;

    console.log("📋 Received template data:", {
      name,
      description: description ? `${description.substring(0, 50)}...` : null,
      type,
      category,
      body_length: templateBody?.length || 0,
      placeholders_count: placeholders?.length || 0
    });

    // Validation
    if (!name || !name.trim()) {
      console.error("❌ Validation failed: Missing or empty name");
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    if (!type || !['email', 'letter', 'notice'].includes(type)) {
      console.error("❌ Validation failed: Invalid type");
      return NextResponse.json({ error: "Valid type (email, letter, notice) is required" }, { status: 400 });
    }

    if (!templateBody || !templateBody.trim()) {
      console.error("❌ Validation failed: Missing or empty body");
      return NextResponse.json({ error: "Template body is required" }, { status: 400 });
    }

    // Prepare template data
    const templateData = {
      name: name.trim(),
      description: description?.trim() || null,
      type,
      category: category || 'general',
      body: templateBody.trim(),
      placeholders: placeholders || [],
      subject: subject?.trim() || null,
      uploaded_by: user.id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("🔄 Inserting template into database...");

    const { data: newTemplate, error: insertError } = await supabase
      .from("communication_templates")
      .insert(templateData)
      .select("*")
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      return NextResponse.json({ 
        error: "Failed to create template",
        details: (insertError as any).message || "Unknown error"
      }, { status: 500 });
    }

    console.log("✅ Template created successfully:", {
      id: newTemplate.id,
      name: newTemplate.name,
      type: newTemplate.type
    });

    const responseData = {
      message: "Communication template created successfully",
      template: {
        id: newTemplate.id,
        name: newTemplate.name,
        description: newTemplate.description,
        type: newTemplate.type,
        category: newTemplate.category,
        body: newTemplate.body,
        placeholders: newTemplate.placeholders,
        subject: newTemplate.subject,
        created_at: newTemplate.created_at
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString()
      }
    };

    console.log("🎉 Communication template creation completed successfully");
    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error("❌ Communication template creation error:", error);
    return NextResponse.json({ 
      error: "Internal server error during template creation",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 