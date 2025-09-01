// app/api/ask-ai/query/route.ts - Document Q&A System
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute for document Q&A

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface QAResponse {
  question: string;
  answer: string;
  confidence: number;
  citations: string[];
  relevantSections: string[];
  category: string;
  metadata?: {
    processingTime: number;
    modelUsed: string;
    documentLength: number;
  };
}

// Classify the type of question being asked
function classifyQuestion(question: string): string {
  const questionLower = question.toLowerCase();
  
  const categories = {
    'repairs_maintenance': ['repair', 'maintain', 'fix', 'broken', 'damage', 'upkeep', 'service', 'replacement', 'window'],
    'rent_payments': ['rent', 'payment', 'pay', 'due', 'cost', 'fee', 'charge', 'amount', 'price'],
    'alterations': ['alter', 'change', 'modify', 'renovate', 'improve', 'decoration', 'install', 'remove'],
    'responsibilities': ['responsible', 'obligation', 'duty', 'liable', 'requirement', 'must', 'shall'],
    'termination': ['terminate', 'end', 'expire', 'notice', 'break', 'quit', 'leave', 'exit'],
    'pets_restrictions': ['pet', 'animal', 'dog', 'cat', 'allowed', 'permit', 'restriction'],
    'utilities': ['utility', 'electric', 'gas', 'water', 'heating', 'council tax', 'bills'],
    'insurance': ['insurance', 'cover', 'policy', 'claim', 'protection', 'indemnity'],
    'access': ['access', 'entry', 'visit', 'inspect', 'landlord entry', 'viewing'],
    'general': ['what', 'when', 'where', 'who', 'why', 'how', 'explain', 'tell me']
  };

  let bestMatch = 'general';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categories)) {
    let score = 0;
    for (const keyword of keywords) {
      if (questionLower.includes(keyword)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestMatch;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('📝 Document Q&A API: Processing question...');
    
    const { question, documentText, documentMetadata } = await request.json();
    
    if (!question || question.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Question is required'
      }, { status: 400 });
    }
    
    if (!documentText || documentText.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No document text available for analysis'
      }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }
    
    console.log(`🔍 Question: "${question}"`);
    console.log(`📄 Document length: ${documentText.length} characters`);
    
    // Step 1: Classify the question
    const category = classifyQuestion(question);
    console.log(`🏷️ Question category: ${category}`);
    
    // Step 2: Extract relevant sections
    const relevantSections = findRelevantSections(question, documentText);
    console.log(`📋 Found ${relevantSections.length} relevant sections`);
    
    // Step 3: Generate AI response using OpenAI
    const { answer, citations } = await generateAIResponse(question, documentText, relevantSections, category);
    console.log(`🤖 Generated answer: ${answer.substring(0, 100)}...`);
    console.log(`📚 Found ${citations.length} citations`);
    
    // Step 4: Calculate confidence
    const confidence = calculateConfidence(documentText, question, relevantSections, citations);
    console.log(`🎯 Confidence score: ${confidence}`);
    
    const processingTime = Date.now() - startTime;
    
    // Return structured response
    const response: QAResponse = {
      question,
      answer,
      confidence,
      citations,
      relevantSections: relevantSections.map(s => s.text || s.context),
      category,
      metadata: {
        processingTime,
        modelUsed: 'gpt-4o',
        documentLength: documentText.length
      }
    };
    
    console.log(`✅ Document Q&A completed in ${processingTime}ms`);
    
    return NextResponse.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('❌ Document Q&A error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to process document question'
    }, { status: 500 });
  }
}

