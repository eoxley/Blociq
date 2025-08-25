import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { IndustryKnowledgeProcessor } from '@/lib/industry-knowledge/pdf-processor';

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication and admin permissions
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you can customize this check)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const subcategory = formData.get('subcategory') as string;
    const tags = formData.get('tags') as string;

    if (!file || !title || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields: file, title, category' 
      }, { status: 400 });
    }

    // 3. Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ 
        error: 'Only PDF files are supported' 
      }, { status: 400 });
    }

    // 4. Process PDF with industry knowledge processor
    const processor = new IndustryKnowledgeProcessor();
    const processedDoc = await processor.processPDF(
      file,
      title,
      category,
      subcategory || undefined,
      tags ? tags.split(',').map(t => t.trim()) : undefined
    );

    return NextResponse.json({
      success: true,
      document: processedDoc,
      message: 'PDF processed and added to knowledge base successfully'
    });

  } catch (error) {
    console.error('PDF upload failed:', error);
    
    return NextResponse.json({ 
      error: 'Failed to process PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get knowledge base statistics from existing tables
    const processor = new IndustryKnowledgeProcessor();
    const stats = await processor.getDocumentStats();
    const categories = await processor.getCategories();

    return NextResponse.json({
      stats,
      categories,
    });

  } catch (error) {
    console.error('Failed to get knowledge base info:', error);
    
    return NextResponse.json({ 
      error: 'Failed to retrieve knowledge base information'
    }, { status: 500 });
  }
}
