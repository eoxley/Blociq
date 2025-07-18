import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log("📄 Converting DOCX to PDF...");
    
    const body = await req.json();
    const { filePath, documentId } = body;

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    console.log("✅ Conversion request received:", { filePath, documentId });

    // 1. Download the DOCX file from Supabase storage
    const { data: docxFile, error: downloadError } = await supabase.storage
      .from('generated')
      .download(filePath);

    if (downloadError || !docxFile) {
      console.error("❌ Failed to download DOCX file:", downloadError);
      return NextResponse.json({ error: 'Failed to download source file' }, { status: 500 });
    }

    console.log("📥 DOCX file downloaded successfully");

    // 2. Convert DOCX to PDF using external API
    // Using a free DOCX to PDF conversion service
    const formData = new FormData();
    formData.append('file', docxFile, 'document.docx');

    const conversionResponse = await fetch('https://api.cloudconvert.com/v2/convert', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY || 'demo'}`,
        'Content-Type': 'multipart/form-data'
      },
      body: formData
    });

    if (!conversionResponse.ok) {
      console.error("❌ PDF conversion failed:", conversionResponse.statusText);
      
      // Fallback: Return the DOCX file with instructions
      return NextResponse.json({ 
        error: 'PDF conversion temporarily unavailable',
        fallback: true,
        docxUrl: await getPublicUrl(filePath)
      }, { status: 503 });
    }

    const pdfBlob = await conversionResponse.blob();
    console.log("✅ PDF conversion completed");

    // 3. Generate PDF filename
    const pdfFilename = filePath.replace('.docx', '.pdf');
    const pdfPath = `generated/${pdfFilename}`;

    // 4. Upload PDF to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated')
      .upload(pdfPath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error("❌ Failed to upload PDF:", uploadError);
      return NextResponse.json({ error: 'Failed to save PDF' }, { status: 500 });
    }

    console.log("📤 PDF uploaded successfully");

    // 5. Get public URL for the PDF
    const { data: urlData } = supabase.storage
      .from('generated')
      .getPublicUrl(pdfPath);

    const publicUrl = urlData.publicUrl;

    // 6. Update generated_documents table with PDF path
    if (documentId) {
      const { error: updateError } = await supabase
        .from('generated_documents')
        .update({ 
          pdf_path: pdfPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) {
        console.error("⚠️ Failed to update document record:", updateError);
        // Don't fail the request, just log the error
      }
    }

    console.log("✅ PDF conversion and storage completed successfully");

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      pdfPath: pdfPath,
      filename: pdfFilename
    });

  } catch (error) {
    console.error('❌ PDF conversion error:', error);
    return NextResponse.json({ 
      error: 'Failed to convert to PDF',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}

// Helper function to get public URL
async function getPublicUrl(filePath: string): Promise<string> {
  const { data } = supabase.storage
    .from('generated')
    .getPublicUrl(filePath);
  return data.publicUrl;
} 