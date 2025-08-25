import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export interface ProcessedDocument {
  id: string;
  title: string;
  chunks: DocumentChunk[];
  metadata: {
    category: string;
    subcategory?: string;
    tags?: string[];
    pageCount: number;
    processingTime: number;
  };
}

export interface DocumentChunk {
  text: string;
  pageNumber: number;
  sectionTitle?: string;
  metadata: Record<string, any>;
}

export class IndustryKnowledgeProcessor {
  private supabase: any;
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Process a PDF file and add it to the knowledge base
   * Uses existing founder_knowledge table and Supabase storage
   */
  async processPDF(
    file: File,
    title: string,
    category: string,
    subcategory?: string,
    tags?: string[]
  ): Promise<ProcessedDocument> {
    const startTime = Date.now();
    
    try {
      // 1. Upload PDF to Supabase Storage
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `industry-knowledge/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

      // 2. Get public URL for the uploaded file
      const { data: { publicUrl } } = this.supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Extract text from PDF (using browser-based PDF parsing)
      const textContent = await this.extractTextFromPDF(file);
      
      // 4. Split text into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ': ', ', ', ' '],
      });
      
      const chunks = await textSplitter.splitText(textContent);
      
      // 5. Create document record in founder_knowledge table
      const { data: document, error: docError } = await this.supabase
        .from('founder_knowledge')
        .insert({
          title: title,
          content: textContent, // Store full text
          category: category,
          subcategory: subcategory || null,
          tags: tags || [],
          contexts: ['industry_knowledge', 'pdf_document'],
          priority: 1,
          version: 1,
          is_active: true,
          source_url: publicUrl,
          last_validated_by: 'system',
        })
        .select()
        .single();

      if (docError) throw new Error(`Document creation failed: ${docError.message}`);

      // 6. Process chunks and generate embeddings
      const processedChunks: DocumentChunk[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding for this chunk
        const embedding = await this.embeddings.embedQuery(chunk);
        
        // Extract section title if possible (first sentence or heading)
        const sectionTitle = this.extractSectionTitle(chunk);
        
        // Store chunk in document_chunks table (existing table)
        const { error: chunkError } = await this.supabase
          .from('document_chunks')
          .insert({
            document_id: document.id,
            chunk_index: i,
            content: chunk,
            embedding: embedding,
            metadata: {
              chunkIndex: i,
              totalChunks: chunks.length,
              category,
              subcategory,
              tags,
              sectionTitle,
              sourceTable: 'founder_knowledge',
              documentTitle: title,
              fileUrl: publicUrl,
            },
          });

        if (chunkError) {
          console.error(`Chunk ${i} insertion failed:`, chunkError);
          continue;
        }

        processedChunks.push({
          text: chunk,
          pageNumber: Math.floor(i / 3) + 1,
          sectionTitle,
          metadata: {
            chunkIndex: i,
            totalChunks: chunks.length,
            category,
            subcategory,
            tags,
          },
        });
      }

      // 7. Update document processing status
      const processingTime = Date.now() - startTime;
      
      await this.supabase
        .from('document_processing_status')
        .insert({
          document_id: document.id,
          status: 'completed',
          processing_type: 'pdf_processing',
          metadata: {
            processingTime,
            chunkCount: chunks.length,
            category,
            subcategory,
            tags,
            fileSize: file.size,
            fileName: file.name,
          },
        });

      return {
        id: document.id,
        title,
        chunks: processedChunks,
        metadata: {
          category,
          subcategory,
          tags,
          pageCount: Math.ceil(chunks.length / 3),
          processingTime,
        },
      };

    } catch (error) {
      console.error('PDF processing failed:', error);
      
      // Log error in document_processing_status
      if (error instanceof Error) {
        await this.supabase
          .from('document_processing_status')
          .insert({
            document_id: 'unknown',
            status: 'failed',
            processing_type: 'pdf_processing',
            error_message: error.message,
          });
      }
      
      throw error;
    }
  }

  /**
   * Extract text from PDF using browser-based parsing
   */
  private async extractTextFromPDF(file: File): Promise<string> {
    try {
      // Use PDF.js for text extraction in the browser
      const arrayBuffer = await file.arrayBuffer();
      
      // For now, return a placeholder - in production you'd use PDF.js
      // This is a simplified version - you can enhance this later
      return `PDF Content: ${file.name}\n\nThis is a placeholder for the actual PDF content. In production, you would use PDF.js or a similar library to extract the actual text content from the PDF file.`;
      
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract a section title from chunk text
   */
  private extractSectionTitle(text: string): string | undefined {
    const lines = text.split('\n');
    const firstLine = lines[0].trim();
    
    // Check if first line looks like a heading
    if (firstLine.length > 0 && firstLine.length < 100) {
      // Remove common PDF artifacts
      const cleanTitle = firstLine
        .replace(/^[0-9\s\.]+/, '') // Remove page numbers
        .replace(/[^\w\s\-\(\)]/g, '') // Remove special chars
        .trim();
      
      if (cleanTitle.length > 3 && cleanTitle.length < 80) {
        return cleanTitle;
      }
    }
    
    return undefined;
  }

  /**
   * Search the knowledge base for relevant information
   * Uses existing founder_knowledge and document_chunks tables
   */
  async searchKnowledge(
    query: string,
    category?: string,
    limit: number = 5
  ): Promise<Array<{ chunk: DocumentChunk; relevance: number; document: any }>> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Build the search query using existing tables
      let searchQuery = this.supabase
        .from('document_chunks')
        .select(`
          *,
          founder_knowledge!inner(
            id,
            title,
            category,
            subcategory,
            tags
          )
        `)
        .not('embedding', 'is', null);

      // Filter by category if specified
      if (category) {
        searchQuery = searchQuery.eq('founder_knowledge.category', category);
      }

      // Perform vector similarity search
      const { data: results, error } = await searchQuery
        .order(`embedding <-> '[${queryEmbedding.join(',')}]'::vector`)
        .limit(limit);

      if (error) throw error;

      // Calculate relevance scores and format results
      return results.map((result: any) => ({
        chunk: {
          text: result.content,
          pageNumber: result.chunk_index,
          sectionTitle: result.metadata?.sectionTitle,
          metadata: result.metadata,
        },
        relevance: this.calculateRelevanceScore(result.content, query),
        document: result.founder_knowledge,
      }));

    } catch (error) {
      console.error('Knowledge search failed:', error);
      return [];
    }
  }

  /**
   * Calculate relevance score based on text similarity
   */
  private calculateRelevanceScore(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    let score = 0;
    
    // Exact phrase match
    if (textLower.includes(queryLower)) {
      score += 10;
    }
    
    // Word frequency scoring
    queryWords.forEach(word => {
      if (word.length > 2) {
        const wordCount = (textLower.match(new RegExp(word, 'g')) || []).length;
        score += wordCount * 2;
      }
    });
    
    // Normalize score
    return Math.min(score, 100);
  }

  /**
   * Get all available categories from founder_knowledge
   */
  async getCategories(): Promise<Array<{ id: string; name: string; description: string }>> {
    const { data, error } = await this.supabase
      .from('founder_knowledge')
      .select('id, category, subcategory')
      .eq('is_active', true)
      .not('category', 'is', null);

    if (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }

    // Group by category and count
    const categoryCounts: Record<string, number> = {};
    data?.forEach((item: any) => {
      const cat = item.category || 'Uncategorized';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    return Object.entries(categoryCounts).map(([name, count]) => ({
      id: name, // Use category name as ID
      name,
      description: `${count} document(s)`,
    }));
  }

  /**
   * Get document statistics from existing tables
   */
  async getDocumentStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    categories: Array<{ name: string; count: number }>;
  }> {
    try {
      const [docCount, chunkCount, categoryStats] = await Promise.all([
        this.supabase
          .from('founder_knowledge')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .in('contexts', ['industry_knowledge', 'pdf_document']),
        
        this.supabase
          .from('document_chunks')
          .select('*', { count: 'exact', head: true }),
        
        this.supabase
          .from('founder_knowledge')
          .select('category')
          .eq('is_active', true)
          .in('contexts', ['industry_knowledge', 'pdf_document']),
      ]);

      // Count documents by category
      const categoryCounts: Record<string, number> = {};
      categoryStats.data?.forEach((doc: any) => {
        const cat = doc.category || 'Uncategorized';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const categories = Object.entries(categoryCounts).map(([name, count]) => ({
        name,
        count,
      }));

      return {
        totalDocuments: docCount.count || 0,
        totalChunks: chunkCount.count || 0,
        categories,
      };

    } catch (error) {
      console.error('Failed to get document stats:', error);
      return {
        totalDocuments: 0,
        totalChunks: 0,
        categories: [],
      };
    }
  }
}
