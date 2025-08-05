// ✅ SMART BLOCIQ BUILDING CONTEXT API [2025-01-15]
// - Enhanced building detection from prompts
// - Comprehensive compliance and todo context
// - Smart context assembly with metadata
// - Proper error handling and logging

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if request is FormData (file upload) or JSON
    const contentType = req.headers.get('content-type') || '';
    let prompt = '';
    let building_id = '';
    let document_ids: string[] = [];
    let leaseholder_id = '';
    let contextType = 'general';
    let contextId = '';
    let uploadedFiles: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await req.formData();
      prompt = formData.get('message') as string || formData.get('prompt') as string || '';
      building_id = formData.get('building_id') as string || '';
      contextType = formData.get('context_type') as string || formData.get('contextType') as string || 'general';
      contextId = formData.get('context_id') as string || '';
      
      // Extract uploaded files
      const files = formData.getAll('file') as File[];
      uploadedFiles = files.filter(file => file instanceof File);
      
      console.log('📁 Received file upload:', uploadedFiles.length, 'files');
    } else {
      // Handle JSON request
      const body = await req.json();
      prompt = body.prompt || '';
      building_id = body.building_id || '';
      document_ids = body.document_ids || [];
      leaseholder_id = body.leaseholder_id || '';
      contextType = body.context_type || body.contextType || 'general';
      contextId = body.context_id || '';
    }

    if (!prompt && uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'Missing prompt or files' }, { status: 400 });
    }

    let buildingContext = "";
    let contextMetadata: any = {};
    let systemPrompt = `You are BlocIQ, an AI assistant for UK leasehold property managers. Use British English. Be legally accurate and cite documents or founder guidance where relevant. If unsure, advise the user to refer to legal documents or professional advice.\n\n`;

    // 🏢 Smart Building Detection from Prompt
    if (!building_id) {
      console.log('🔍 Auto-detecting building from prompt...');
      
      // Extract potential building names from the question
      const buildingKeywords = ['house', 'court', 'building', 'apartment', 'residence', 'manor', 'gardens', 'heights', 'view', 'plaza'];
      const words = prompt.toLowerCase().split(/\s+/);
      
      for (let i = 0; i < words.length - 1; i++) {
        const potentialName = words.slice(i, i + 2).join(' '); // Check 2-word combinations
        if (buildingKeywords.some(keyword => potentialName.includes(keyword))) {
          console.log('🔍 Searching for building:', potentialName);
          
          const { data: building } = await supabase
            .from('buildings')
            .select('id, name, unit_count, address')
            .ilike('name', `%${potentialName}%`)
            .maybeSingle();
          
          if (building) {
            contextMetadata.buildingDetected = true;
            contextMetadata.buildingName = building.name;
            contextMetadata.building_id = building.id;
            buildingContext += `Building: ${building.name}\nUnits: ${building.unit_count || 'Unknown'}\nAddress: ${building.address || 'Not specified'}\n\n`;
            console.log('✅ Found building context:', building.name);
            break;
          }
        }
      }
    }

    // 🏢 Additional Context from Building ID
    if (building_id) {
      console.log('🏢 Fetching context for building ID:', building_id);
      
      const { data: building } = await supabase
        .from('buildings')
        .select('id, name, unit_count, address')
        .eq('id', building_id)
        .maybeSingle();

      if (building) {
        contextMetadata.buildingName = building.name;
        buildingContext += `Building: ${building.name}\nUnits: ${building.unit_count || 'Unknown'}\nAddress: ${building.address || 'Not specified'}\n\n`;
      }

      // 📋 Building Todos
      try {
        const { data: todos } = await supabase
          .from('building_todos')
          .select('title, description, status, priority, due_date')
          .eq('building_id', building_id)
          .order('due_date', { ascending: true })
          .limit(10);

        if (todos && todos.length > 0) {
          const todoContext = todos.map(todo =>
            `- ${todo.title} (${todo.status}, ${todo.priority} priority, due: ${todo.due_date})`
          ).join('\n');
          buildingContext += `Open Tasks:\n${todoContext}\n\n`;
          contextMetadata.todoCount = todos.length;
        }
      } catch (error) {
        console.warn('Could not fetch building todos:', error);
      }

      // ⚠️ Compliance Issues
      try {
        const { data: compliance } = await supabase
          .from('compliance_items')
          .select('item_name, status, due_date, priority')
          .eq('building_id', building_id)
          .in('status', ['overdue', 'pending'])
          .order('due_date', { ascending: true })
          .limit(10);

        if (compliance && compliance.length > 0) {
          const complianceContext = compliance.map(item =>
            `- ${item.item_name} (${item.status}, ${item.priority} priority, due: ${item.due_date})`
          ).join('\n');
          buildingContext += `Compliance Issues:\n${complianceContext}\n\n`;
          contextMetadata.complianceCount = compliance.length;
        }
      } catch (error) {
        console.warn('Could not fetch compliance items:', error);
      }

      // 📄 Key Documents
      try {
        const { data: documents } = await supabase
          .from('building_documents')
          .select('doc_type, doc_name, upload_date')
          .eq('building_id', building_id)
          .order('upload_date', { ascending: false })
          .limit(5);

        if (documents && documents.length > 0) {
          const docContext = documents.map(doc =>
            `- ${doc.doc_name} (${doc.doc_type}, uploaded: ${doc.upload_date})`
          ).join('\n');
          buildingContext += `Key Documents:\n${docContext}\n\n`;
          contextMetadata.documentCount = documents.length;
        }
      } catch (error) {
        console.warn('Could not fetch building documents:', error);
      }
    }

    // 🏠 Smart Unit and Leaseholder Lookup
    let unit = null;
    let leaseholder = null;
    
    console.log('🔍 Looking for unit and leaseholder references in prompt...');
    
    // Enhanced unit detection patterns
    const unitPatterns = [
      /(?:flat|apartment|unit|flat)\s+(\d+[a-z]?)/gi,
      /(\d+[a-z]?)\s+(?:flat|apartment|unit)/gi,
      /flat\s+(\d+[a-z]?)/gi,
      /apartment\s+(\d+[a-z]?)/gi,
      /unit\s+(\d+[a-z]?)/gi,
      /(\d+[a-z]?)\s+ashwood/gi,
      /ashwood\s+(\d+[a-z]?)/gi
    ];
    
    let unitNumber = null;
    let detectedBuildingName = null;
    
    // First, try to extract building name from the prompt
    const buildingKeywords = ['ashwood', 'house', 'court', 'building', 'apartment', 'residence', 'manor', 'gardens', 'heights', 'view', 'plaza'];
    const words = prompt.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < words.length - 1; i++) {
      const potentialName = words.slice(i, i + 2).join(' '); // Check 2-word combinations
      if (buildingKeywords.some(keyword => potentialName.includes(keyword))) {
        console.log('🔍 Detected potential building name:', potentialName);
        detectedBuildingName = potentialName;
        break;
      }
    }
    
    // Extract unit number from prompt
    for (const pattern of unitPatterns) {
      const match = prompt.match(pattern);
      if (match) {
        unitNumber = match[1];
        console.log('🔍 Found unit reference:', unitNumber);
        break;
      }
    }
    
    if (unitNumber) {
      console.log('🔍 Looking up unit:', unitNumber);
      
      // Determine which building to search in
      let targetBuildingId = building_id || contextMetadata.building_id;
      
      // If we have a detected building name but no building_id, try to find the building
      if (!targetBuildingId && detectedBuildingName) {
        console.log('🔍 Searching for building by name:', detectedBuildingName);
        const { data: buildingMatch } = await supabase
          .from('buildings')
          .select('id, name')
          .ilike('name', `%${detectedBuildingName}%`)
          .maybeSingle();
        
        if (buildingMatch) {
          targetBuildingId = buildingMatch.id;
          console.log('✅ Found building:', buildingMatch.name);
        }
      }
      
      if (targetBuildingId) {
        // Look up the unit with enhanced query
        const { data: unitData } = await supabase
          .from("units")
          .select(`
            id, 
            unit_number, 
            leaseholder_id, 
            building_id,
            buildings(name)
          `)
          .eq("building_id", targetBuildingId)
          .ilike("unit_number", `%${unitNumber}%`)
          .maybeSingle();

        if (unitData) {
          unit = unitData;
          const buildingName = unitData.buildings?.[0]?.name;
          console.log('✅ Found unit:', unitData.unit_number, 'in', buildingName);
          
          // Look up the leaseholder
          if (unitData.leaseholder_id) {
            const { data: leaseholderData } = await supabase
              .from("leaseholders")
              .select("id, name, email, phone")
              .eq("id", unitData.leaseholder_id)
              .maybeSingle();

            if (leaseholderData) {
              leaseholder = leaseholderData;
              console.log('✅ Found leaseholder:', leaseholderData.name);
              
              // Add leaseholder context to building context
              buildingContext += `Unit: ${unitData.unit_number}\nLeaseholder: ${leaseholderData.name}\nEmail: ${leaseholderData.email || 'Not provided'}\nPhone: ${leaseholderData.phone || 'Not provided'}\n\n`;
              
              // Update context metadata
              contextMetadata.unit_number = unitData.unit_number;
              contextMetadata.leaseholder_name = leaseholderData.name;
              contextMetadata.leaseholder_id = leaseholderData.id;
              contextMetadata.leaseholder_email = leaseholderData.email;
              contextMetadata.leaseholder_phone = leaseholderData.phone;
              contextMetadata.building_name = buildingName;
              
              // Enhanced system prompt for leaseholder context
              systemPrompt += `\nThe user is asking about unit ${unitData.unit_number} in ${buildingName || 'this building'}. The leaseholder is ${leaseholderData.name} (${leaseholderData.email || 'no email'}). Only share information that complies with UK GDPR and data protection regulations.`;
            }
          } else {
            console.log('⚠️ Unit found but no leaseholder assigned');
            buildingContext += `Unit: ${unitData.unit_number}\nLeaseholder: Not assigned\n\n`;
            contextMetadata.unit_number = unitData.unit_number;
            contextMetadata.building_name = buildingName;
          }
        } else {
          console.log('❌ Unit not found:', unitNumber);
          // Log failed match for debugging
          contextMetadata.failed_unit_match = unitNumber;
          contextMetadata.failed_building_search = detectedBuildingName;
        }
      } else {
        console.log('❌ No building context available for unit lookup');
        contextMetadata.failed_unit_match = unitNumber;
        contextMetadata.missing_building_context = true;
      }
    }

    // 📁 Process uploaded files if any
    if (uploadedFiles.length > 0) {
      console.log('📁 Processing uploaded files...');
      
      for (const file of uploadedFiles) {
        try {
          // Upload file to Supabase Storage
          const fileName = `${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('ai-documents')
            .upload(fileName, file);

          if (uploadError) {
            console.error('❌ File upload error:', uploadError);
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('ai-documents')
            .getPublicUrl(fileName);

          // Extract text from file (simplified - in production you'd use a proper parser)
          let fileContent = '';
          if (file.type === 'text/plain') {
            fileContent = await file.text();
          } else {
            // For PDF/DOCX, we'll add a placeholder (in production, use proper parsers)
            fileContent = `[Document: ${file.name}] - Content extraction would be implemented here.`;
          }

          // Add file content to context
          buildingContext += `\n📄 Document: ${file.name}\nContent: ${fileContent.substring(0, 1000)}${fileContent.length > 1000 ? '...' : ''}\n\n`;
          
          console.log('✅ File processed:', file.name);
        } catch (error) {
          console.error('❌ Error processing file:', file.name, error);
        }
      }
    }

    // 📎 Process document summaries if document_ids are provided
    if (document_ids?.length > 0) {
      console.log('📎 Fetching document summaries for:', document_ids.length, 'documents');
      
      const { data: summaries } = await supabase
        .from("document_summaries")
        .select("document_id, summary, file_name")
        .in("document_id", document_ids);

      if (summaries?.length) {
        const docSummaryText = summaries.map(doc =>
          `📎 ${doc.file_name}:\n${doc.summary}`
        ).join("\n\n");

        systemPrompt += `\n\nAttached Document Summaries:\n${docSummaryText}\n`;
        
        console.log('✅ Added', summaries.length, 'document summaries to prompt');
        contextMetadata.document_count = document_ids.length;
        contextMetadata.documents = summaries.map(s => s.file_name);
      } else {
        console.log('⚠️ No document summaries found for provided IDs');
      }
    }

    // 📝 Final System Prompt Assembly
    systemPrompt += buildingContext;

    console.log('📝 Calling OpenAI with context...');
    console.log('🏢 Building context length:', buildingContext.length);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt || 'Please analyze the uploaded documents.' }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const result = response.choices[0]?.message?.content || 'No response generated';

    console.log('✅ OpenAI response received');

    // 📊 Log to Supabase
    const { data: logData, error: logError } = await supabase
      .from('ai_logs')
      .insert({
        user_id: user.id,
        question: prompt,
        response: result,
        building_id: building_id || contextMetadata.building_id || null,
        building_name: contextMetadata.buildingName || null,
        document_count: document_ids.length,
        context_type: contextType,
        context_id: contextId || null,
        leaseholder_id: leaseholder?.id || leaseholder_id || null,
        unit_number: unit?.unit_number || null,
        metadata: contextMetadata.documents ? { documents: contextMetadata.documents } : null,
      })
      .select('id')
      .single();

    if (logError) {
      console.warn('Could not log AI interaction:', logError);
    }

    return NextResponse.json({
      success: true,
      result,
      ai_log_id: logData?.id,
      context_type: contextType,
      context_id: contextId || null,
      building_id: building_id || contextMetadata.building_id || null,
      building_name: contextMetadata.buildingName || null,
      document_count: document_ids.length,
      files_uploaded: uploadedFiles.length,
      leaseholder_id: leaseholder?.id || null,
      leaseholder_name: leaseholder?.name || null,
      unit_number: unit?.unit_number || null,
      documents: contextMetadata.documents || [],
      context: {
        ...contextMetadata,
        has_building_context: !!buildingContext.trim(),
        context_length: buildingContext.length,
        files_processed: uploadedFiles.length,
        has_leaseholder_context: !!leaseholder,
        has_unit_context: !!unit
      }
    });

  } catch (error) {
    console.error('❌ Error in ask-ai route:', error);
    return NextResponse.json({ 
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 