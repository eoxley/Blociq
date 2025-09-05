/**
 * Alternative Google Cloud Authentication Methods
 * Bypasses OpenSSL private key decoder issues in Vercel environment
 */

export interface AuthResult {
  success: boolean;
  method: 'api_key' | 'token' | 'service_account' | 'manual';
  credentials?: any;
  error?: string;
}

/**
 * Method 1: API Key Authentication (Most Reliable for Vercel)
 * Uses Google Cloud API Key instead of service account
 */
export async function authenticateWithAPIKey(): Promise<AuthResult> {
  try {
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_VISION_API_KEY;
    
    if (!apiKey) {
      throw new Error('No Google Cloud API Key found');
    }

    // Test the API key by making a simple request
    const testResponse = await fetch(`https://documentai.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!testResponse.ok) {
      throw new Error(`API Key test failed: ${testResponse.status}`);
    }

    console.log('✅ Google Cloud API Key authentication successful');
    
    return {
      success: true,
      method: 'api_key',
      credentials: { apiKey }
    };
  } catch (error) {
    console.log('⚠️  API Key authentication failed:', error);
    return {
      success: false,
      method: 'api_key',
      error: error instanceof Error ? error.message : 'Unknown API key error'
    };
  }
}

/**
 * Method 2: OAuth Token Authentication
 * Uses pre-generated access token
 */
export async function authenticateWithToken(): Promise<AuthResult> {
  try {
    const accessToken = process.env.GOOGLE_CLOUD_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('No Google Cloud Access Token found');
    }

    // Test the token
    const testResponse = await fetch(`https://documentai.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!testResponse.ok) {
      throw new Error(`Access Token test failed: ${testResponse.status}`);
    }

    console.log('✅ Google Cloud Access Token authentication successful');
    
    return {
      success: true,
      method: 'token',
      credentials: { accessToken }
    };
  } catch (error) {
    console.log('⚠️  Access Token authentication failed:', error);
    return {
      success: false,
      method: 'token',
      error: error instanceof Error ? error.message : 'Unknown token error'
    };
  }
}

/**
 * Method 3: REST API Direct Calls
 * Bypasses Google client library entirely
 */
export async function createProcessorWithAPIKey(displayName: string = 'BlocIQ Lease Processor'): Promise<any> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_VISION_API_KEY;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.DOCUMENT_AI_LOCATION || 'us';
  
  if (!apiKey || !projectId) {
    throw new Error('Missing required environment variables: GOOGLE_CLOUD_API_KEY, GOOGLE_CLOUD_PROJECT_ID');
  }

  const endpoint = `https://documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors?key=${apiKey}`;
  
  const processorConfig = {
    displayName,
    type: 'FORM_PARSER_PROCESSOR'
  };

  console.log('🔨 Creating Document AI processor via REST API...');
  console.log(`   Project: ${projectId}`);
  console.log(`   Location: ${location}`);
  console.log(`   Display Name: ${displayName}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(processorConfig)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create processor: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const processorId = result.name.split('/').pop();

  console.log('✅ Document AI processor created successfully!');
  console.log(`   Processor ID: ${processorId}`);
  console.log(`   Full Name: ${result.name}`);

  return {
    processorId,
    fullName: result.name,
    displayName: result.displayName,
    type: result.type,
    state: result.state
  };
}

/**
 * Method 4: List processors with API Key
 */
export async function listProcessorsWithAPIKey(): Promise<any[]> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_VISION_API_KEY;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.DOCUMENT_AI_LOCATION || 'us';
  
  if (!apiKey || !projectId) {
    return [];
  }

  try {
    const endpoint = `https://documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list processors: ${response.status}`);
    }

    const result = await response.json();
    return result.processors || [];
  } catch (error) {
    console.error('❌ Failed to list processors with API key:', error);
    return [];
  }
}

/**
 * Main alternative authentication function
 * Tries multiple methods in order of reliability for Vercel
 */
export async function tryAlternativeAuth(): Promise<AuthResult> {
  console.log('🔄 Trying alternative authentication methods...\n');

  // Method 1: API Key (most reliable for Vercel)
  const apiKeyResult = await authenticateWithAPIKey();
  if (apiKeyResult.success) {
    return apiKeyResult;
  }

  // Method 2: Access Token
  const tokenResult = await authenticateWithToken();
  if (tokenResult.success) {
    return tokenResult;
  }

  // All methods failed
  return {
    success: false,
    method: 'manual',
    error: `All authentication methods failed. API Key: ${apiKeyResult.error}, Token: ${tokenResult.error}`
  };
}

/**
 * Get authentication headers for REST API calls
 */
export function getAuthHeaders(): { [key: string]: string } {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_VISION_API_KEY;
  const accessToken = process.env.GOOGLE_CLOUD_ACCESS_TOKEN;

  if (accessToken) {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  } else if (apiKey) {
    return {
      'Content-Type': 'application/json'
    };
  } else {
    throw new Error('No authentication method available');
  }
}

/**
 * Get API endpoint with authentication
 */
export function getAuthenticatedEndpoint(baseEndpoint: string): string {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_VISION_API_KEY;
  
  if (apiKey) {
    const separator = baseEndpoint.includes('?') ? '&' : '?';
    return `${baseEndpoint}${separator}key=${apiKey}`;
  }
  
  return baseEndpoint;
}