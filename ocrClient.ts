import vision from "@google-cloud/vision";

let visionClient: vision.ImageAnnotatorClient | null = null;

export function getVisionClient() {
  if (!visionClient) {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
      throw new Error("Google Vision environment variables are missing");
    }

    visionClient = new vision.ImageAnnotatorClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
    });
  }

  return visionClient;
}

// For backward compatibility
export { getVisionClient as visionClient };