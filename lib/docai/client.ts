import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

export async function docaiProcessToText(buffer: Buffer, mime: string = "application/pdf") {
  const loc = process.env.DOCUMENT_AI_LOCATION;
  const name = process.env.DOCUMENT_AI_PROCESSOR_ID;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const credsRaw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "";

  if (!loc || !name || !projectId || !credsRaw) {
    throw new Error("DocAI env missing (DOCUMENT_AI_LOCATION, DOCUMENT_AI_PROCESSOR_ID, GOOGLE_CLOUD_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS_JSON)");
  }

  let creds;
  try {
    creds = JSON.parse(credsRaw);
  } catch (parseError) {
    throw new Error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON");
  }

  const client = new DocumentProcessorServiceClient({
    projectId,
    apiEndpoint: `${loc}-documentai.googleapis.com`,
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key?.replace(/\\n/g, "\n"),
    },
  });

  const [res] = await client.processDocument({
    name,
    rawDocument: { content: buffer.toString("base64"), mimeType: mime },
  });

  const text = res?.document?.text || "";
  return { text, raw: res };
}