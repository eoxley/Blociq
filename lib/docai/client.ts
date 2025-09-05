import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

function resolveDocAiHost(loc?: string) {
  if (!loc) return "eu-documentai.googleapis.com"; // safe default
  // If user passed a full regional host like "europe-west3", build host accordingly
  if (/^[a-z]+-[a-z]+[0-9]+$/i.test(loc)) return `${loc}-documentai.googleapis.com`;
  // Short forms "eu" | "us"
  if (loc === "eu") return "eu-documentai.googleapis.com";
  if (loc === "us") return "us-documentai.googleapis.com";
  // Fallback
  return "eu-documentai.googleapis.com";
}

let docaiEnvChecked = false;
function checkDocAiEnv() {
  if (docaiEnvChecked) return;
  docaiEnvChecked = true;
  const ok = !!process.env.DOCUMENT_AI_PROCESSOR_ID && !!process.env.GOOGLE_CLOUD_PROJECT_ID && !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  console.info("DocAI env:", { ok, loc: process.env.DOCUMENT_AI_LOCATION || "missing", processorId: !!process.env.DOCUMENT_AI_PROCESSOR_ID });
}

export async function docaiProcessToText(buffer: Buffer, mime: string = "application/pdf") {
  console.log('🤖 DocAI: Starting document processing...');
  
  checkDocAiEnv();
  
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

  const host = resolveDocAiHost(loc);
  console.log('✅ DocAI: Environment variables present');
  console.log(`🌍 DocAI: Using endpoint: ${host}`);
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
      apiEndpoint: host,
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