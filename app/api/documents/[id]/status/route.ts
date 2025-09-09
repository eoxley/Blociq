import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, status, created_at, updated_at, filename')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ 
        error: 'Document not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        status: document.status || 'pending',
        filename: document.filename,
        createdAt: document.created_at,
        updatedAt: document.updated_at
      }
    });
    
  } catch (error) {
    console.error('Error fetching document status:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ 
        error: 'Status is required' 
      }, { status: 400 });
    }

    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !document) {
      return NextResponse.json({ 
        error: 'Failed to update document status' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        status: document.status,
        filename: document.filename,
        updatedAt: document.updated_at
      }
    });
    
  } catch (error) {
    console.error('Error updating document status:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
