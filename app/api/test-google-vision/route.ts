export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Check environment variables
    const hasApiKey = !!process.env.GOOGLE_VISION_API_KEY;
    const hasOcrUrl = !!process.env.OCR_SERVICE_URL;
    const hasOcrToken = !!process.env.OCR_TOKEN;
    
    console.log('🔍 Environment check:');
    console.log('  GOOGLE_VISION_API_KEY:', hasApiKey ? '✅ Set' : '❌ Missing');
    console.log('  OCR_SERVICE_URL:', hasOcrUrl ? '✅ Set' : '❌ Missing');
    console.log('  OCR_TOKEN:', hasOcrToken ? '✅ Set' : '❌ Missing');
    
    // Test Google Vision API with a simple request
    let googleVisionTest = 'Not tested';
    if (hasApiKey) {
      try {
        // Create a simple test image (1x1 pixel)
        const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: testImage.toString('base64')
                },
                features: [
                  {
                    type: 'TEXT_DETECTION',
                    maxResults: 1
                  }
                ]
              }
            ]
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          googleVisionTest = `✅ Success (${response.status}) - ${JSON.stringify(result).substring(0, 200)}...`;
        } else {
          googleVisionTest = `❌ Failed (${response.status}): ${response.statusText}`;
        }
      } catch (error) {
        googleVisionTest = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
    
    return Response.json({
      environment: {
        GOOGLE_VISION_API_KEY: hasApiKey,
        OCR_SERVICE_URL: hasOcrUrl,
        OCR_TOKEN: hasOcrToken
      },
      googleVisionTest,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
