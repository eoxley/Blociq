import { ImageAnnotatorClient } from "@google-cloud/vision";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: '.env.local' });

let visionClient: ImageAnnotatorClient | null = null;

export function getVisionClient() {
  try {
    if (!visionClient) {
      console.log('🔧 Initializing Google Vision client...');
      
      // First priority: try to use the credentials file
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
          console.log('📁 Using credentials file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
          visionClient = new ImageAnnotatorClient({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          });
          console.log('✅ Google Vision client initialized with credentials file');
          return visionClient;
        } catch (error) {
          console.error('❌ Failed to use credentials file:', error);
        }
      }
      
      // Second priority: try to parse GOOGLE_APPLICATION_CREDENTIALS_JSON
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
          console.log('🔑 Parsing JSON credentials...');
          const cleanJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
            .replace(/\n/g, '')
            .replace(/\r/g, '')
            .replace(/\t/g, '')
            .replace(/\\n/g, '\\n')
            .trim();
          
          const credentials = JSON.parse(cleanJson);
          console.log('📋 Parsed credentials for project:', credentials.project_id);
          
          let privateKey = credentials.private_key;
          if (privateKey) {
            // Clean up the private key
            privateKey = privateKey.replace(/^"/, '').replace(/"$/, '');
            privateKey = privateKey.replace(/\\n/g, '\n');
            privateKey = privateKey.replace(/\n\s+/g, '\n');
            privateKey = privateKey.replace(/\s+\n/g, '\n');
            privateKey = privateKey.replace(/\n{2,}/g, '\n');
            privateKey = privateKey.trim();
            
            // Ensure proper PEM format
            if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
              privateKey = '-----BEGIN PRIVATE KEY-----\n' + privateKey;
            }
            if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
              privateKey = privateKey + '\n-----END PRIVATE KEY-----';
            }
          }
          
          visionClient = new ImageAnnotatorClient({
            credentials: {
              client_email: credentials.client_email,
              private_key: privateKey,
            },
            projectId: credentials.project_id,
          });
          
          console.log('✅ Google Vision client initialized with JSON credentials');
          return visionClient;
          
        } catch (error) {
          console.error('❌ Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
          console.log('Falling back to individual environment variables...');
        }
      }
      
      // Third priority: fallback to individual environment variables
      if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_PROJECT_ID) {
        console.log('🔑 Using individual environment variables...');
        let privateKey = process.env.GOOGLE_PRIVATE_KEY;
        
        // Clean up the private key
        privateKey = privateKey
          .replace(/^"/, '')
          .replace(/"$/, '')
          .replace(/\n\s+/g, '\n')
          .replace(/\s+\n/g, '\n')
          .replace(/\n{2,}/g, '\n')
          .trim();
        
        // Ensure proper PEM format
        if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
          privateKey = '-----BEGIN PRIVATE KEY-----\n' + privateKey;
        }
        if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
          privateKey = privateKey + '\n-----END PRIVATE KEY-----';
        }
        
        visionClient = new ImageAnnotatorClient({
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: privateKey,
          },
          projectId: process.env.GOOGLE_PROJECT_ID,
        });
        
        console.log('✅ Google Vision client initialized with environment variables');
        return visionClient;
      }
      
      throw new Error("Google Vision environment variables are missing or invalid");
    }
    
    return visionClient;
  } catch (error) {
    console.error('❌ Failed to initialize Google Vision client:', error);
    throw error;
  }
}

// Test function to verify credentials
export async function testGoogleVisionCredentials() {
  try {
    console.log('🧪 Testing Google Vision credentials...');
    const client = getVisionClient();
    
    if (!client) {
      console.error('❌ Failed to get Google Vision client');
      return false;
    }
    
    // Test with a minimal API call
    const [result] = await client.textDetection({
      image: {
        content: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
      }
    });
    
    console.log('✅ Google Vision API test successful');
    return true;
  } catch (error) {
    console.error('❌ Google Vision API test failed:', error);
    return false;
  }
}

// For backward compatibility
export { getVisionClient as visionClient };