export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Parse form data
    const form = await req.formData();
    const file = form.get("file");
    
    if (!(file instanceof File)) {
      return Response.json({ 
        success: false, 
        message: "No file provided" 
      }, { status: 400 });
    }

    console.log(`🔍 Test OCR bypass: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Simulate successful OCR processing
    const testText = `This is a test OCR result for ${file.name}. 
    
    Document Type: ${file.type}
    File Size: ${(file.size / 1024 / 1024).toFixed(2)} MB
    
    This is simulated text to test if the upload pipeline works correctly.
    The actual OCR processing is bypassed for testing purposes.
    
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

    const responseData = {
      success: true,
      filename: file.name,
      ocrSource: 'test-bypass',
      textLength: testText.length,
      text: testText,
      extractedText: testText,
      confidence: 1.0,
      processingTime: 100,
      source: 'test-bypass'
    };

    const headers = new Headers({
      "X-OCR-Source": "test-bypass",
      "X-OCR-Duration": "100",
      "X-OCR-Attempts": "1",
      "X-OCR-Service": "test-bypass",
      "X-OCR-Success": "true"
    });

    console.log(`✅ Test OCR bypass successful: ${testText.length} characters`);

    return new Response(JSON.stringify(responseData), { 
      status: 200, 
      headers 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Test OCR bypass error:`, error);
    
    return Response.json({
      success: false,
      filename: "unknown",
      ocrSource: "none",
      textLength: 0,
      text: "",
      extractedText: "",
      summary: `Test OCR bypass failed: ${errorMessage}`,
      error: errorMessage,
      processingTime: 0
    }, { 
      status: 500,
      headers: new Headers({
        "X-OCR-Source": "none",
        "X-OCR-Duration": "0",
        "X-OCR-Service": "test-bypass",
        "X-OCR-Success": "false"
      })
    });
  }
}