// Generate AI response using OpenAI
async function generateAIResponse(
  question: string, 
  documentText: string, 
  relevantSections: any[], 
  category: string
): Promise<{ answer: string; citations: string[] }> {
  
  const systemPrompt = `You are a legal assistant specializing in lease agreement analysis. You provide clear, accurate information about lease terms and tenant/landlord rights and responsibilities.

IMPORTANT INSTRUCTIONS:
1. Answer questions about lease agreements based ONLY on the provided document text
2. Be specific and cite exact clauses, schedules, or paragraphs when possible
3. If information is not clear in the document, say so explicitly
4. Provide practical, actionable answers in plain English
5. Include relevant legal context but keep explanations accessible
6. Extract and list specific citations (clause numbers, schedule references, etc.)

Document Category: ${category.replace('_', ' ').toUpperCase()}
Question Type: This is a ${category.replace('_', ' ')} related question.`;

  const userPrompt = `Please analyze this lease document and answer the following question:

QUESTION: "${question}"

FULL DOCUMENT TEXT:
${documentText}

MOST RELEVANT SECTIONS:
${relevantSections.map((section, i) => `${i + 1}. ${section.context || section.text || section}`).join('\n\n')}

Please provide:
1. A clear, direct answer to the question
2. Specific citations to clauses, schedules, or paragraphs that support your answer
3. Any important caveats or additional context
4. If the answer cannot be determined from the document, state this clearly

Format your response as JSON with these fields:
{
  "answer": "Your detailed answer here",
  "citations": ["Clause 1.2", "Schedule 3 paragraph 5", "etc"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.1, // Low temperature for factual accuracy
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        answer: parsed.answer || 'Unable to generate answer',
        citations: Array.isArray(parsed.citations) ? parsed.citations : []
      };
    } catch {
      // Fallback if JSON parsing fails
      return {
        answer: content,
        citations: extractCitationsFromText(content)
      };
    }

  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate AI response');
  }
}

// Extract citations from text using regex patterns
function extractCitationsFromText(text: string): string[] {
  const citations: string[] = [];
  
  // Common citation patterns in lease documents
  const patterns = [
    /clause\s+\d+(?:\.\d+)*/gi,
    /paragraph\s+\d+(?:\.\d+)*/gi,
    /schedule\s+\d+(?:\s+paragraph\s+\d+)?/gi,
    /section\s+\d+(?:\.\d+)*/gi,
    /part\s+\d+(?:\.\d+)*/gi,
    /\b\d+\.\d+(?:\.\d+)*\b/g // Numeric references like 8.1, 12.3.4
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      citations.push(...matches);
    }
  }

  // Remove duplicates and clean up
  return [...new Set(citations)]
    .map(citation => citation.trim())
    .filter(citation => citation.length > 0)
    .slice(0, 5); // Limit to 5 citations
}

function createDocumentAnalysisPrompt(question: string, documentText: string, metadata: any): string {
  const documentType = metadata?.documentType || 'document';
  
  return `You are a specialist legal document analyst focusing on UK property law and lease agreements. Analyze the following document to answer the specific question with professional accuracy and proper legal citations.

DOCUMENT CONTEXT:
${metadata?.filename ? `Document: ${metadata.filename}` : ''}
${metadata?.documentType ? `Type: ${metadata.documentType}` : ''}
${metadata?.parties ? `Parties: ${metadata.parties.join(' and ')}` : ''}
${metadata?.property ? `Property: ${metadata.property}` : ''}
${metadata?.premium ? `Premium: ${metadata.premium}` : ''}
${metadata?.term ? `Term: ${metadata.term}` : ''}

DOCUMENT TEXT:
${documentText}

QUESTION: ${question}

RESPONSE REQUIREMENTS:
1. **Structure your answer using these sections:**
   - Start with: "Based on the lease document:"
   - Use clear headings with **BOLD FORMATTING**
   - End with a **CONCLUSION:** section

2. **Citation Standards:**
   - Always reference specific clauses: (Schedule X, paragraph Y.Z)
   - Include exact quotes with quotation marks for key provisions
   - Reference multiple sections if relevant

3. **Content Focus for Lease Documents:**
   - Distinguish between TENANT and LANDLORD responsibilities
   - Address financial obligations (rent, service charges, premiums)
   - Cover conditions, restrictions, and consent requirements
   - Explain enforcement and breach consequences

4. **Answer Quality:**
   - Be specific and actionable
   - Include relevant exceptions or conditions
   - Distinguish between different types of obligations
   - Provide practical implications

5. **Legal Accuracy:**
   - Base ALL statements on document content
   - If information isn't in the document, state this clearly
   - Don't make assumptions about standard lease terms
   - Distinguish between mandatory and discretionary provisions

EXAMPLE RESPONSE STRUCTURE:
"Based on the lease document:

**PRIMARY OBLIGATION:**
- [Main responsibility with citation]

**SPECIFIC REQUIREMENTS:**  
- [Detailed requirements with quotes]
- [Additional conditions with references]

**CONDITIONS/EXCEPTIONS:**
- [Any conditions or exceptions]

**CONCLUSION:** [Clear summary of practical implications]"

Analyze the document thoroughly and provide a comprehensive, professionally formatted answer.`;
}

async function queryAI(prompt: string): Promise<string> {
  // Replace with your AI service (OpenAI, Anthropic, etc.)
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Use latest model for better legal document analysis
        messages: [
          {
            role: 'system',
            content: `You are a senior legal analyst specializing in UK property law, lease agreements, and conveyancing. You have extensive experience analyzing complex lease documents for landlords, tenants, and property managers.

EXPERTISE AREAS:
- UK residential and commercial lease law
- Tenant and landlord covenants and obligations
- Rent review mechanisms (RPI, open market, fixed increases)
- Repair and maintenance responsibilities
- Assignment, subletting, and consent procedures
- Service charge provisions and proportions
- Insurance obligations and risk allocation
- Forfeiture and termination procedures
- Planning and alteration restrictions

ANALYSIS STANDARDS:
- Always distinguish between tenant and landlord responsibilities
- Reference specific Schedule and paragraph numbers
- Include exact quotes for key provisions using quotation marks
- Explain the practical implications of each obligation
- Identify conditions, exceptions, and discretionary elements
- Structure responses with clear headings and conclusions
- Base all statements strictly on document content
- Never make assumptions about standard lease terms

RESPONSE QUALITY:
- Professional legal writing style
- Clear, actionable information
- Comprehensive but concise
- Proper legal citations throughout
- Practical implications explained`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500, // Increased for detailed legal analysis
        temperature: 0.1 // Low temperature for factual accuracy
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('❌ AI query failed:', error);
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function findRelevantSections(question: string, documentText: string): Array<{section: string, text: string, context: string}> {
  const sections = [];
  
  // Extract context based on question keywords
  const questionLower = question.toLowerCase();
  const lines = documentText.split('\n').filter(line => line.trim().length > 0);
  
  // Define keyword mappings for common lease questions with enhanced context
  const keywordSections = {
    'windows': {
      keywords: ['window', 'glass', 'glazing', 'sash', 'frame'],
      context: 'Window maintenance and repair obligations'
    },
    'alterations': {
      keywords: ['alteration', 'modification', 'change', 'structural', 'addition', 'improvement'],
      context: 'Property alteration and modification rights'
    },
    'rent': {
      keywords: ['rent', 'rental', 'payment', 'review', 'increase', 'initial rent', 'ground rent'],
      context: 'Rental payments and review mechanisms'
    },
    'repairs': {
      keywords: ['repair', 'maintenance', 'condition', 'covenant', 'upkeep', 'decorat'],
      context: 'Repair and maintenance responsibilities'
    },
    'assignment': {
      keywords: ['assignment', 'transfer', 'subletting', 'underlet', 'consent', 'licence'],
      context: 'Assignment and subletting provisions'
    },
    'termination': {
      keywords: ['termination', 'forfeiture', 're-entry', 'breach', 'expire', 'determine'],
      context: 'Lease termination and forfeiture conditions'
    },
    'insurance': {
      keywords: ['insurance', 'insured risks', 'coverage', 'premium', 'policy', 'indemnity'],
      context: 'Insurance obligations and coverage'
    },
    'service_charges': {
      keywords: ['service charge', 'service cost', 'proportion', 'tenant proportion', 'management'],
      context: 'Service charge provisions and calculations'
    },
    'lease_terms': {
      keywords: ['term', 'commencement', 'expiry', 'years', 'period', 'duration'],
      context: 'Lease term and duration'
    },
    'property_details': {
      keywords: ['premises', 'property', 'flat', 'building', 'address', 'demise'],
      context: 'Property description and boundaries'
    },
    'covenants': {
      keywords: ['covenant', 'obligation', 'undertake', 'agree', 'shall not', 'must not'],
      context: 'Tenant and landlord covenants'
    }
  };
  
  // Find relevant sections based on keywords with improved context matching
  for (const [topic, config] of Object.entries(keywordSections)) {
    if (config.keywords.some(keyword => questionLower.includes(keyword))) {
      const relevantLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (config.keywords.some(keyword => line.toLowerCase().includes(keyword))) {
          // Include surrounding context (2 lines before and after)
          const contextStart = Math.max(0, i - 2);
          const contextEnd = Math.min(lines.length - 1, i + 2);
          const contextLines = lines.slice(contextStart, contextEnd + 1);
          
          relevantLines.push({
            mainLine: line,
            context: contextLines.join('\n'),
            lineNumber: i + 1
          });
        }
      }
      
      if (relevantLines.length > 0) {
        // Limit to 3 most relevant sections to avoid overwhelming response
        const topSections = relevantLines.slice(0, 3);
        
        sections.push({
          section: config.context,
          text: topSections.map(section => section.mainLine).join('\n'),
          context: topSections.map(section => section.context).join('\n\n---\n\n')
        });
      }
    }
  }
  
  return sections;
}

// Calculate confidence score based on document evidence
function calculateConfidence(
  documentText: string,
  question: string,
  relevantSections: any[],
  citations: string[]
): number {
  let confidence = 0.5; // Base confidence
  
  // Boost confidence based on relevant sections found
  if (relevantSections.length >= 3) confidence += 0.2;
  else if (relevantSections.length >= 1) confidence += 0.1;
  
  // Boost confidence based on citations found
  if (citations.length >= 2) confidence += 0.2;
  else if (citations.length >= 1) confidence += 0.1;
  
  // Check if question words appear in document
  const questionWords = question.toLowerCase().split(' ').filter(word => word.length > 3);
  const documentLower = documentText.toLowerCase();
  let wordMatches = 0;
  
  for (const word of questionWords) {
    if (documentLower.includes(word)) {
      wordMatches++;
    }
  }
  
  if (wordMatches >= questionWords.length * 0.7) confidence += 0.1;
  
  // Ensure confidence is between 0 and 1
  return Math.min(Math.max(confidence, 0.1), 0.95);
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Document Q&A API is running',
    usage: 'POST to this endpoint with question, documentText, and documentMetadata',
    example: {
      question: 'Who is responsible for window repairs?',
      documentText: 'Your extracted document text here...',
      documentMetadata: {
        filename: 'lease.pdf',
        documentType: 'lease_agreement',
        parties: ['Landlord Name', 'Tenant Name']
      }
    }
  });
}