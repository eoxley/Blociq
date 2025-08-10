import { NextRequest, NextResponse } from 'next/server';
import { embedMissingChunks } from '@/lib/ai/retrieve';

export async function POST(request: NextRequest) {
  try {
    // Server-only guard - check for admin secret
    const adminSecret = request.headers.get('X-Admin-Secret');
    const expectedSecret = process.env.ADMIN_SECRET || 'blociq-admin-2024';
    
    if (adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call embedMissingChunks with default limit of 500
    const embedded = await embedMissingChunks(500);

    return NextResponse.json({ embedded });

  } catch (error) {
    console.error('Error in embed-chunks endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
