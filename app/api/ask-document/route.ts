import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { question, buildingId, documentType, userId } = await request.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log("📄 Document-aware question:", question);
    console.log("🏢 Building ID:", buildingId);
    console.log("📋 Document type filter:", documentType);

    const supabase = createServerComponentClient({ cookies });

    // Get current user for RLS
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Identify Latest Relevant Document
    let documentsQuery = supabase
      .from('building_documents')
      .select(`
        id,
        file_name,
        file_url,
        type,
        created_at,
        building_id,
        building:buildings!inner(name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (buildingId) {
      documentsQuery = documentsQuery.eq('building_id', buildingId);
    }

    if (documentType) {
      documentsQuery = documentsQuery.ilike('type', `%${documentType}%`);
    }

    const { data: documents, error: docsError } = await documentsQuery.limit(5);

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find any documents to analyze. Please upload a document first, or check if you have access to the requested building.",
        documents_found: 0
      });
    }

    console.log(`📄 Found ${documents.length} relevant documents`);

    // Get the most recent document for analysis
    const latestDocument = documents[0] as any;
    console.log("📄 Analyzing document:", latestDocument.file_name);

    // Step 2: Extract text from the document (if not already stored)
    let documentText = '';
    let documentSummary = '';

    try {
      // Try to get stored text/summary first
      const { data: docAnalysis } = await supabase
        .from('document_analysis')
        .select('extracted_text, summary')
        .eq('document_id', latestDocument.id)
        .single();

      if (docAnalysis) {
        documentText = docAnalysis.extracted_text || '';
        documentSummary = docAnalysis.summary || '';
      } else {
        // If no stored analysis, extract text from the file
        console.log("🔄 Extracting text from document...");
        documentText = await extractTextFromStoredFile(latestDocument.file_url);
        
        // Store the extracted text for future use
        await supabase
          .from('document_analysis')
          .upsert({
            document_id: latestDocument.id,
            extracted_text: documentText,
            extracted_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('❌ Error extracting document text:', error);
      documentText = 'Unable to extract text from document.';
    }

    // Step 3: Generate AI response based on document content
    const aiResponse = await generateDocumentResponse(
      question,
      latestDocument,
      documentText,
      documentSummary,
      documents
    );

    // Step 4: Log the interaction
    try {
      await supabase
        .from('document_queries')
        .insert({
          user_id: userId,
          building_id: buildingId ? parseInt(buildingId) : null,
          document_id: latestDocument.id,
          question,
          answer: aiResponse,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('⚠️ Failed to log document query:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      answer: aiResponse,
      document_analyzed: {
        id: latestDocument.id,
        name: latestDocument.file_name,
        type: latestDocument.type,
        uploaded_at: latestDocument.created_at,
        building_name: latestDocument.building?.name || 'Unknown'
      },
      documents_found: documents.length,
      total_documents: documents.length
    });

  } catch (error) {
    console.error('❌ Document-aware response error:', error);
    return NextResponse.json({
      error: 'Failed to process document question',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function extractTextFromStoredFile(fileUrl: string): Promise<string> {
  try {
    // Download the file from Supabase storage
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use OpenAI's text extraction
    const openaiFile = await openai.files.create({
      file: new Blob([buffer], { type: 'application/pdf' }),
      purpose: 'assistants',
    });

    const content = await openai.files.content(openaiFile.id);
    const text = await content.text();

    // Clean up
    await openai.files.delete(openaiFile.id);

    return text;
  } catch (error) {
    console.error('❌ Error extracting text from stored file:', error);
    return 'Unable to extract text from document.';
  }
}

async function generateDocumentResponse(
  question: string,
  document: any,
  documentText: string,
  documentSummary: string,
  allDocuments: any[]
): Promise<string> {
  
  // Determine if this is a comparison question
  const isComparison = question.toLowerCase().includes('compare') || 
                      question.toLowerCase().includes('previous') ||
                      question.toLowerCase().includes('difference');

  let prompt = '';

  if (isComparison && allDocuments.length > 1) {
    // Comparison response
    const previousDocument = allDocuments[1]; // Second most recent
    prompt = `
You are analyzing documents for a UK leasehold block management platform.

CURRENT DOCUMENT: ${document.file_name} (${document.type})
Uploaded: ${new Date(document.created_at).toLocaleDateString()}
Content: ${documentText.substring(0, 3000)}

PREVIOUS DOCUMENT: ${previousDocument.file_name} (${previousDocument.type})
Uploaded: ${new Date(previousDocument.created_at).toLocaleDateString()}

USER QUESTION: ${question}

Please provide a detailed comparison focusing on:
1. Key differences between the documents
2. Changes in requirements, dates, or responsibilities
3. Progress on any actions or recommendations
4. Updated compliance status if applicable

Format your response clearly with sections for each document and a comparison summary.
`;
  } else {
    // Single document analysis
    prompt = `
You are analyzing a document for a UK leasehold block management platform.

DOCUMENT: ${document.file_name} (${document.type})
Uploaded: ${new Date(document.created_at).toLocaleDateString()}
Building: ${document.building?.name || 'Unknown'}

DOCUMENT CONTENT:
${documentText.substring(0, 4000)}

USER QUESTION: ${question}

Please provide a comprehensive response that includes:

1. A concise summary of the document
2. Key actions and deadlines identified
3. Responsible parties mentioned
4. Any compliance requirements or recommendations
5. Important dates and timelines

If the user asks for specific information (like "what are the actions?"), focus on that aspect while providing relevant context.

Format your response clearly with appropriate sections and bullet points where helpful.
`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional property management assistant with expertise in UK leasehold block management. Provide clear, actionable responses based on document content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const response = completion.choices[0]?.message?.content;
    return response || "I couldn't analyze the document at this time. Please try again.";
  } catch (error) {
    console.error('❌ Error generating AI response:', error);
    return "I encountered an error while analyzing the document. Please try again.";
  }
} 