import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import JSZip from 'jszip';

export async function POST(req: NextRequest) {
  try {
    const { communications } = await req.json();
    
    if (!communications || !Array.isArray(communications)) {
      return NextResponse.json({ error: 'Invalid communications data' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const zip = new JSZip();

    for (const comm of communications) {
      try {
        // Get leaseholder details for filename
        const { data: leaseholder } = await supabase
          .from('leaseholders')
          .select('name, unit:units(unit_number)')
          .eq('id', comm.leaseholder_id)
          .single();

        if (!leaseholder) {
          console.error(`Leaseholder not found: ${comm.leaseholder_id}`);
          continue;
        }

        // Generate PDF content (simplified - you would use a proper PDF library)
        const pdfContent = generatePDFContent(comm);
        
        // Create filename
        const filename = `${leaseholder.name || 'Leaseholder'}_${leaseholder.unit?.unit_number || 'Unit'}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Add to zip (in a real implementation, you'd generate actual PDF)
        zip.file(filename, pdfContent);

      } catch (error: any) {
        console.error('Error processing letter:', error);
      }
    }

    // Generate zip file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Return the zip file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="letters-${new Date().toISOString().split('T')[0]}.zip"`,
      },
    });

  } catch (error: any) {
    console.error('Error in generate-letters:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

function generatePDFContent(communication: any): string {
  // This is a simplified version - in a real implementation, you'd use a PDF library
  // like pdfkit, puppeteer, or similar to generate actual PDF content
  
  const content = `
Letter Content:
${communication.subject ? `Subject: ${communication.subject}` : ''}

${communication.content}

---
Generated on: ${new Date().toLocaleDateString()}
Building ID: ${communication.building_id}
Unit ID: ${communication.unit_id}
Leaseholder ID: ${communication.leaseholder_id}
  `;

  return content;
} 