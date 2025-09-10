import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("📋 Fetching communication templates...");
    
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Fetch communication templates with error handling
    const { data: templates, error: templatesError } = await supabase
      .from("communication_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (templatesError) {
      console.error("❌ Error fetching templates:", templatesError);
      
      // If table doesn't exist, return empty array instead of error
      if (templatesError.code === '42P01') { // Table doesn't exist
        console.log("⚠️ Communication templates table doesn't exist, returning empty array");
        return NextResponse.json({
          templates: [],
          count: 0
        });
      }
      
      return NextResponse.json({ 
        error: "Failed to fetch templates",
        details: templatesError
      }, { status: 500 });
    }

    console.log(`✅ Found ${templates?.length || 0} templates`);

    return NextResponse.json({
      templates: templates || [],
      count: templates?.length || 0
    });

  } catch (error) {
    console.error("❌ Templates fetch error:", error);
    return NextResponse.json({ 
      error: "Internal server error during templates fetch",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("📝 Creating new communication template...");
    
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Parse the request body
    const body = await req.json();
    const { 
      name, 
      description, 
      type, 
      category, 
      body: templateBody, 
      subject, 
      placeholders = [] 
    } = body;

    if (!name || !type || !templateBody) {
      return NextResponse.json({ 
        error: "Missing required fields: name, type, body" 
      }, { status: 400 });
    }

    // Create the template
    const { data: template, error: createError } = await supabase
      .from("communication_templates")
      .insert({
        name,
        description: description || null,
        type,
        category: category || 'general',
        body: templateBody,
        subject: subject || null,
        placeholders,
        is_active: true,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error("❌ Error creating template:", createError);
      return NextResponse.json({ 
        error: "Failed to create template",
        details: createError
      }, { status: 500 });
    }

    console.log("✅ Template created successfully:", template.id);

    return NextResponse.json({
      template,
      message: "Template created successfully"
    });

  } catch (error) {
    console.error("❌ Template creation error:", error);
    return NextResponse.json({ 
      error: "Internal server error during template creation",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 