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

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await req.formData();
      prompt = formData.get('message') as string || formData.get('prompt') as string || '';
      building_id = formData.get('building_id') as string || '';
      contextType = formData.get('context_type') as string || formData.get('contextType') as string || 'general';
      contextId = formData.get('context_id') as string || '';
      emailThreadId = formData.get('email_thread_id') as string || '';
      tone = formData.get('tone') as string || 'Professional';
      isPublic = formData.get('is_public') === 'true';
      
      // Extract uploaded files
      const files = formData.getAll('file') as File[];
      uploadedFiles = files.filter(file => file instanceof File);
      
      console.log('📁 Received file upload:', uploadedFiles.length, 'files');
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
    let documentContext = "";
    if (document_ids.length > 0) {
      try {
        const { data: documents } = await supabase
          .from('building_documents')
          .select('file_name, text_content, type, created_at')
          .in('id', document_ids)
          .order('created_at', { ascending: false });

        if (documents && documents.length > 0) {
          documentContext = documents.map(doc => 
            `Document: ${doc.file_name}\nType: ${doc.type}\nContent: ${doc.text_content?.substring(0, 2000) || 'No text content'}\n`
          ).join('\n');
          contextMetadata.documentCount = documents.length;
        }
      } catch (error) {
        console.warn('Could not fetch document data:', error);
      }
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

    console.log('🤖 Calling OpenAI API...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';
    console.log('✅ OpenAI response received');

    // 📊 Log the interaction
    try {
      const logId = await insertAiLog({
        user_id: user.id,
        question: prompt,
        response: aiResponse,
        context_type: contextType,
        building_id: building_id,
        document_ids: document_ids,
        leaseholder_id: leaseholder_id,
        email_thread_id: emailThreadId,
      });
      contextMetadata.ai_log_id = logId;
    } catch (logError) {
      console.error('Failed to log AI interaction:', logError);
    }

    return NextResponse.json({ 
      success: true,
      response: aiResponse,
      result: aiResponse, // For backward compatibility
      context_type: contextType,
      building_id: building_id,
      document_count: document_ids.length,
      has_email_thread: !!emailThreadId,
      has_leaseholder: !!leaseholder_id,
      context: {
        complianceUsed: contextMetadata.complianceCount > 0,
        majorWorksUsed: contextType === 'major_works'
      },
      metadata: contextMetadata
    });

  } catch (error) {
    console.error('❌ Error in unified ask-ai route:', error);
    return NextResponse.json({ 
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 