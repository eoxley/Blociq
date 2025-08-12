// ✅ UNIFIED AI ENDPOINT [2025-01-15]
// - Single endpoint for all AI functionality
// - Comprehensive building and document context
// - Proper logging to ai_logs table
// - Consistent response format
// - Support for file uploads and document analysis
// - Email reply generation support
// - Public access support (no auth for general questions)

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { insertAiLog } from '@/lib/supabase/ai_logs';
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_CHARS_PER_DOC, MAX_TOTAL_DOC_CHARS, truncate, isSummariseLike, slugify } from "@/lib/ask/text";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user (optional for public access)
    const { data: { user } } = await supabase.auth.getUser();
    const isPublicAccess = !user;

    // Check if request is FormData (file upload) or JSON
    const contentType = req.headers.get('content-type') || '';
    let prompt = '';
    let building_id = '';
    let document_ids: string[] = [];
    let leaseholder_id = '';
    let contextType = 'general';
    let contextId = '';
    let uploadedFiles: File[] = [];
    let emailThreadId = '';
    let tone = 'Professional';
    let isPublic = false;
    let uploadedMeta: any = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await req.formData();
      prompt = formData.get('message') as string || formData.get('prompt') as string || '';
      building_id = formData.get('building_id') as string || '';
      const docType = formData.get('doc_type') as string || null;
      contextType = formData.get('context_type') as string || formData.get('contextType') as string || 'general';
      contextId = formData.get('context_id') as string || '';
      emailThreadId = formData.get('email_thread_id') as string || '';
      tone = formData.get('tone') as string || 'Professional';
      isPublic = formData.get('is_public') === 'true';
      
      // Extract uploaded files
      const files = formData.getAll('file') as File[];
      uploadedFiles = files.filter(file => file instanceof File);
      
      console.log('📁 Received file upload:', uploadedFiles.length, 'files');
      
      // Handle file uploads if present
      let uploadedMeta = null;
      if (uploadedFiles.length > 0) {
        if (!building_id) {
          return NextResponse.json({ 
            error: 'building_id required for file upload',
            success: false
          }, { status: 400 });
        }
        
        try {
          const admin = createAdminClient();
          
          // Process each uploaded file
          for (const file of uploadedFiles) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const timestamp = Date.now();
            const fileName = slugify(file.name);
            const storagePath = `${building_id}/${timestamp}-${fileName}`;
            
            // Upload to Supabase Storage
            const { error: uploadError } = await admin.storage
              .from('building-docs')
              .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false
              });
            
            if (uploadError) {
              console.error('Storage upload failed:', uploadError);
              continue;
            }
            
            // Extract text content based on file type
            let textContent = '';
            if (file.type.startsWith('application/pdf')) {
              // For PDFs, we'll leave text_content empty for now
              // You can integrate with lib/extractTextFromPdf if available
              textContent = '';
            } else if (file.type.startsWith('text/')) {
              textContent = buffer.toString('utf8');
            }
            
            // Insert into building_documents table
            const { data: docData, error: insertError } = await admin
              .from('building_documents')
              .insert({
                building_id: building_id,
                file_name: file.name,
                type: docType || null,
                storage_path: storagePath,
                mime_type: file.type,
                size_bytes: file.size,
                text_content: textContent
              })
              .select('id')
              .single();
            
            if (insertError) {
              console.error('Database insert failed:', insertError);
              continue;
            }
            
            // Add to document_ids for processing
            document_ids.push(docData.id);
          }
          
          // Set uploaded metadata for response
          uploadedMeta = uploadedFiles.map(file => ({
            file_name: file.name,
            size: file.size,
            type: file.type
          }));
          
          // Set default prompt if empty
          if (!prompt) {
            prompt = "Summarise this document in ≤ 10 sentences, list 5–10 key points, then propose concrete next actions for a UK block manager.";
          }
          
          console.log('✅ Successfully processed', uploadedFiles.length, 'files');
          
        } catch (error) {
          console.error('Error processing file uploads:', error);
          return NextResponse.json({ 
            error: 'Failed to process file uploads',
            success: false
          }, { status: 500 });
        }
      }
    } else {
      // Handle JSON request
      const body = await req.json();
      prompt = body.prompt || body.question || '';
      building_id = body.building_id || body.buildingId || '';
      document_ids = body.document_ids || body.documentIds || [];
      leaseholder_id = body.leaseholder_id || body.leaseholderId || '';
      contextType = body.context_type || body.contextType || 'general';
      contextId = body.context_id || body.contextId || '';
      emailThreadId = body.email_thread_id || body.emailThreadId || '';
      tone = body.tone || 'Professional';
      isPublic = body.is_public || body.isPublic || false;
    }

    if (!prompt && uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'Missing prompt or files' }, { status: 400 });
    }

    // For public access, use simplified prompt
    if (isPublicAccess || isPublic) {
      console.log('🌐 Public AI request:', prompt.substring(0, 100) + '...');
      
      const systemPrompt = `You are BlocIQ, a helpful AI assistant for UK property management. 
      
Provide helpful, accurate advice about property management, compliance, tenant relations, maintenance, and general property-related topics. 
Keep responses concise, professional, and practical. If you don't have specific information, provide general guidance.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'No response generated';

      return NextResponse.json({ 
        success: true,
        response: aiResponse,
        result: aiResponse, // For backward compatibility
        context_type: 'public',
        building_id: null,
        document_count: 0,
        has_email_thread: false,
        has_leaseholder: false,
        context: {
          complianceUsed: false,
          majorWorksUsed: false
        }
      });
    }

    // Require authentication for private access
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
            contextMetadata.unit_count = building.unit_count;
            buildingContext += `Building: ${building.name}\nUnits: ${building.unit_count || 'Unknown'}\nAddress: ${building.address || 'Not specified'}\n\n`;
            
            // Add unit count to system prompt for better context
            systemPrompt += `\nThe building "${building.name}" contains ${building.unit_count || 'an unknown number of'} units.\n`;
            
            console.log('✅ Found building context:', building.name);
            break;
          }
        }
      }
    }

    // 🏢 Building Context (if building_id provided)
    if (building_id) {
      try {
        const { data: building } = await supabase
          .from('buildings')
          .select('id, name, unit_count, address')
          .eq('id', building_id)
          .single();

        if (building) {
          contextMetadata.buildingName = building.name;
          contextMetadata.building_id = building.id;
          contextMetadata.unit_count = building.unit_count;
          buildingContext += `Building: ${building.name}\nUnits: ${building.unit_count || 'Unknown'}\nAddress: ${building.address || 'Not specified'}\n\n`;
          
          // Add unit count to system prompt for better context
          systemPrompt += `\nThe building "${building.name}" contains ${building.unit_count || 'an unknown number of'} units.\n`;
        }
      } catch (error) {
        console.warn('Could not fetch building data:', error);
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
          buildingContext += `Compliance Items:\n${complianceContext}\n\n`;
          contextMetadata.complianceCount = compliance.length;
        }
      } catch (error) {
        console.warn('Could not fetch compliance data:', error);
      }

      // 👥 Leaseholders
      try {
        const { data: leaseholders } = await supabase
          .from('leaseholders')
          .select('id, name, email, unit_number')
          .eq('building_id', building_id)
          .limit(10);

        if (leaseholders && leaseholders.length > 0) {
          const leaseholderContext = leaseholders.map(leaseholder =>
            `- ${leaseholder.name} (Unit ${leaseholder.unit_number}, ${leaseholder.email})`
          ).join('\n');
          buildingContext += `Leaseholders:\n${leaseholderContext}\n\n`;
          contextMetadata.leaseholderCount = leaseholders.length;
        }
      } catch (error) {
        console.warn('Could not fetch leaseholder data:', error);
      }
    }

    // 📄 Document Context
    const wantStructured = isSummariseLike(prompt) || contextType === "document_analysis" || (Array.isArray(document_ids) && document_ids.length > 0);
    let usedDocs: Array<{id: string, file_name: string, text_content: string | null, type: string | null, created_at: string}> = [];
    let documentContext = "";
    
    if (Array.isArray(document_ids) && document_ids.length > 0) {
      try {
        const { data: documents } = await supabase
          .from('building_documents')
          .select('id, file_name, text_content, type, created_at')
          .in('id', document_ids)
          .order('created_at', { ascending: false });
        usedDocs = documents ?? [];
      } catch (error) {
        console.warn('Could not fetch document data:', error);
      }
    } else if (isSummariseLike(prompt) && building_id) {
      try {
        const { data } = await supabase
          .from('building_documents')
          .select('id, file_name, text_content, type, created_at')
          .eq('building_id', building_id)
          .order('created_at', { ascending: false })
          .limit(1);
        usedDocs = data ?? [];
      } catch (error) {
        console.warn('Could not fetch building documents:', error);
      }
    }
    
    // Build document context with character limits
    if (usedDocs.length > 0) {
      let included = 0;
      let citations = [];
      
      for (const d of usedDocs) {
        if (!d?.text_content) continue;
        if (included >= MAX_TOTAL_DOC_CHARS) break;
        
        const remaining = MAX_TOTAL_DOC_CHARS - included;
        const slice = truncate(d.text_content, Math.min(remaining, MAX_CHARS_PER_DOC));
        included += slice.length;
        
        citations.push({ 
          id: d.id, 
          file_name: d.file_name, 
          type: d.type ?? null, 
          created_at: d.created_at 
        });
        
        documentContext += `Document: ${d.file_name}\nType: ${d.type ?? "unknown"}\nContent:\n${slice}\n\n`;
      }
      
      contextMetadata.documentCount = usedDocs.length;
      contextMetadata.citations = citations;
    }

    // 📧 Email Thread Context
    let emailContext = "";
    if (emailThreadId) {
      try {
        const { data: emails } = await supabase
          .from('incoming_emails')
          .select('subject, body_full, from_email, received_at')
          .eq('thread_id', emailThreadId)
          .order('received_at', { ascending: true })
          .limit(5);

        if (emails && emails.length > 0) {
          emailContext = emails.map(email => 
            `Email: ${email.subject}\nFrom: ${email.from_email}\nContent: ${email.body_full?.substring(0, 1000) || 'No content'}\n`
          ).join('\n');
          contextMetadata.emailCount = emails.length;
        }
      } catch (error) {
        console.warn('Could not fetch email thread data:', error);
      }
    }

    // 🎯 Build the final prompt
    let finalPrompt = prompt;
    
    if (buildingContext) {
      finalPrompt = `Building Context:\n${buildingContext}\n\nQuestion: ${prompt}`;
    }
    
    if (documentContext) {
      finalPrompt = `Document Context:\n${documentContext}\n\n${finalPrompt}`;
    }
    
    if (emailContext) {
      finalPrompt = `Email Thread Context:\n${emailContext}\n\n${finalPrompt}`;
    }

    // Add tone instruction for email replies
    if (contextType === 'email_reply') {
      systemPrompt += `\nYou are drafting an email reply. Use a ${tone.toLowerCase()} tone. Be professional and concise.`;
    }
    
    // Add structured output instructions for document analysis
    if (wantStructured) {
      systemPrompt += `
Return a STRICT JSON object with keys:
- "summary": string (≤ 10 sentences)
- "key_points": string[] (5–10 bullets)
- "suggested_actions": string[] (5–10 concrete, UK leasehold-specific steps)
Do not include any text before or after the JSON.`;
    }

    console.log('🤖 Calling OpenAI API...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';
    console.log('✅ OpenAI response received');
    
    // Parse structured output if requested
    let structured: any = null;
    if (wantStructured) {
      try {
        structured = JSON.parse(aiResponse);
      } catch (parseError) {
        console.warn('Failed to parse structured output:', parseError);
      }
    }

    // Check for no-docs fallback for summarization
    if (isSummariseLike(prompt) && usedDocs.length === 0) {
      return NextResponse.json({
        success: true,
        response: "I couldn't find a recent document for this building to summarise. Please upload a file or specify which document to use.",
        result: "I couldn't find a recent document for this building to summarise. Please upload a file or specify which document to use.",
        context_type: contextType,
        building_id: building_id || null,
        document_count: 0,
        citations: [],
        structured: null,
        routeId: "app/api/ask-ai/route.ts"
      });
    }
    
    // 📊 Log the interaction
    try {
      const logId = await insertAiLog({
        user_id: user.id,
        question: prompt,
        response: aiResponse,
        context_type: contextType,
        building_id: building_id,
        document_ids: usedDocs?.map(d=>d.id) ?? document_ids,
        leaseholder_id: leaseholder_id,
        email_thread_id: emailThreadId,
      });
      contextMetadata.ai_log_id = logId;
    } catch (logError) {
      console.error('Failed to log AI interaction:', logError);
    }

    const payload = {
      success: true,
      response: aiResponse,
      result: aiResponse, // For backward compatibility
      context_type: contextType,
      building_id: building_id || null,
      document_count: (usedDocs?.length || document_ids?.length || 0),
      used_document_ids: usedDocs?.map(d=>d.id) ?? document_ids ?? [],
      citations: contextMetadata.citations || [],
      structured: structured ? {
        summary: structured.summary ?? null,
        key_points: Array.isArray(structured.key_points) ? structured.key_points : null,
        suggested_actions: Array.isArray(structured.suggested_actions) ? structured.suggested_actions : null
      } : null,
      has_email_thread: !!emailThreadId,
      has_leaseholder: !!leaseholder_id,
      context: {
        complianceUsed: contextMetadata.complianceCount > 0,
        majorWorksUsed: contextType === 'major_works'
      },
      metadata: contextMetadata,
      uploaded: uploadedMeta ?? null,
      routeId: "app/api/ask-ai/route.ts"
    };
    
    const res = NextResponse.json(payload);
    res.headers.set("x-route-id", "app/api/ask-ai/route.ts");
    return res;

  } catch (error) {
    console.error('❌ Error in unified ask-ai route:', error);
    return NextResponse.json({ 
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 