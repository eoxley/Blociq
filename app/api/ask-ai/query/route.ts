// app/api/ask-ai/query/route.ts - Document Q&A System
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { question, documentText, documentMetadata } = await request.json();
    
    console.log('🤖 Processing question:', question);
    console.log('📊 Document text length:', documentText?.length || 0);
    
    if (!question || question.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Question is required' 
      }, { status: 400 });
    }
    
    if (!documentText || documentText.length === 0) {
      return NextResponse.json({ 
        error: 'No document text available for analysis' 
      }, { status: 400 });
    }
    
    // Create contextual prompt for AI
    const prompt = createDocumentAnalysisPrompt(question, documentText, documentMetadata);
    
    // Call your AI service (OpenAI, Anthropic, etc.)
    const aiResponse = await queryAI(prompt);
    
    // Extract relevant sections for citation
    const relevantSections = findRelevantSections(question, documentText);
    
    return NextResponse.json({
      success: true,
      question,
      answer: aiResponse,
      relevantSections,
      confidence: calculateConfidence(aiResponse, relevantSections),
      documentType: documentMetadata?.documentType || 'unknown',
      metadata: {
        documentLength: documentText.length,
        sectionsFound: relevantSections.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Document Q&A error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      question: (await request.json().catch(() => ({})))?.question || 'Unknown question'
    }, { status: 500 });
  }
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

function calculateConfidence(answer: string, sections: Array<any>): number {
  // Enhanced confidence calculation based on:
  // - Number of relevant sections found
  // - Length of answer
  // - Presence of specific citations
  // - Legal terminology usage
  
  let confidence = 0.4; // Base confidence
  
  // Section-based confidence
  if (sections.length > 0) confidence += 0.15;
  if (sections.length > 2) confidence += 0.10;
  if (sections.length > 3) confidence += 0.05;
  
  // Citation-based confidence
  if (answer.includes('Schedule') || answer.includes('Clause')) confidence += 0.10;
  if (answer.includes('paragraph') || answer.includes('section')) confidence += 0.05;
  if (answer.match(/\d+\.\d+/) || answer.match(/\(\d+\)/)) confidence += 0.05; // Numbered references
  
  // Content quality indicators
  if (answer.length > 100) confidence += 0.05;
  if (answer.length > 300) confidence += 0.05;
  
  // Legal document indicators
  const legalTerms = ['covenant', 'demise', 'landlord', 'tenant', 'lessee', 'lessor'];
  const legalTermCount = legalTerms.filter(term => answer.toLowerCase().includes(term)).length;
  confidence += Math.min(legalTermCount * 0.02, 0.10);
  
  // Specific answer indicators
  if (answer.includes('£') || answer.includes('pounds')) confidence += 0.05; // Financial details
  if (answer.includes('years') || answer.includes('months')) confidence += 0.03; // Time periods
  
  return Math.min(confidence, 1.0);
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