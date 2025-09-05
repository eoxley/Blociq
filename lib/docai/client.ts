import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

export async function docaiProcessToText(buffer: Buffer, mime: string = "application/pdf") {
  console.log('🤖 DocAI: Starting document processing...');
  
  const loc = process.env.DOCUMENT_AI_LOCATION;
  const name = process.env.DOCUMENT_AI_PROCESSOR_ID;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const credsRaw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "";

  // Validate environment variables without logging sensitive data
  if (!loc || !name || !projectId || !credsRaw) {
    console.error('❌ DocAI: Missing required environment variables');
    const missing = [];
    if (!loc) missing.push('DOCUMENT_AI_LOCATION');
    if (!name) missing.push('DOCUMENT_AI_PROCESSOR_ID'); 
    if (!projectId) missing.push('GOOGLE_CLOUD_PROJECT_ID');
    if (!credsRaw) missing.push('GOOGLE_APPLICATION_CREDENTIALS_JSON');
    throw new Error(`DocAI env missing: ${missing.join(', ')}`);
  }

  console.log('✅ DocAI: Environment variables present');
  console.log(`🌍 DocAI: Using EU endpoint: ${loc}-documentai.googleapis.com`);
  console.log(`📄 DocAI: Processing ${mime} document (${buffer.length} bytes)`);

  let creds;
  try {
    creds = JSON.parse(credsRaw);
    if (!creds.client_email || !creds.private_key) {
      throw new Error("Missing client_email or private_key in credentials");
    }
    console.log('✅ DocAI: Credentials parsed successfully');
  } catch (parseError) {
    console.error('❌ DocAI: Failed to parse credentials JSON');
    throw new Error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON");
  }

  try {
    const client = new DocumentProcessorServiceClient({
      projectId,
      apiEndpoint: `${loc}-documentai.googleapis.com`,
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key?.replace(/\\n/g, "\n"),
      },
    });

    console.log('✅ DocAI: Client initialized');
    
    const startTime = Date.now();
    const [res] = await client.processDocument({
      name,
      rawDocument: { content: buffer.toString("base64"), mimeType: mime },
    });
    
    const processingTime = Date.now() - startTime;
    const text = res?.document?.text || "";
    
    console.log(`✅ DocAI: Processing completed in ${processingTime}ms`);
    console.log(`📊 DocAI: Extracted ${text.length} characters`);
    
    if (text.length === 0) {
      console.warn('⚠️ DocAI: No text extracted from document');
    }
    
    return { 
      text, 
      raw: res,
      processingTime,
      source: 'docai'
    };
    
  } catch (docaiError) {
    console.error('❌ DocAI: Processing failed:', docaiError instanceof Error ? docaiError.message : 'Unknown error');
    throw docaiError;
  }
}