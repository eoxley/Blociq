import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;

  try {
    const filePath = resolvedParams.path.join('/');
    const fullPath = path.join(process.cwd(), 'public/outlook-addin', filePath);

    // Security check - ensure path is within the outlook-addin directory
    if (!fullPath.includes('outlook-addin')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const content = await readFile(fullPath);

    // Determine content type based on file extension
    let contentType = 'application/octet-stream';
    if (filePath.endsWith('.html')) {
      contentType = 'text/html';
    } else if (filePath.endsWith('.js')) {
      contentType = 'application/javascript';
    } else if (filePath.endsWith('.xml')) {
      contentType = 'application/xml';
    } else if (filePath.endsWith('.png')) {
      contentType = 'image/png';
    } else if (filePath.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Security-Policy': "frame-ancestors 'self' https://outlook.office.com https://outlook.office365.com https://*.office.com https://*.office365.com;",
        'Access-Control-Allow-Origin': 'https://outlook.office.com',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': filePath.endsWith('.png') ? 'public, max-age=31536000, immutable' : 'no-cache',
      },
    });
  } catch (error) {
    console.error(`Error serving ${resolvedParams.path}:`, error);
    return new NextResponse('File not found', { status: 404 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://outlook.office.com',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}