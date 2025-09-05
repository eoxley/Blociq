const fs = require('fs');

function fixGoogleCredentialsJson(inputJson) {
    console.log('🔧 Fixing Google Credentials JSON formatting...\n');
    
    let jsonString = inputJson || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    
    if (!jsonString) {
        console.log('❌ No JSON provided. Please provide JSON as argument or set GOOGLE_APPLICATION_CREDENTIALS_JSON');
        return null;
    }
    
    console.log('📊 Original JSON length:', jsonString.length);
    
    // Step 1: Handle common escaping issues
    console.log('Step 1: Fixing escape sequences...');
    
    // If the JSON is double-encoded (common with environment variables), decode it
    if (jsonString.includes('\\"')) {
        console.log('  - Removing double escaping');
        jsonString = jsonString.replace(/\\"/g, '"');
    }
    
    // Step 2: Fix private key formatting
    console.log('Step 2: Fixing private key formatting...');
    
    // Find the private key and fix newlines
    const privateKeyRegex = /"private_key":\s*"([^"]+)"/;
    const match = jsonString.match(privateKeyRegex);
    
    if (match) {
        const originalPrivateKey = match[1];
        console.log('  - Found private key, fixing newlines');
        
        // Replace literal \n with actual newlines, then escape properly for JSON
        let fixedPrivateKey = originalPrivateKey
            .replace(/\\n/g, '\n')  // Convert \\n to actual newlines
            .replace(/\n/g, '\\n'); // Then escape them properly for JSON
        
        jsonString = jsonString.replace(originalPrivateKey, fixedPrivateKey);
    }
    
    // Step 3: Remove any actual control characters
    console.log('Step 3: Removing control characters...');
    
    // Remove or escape control characters (except those that should be escaped in JSON)
    jsonString = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Step 4: Validate and test parsing
    console.log('Step 4: Testing JSON parsing...');
    
    try {
        const parsed = JSON.parse(jsonString);
        console.log('✅ JSON parsing successful!');
        console.log('✅ Service account:', parsed.client_email);
        console.log('✅ Project ID:', parsed.project_id);
        
        // Validate required fields for Document AI
        const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id', 'auth_uri', 'token_uri'];
        const missingFields = requiredFields.filter(field => !parsed[field]);
        
        if (missingFields.length > 0) {
            console.log('⚠️  Missing required fields:', missingFields.join(', '));
        } else {
            console.log('✅ All required fields present');
        }
        
        return {
            success: true,
            fixedJson: jsonString,
            parsed: parsed
        };
        
    } catch (error) {
        console.log('❌ JSON parsing still failed:', error.message);
        
        // Try one more fix: ensure proper quote escaping
        console.log('Attempting additional quote escaping fix...');
        
        // More aggressive fix for quotes in private key
        const quoteFix = jsonString.replace(
            /"private_key":\s*"([^"]+)"/,
            (match, privateKey) => {
                const fixedKey = privateKey.replace(/"/g, '\\"');
                return `"private_key":"${fixedKey}"`;
            }
        );
        
        try {
            const parsed = JSON.parse(quoteFix);
            console.log('✅ JSON parsing successful after quote fix!');
            return {
                success: true,
                fixedJson: quoteFix,
                parsed: parsed
            };
        } catch (secondError) {
            console.log('❌ Still failed after quote fix:', secondError.message);
            return {
                success: false,
                error: secondError.message,
                originalJson: inputJson,
                attemptedFix: quoteFix
            };
        }
    }
}

// Generate properly formatted environment variable
function generateEnvVariable(fixedJson) {
    console.log('\n🎯 Environment Variable Setup:');
    console.log('For .env.local:');
    console.log(`GOOGLE_APPLICATION_CREDENTIALS_JSON='${fixedJson.replace(/'/g, "\\'")}'`);
    
    console.log('\nFor Vercel dashboard (copy this exactly):');
    console.log(fixedJson);
    
    console.log('\nFor shell export:');
    console.log(`export GOOGLE_APPLICATION_CREDENTIALS_JSON='${fixedJson.replace(/'/g, "\\'")}'`);
}

// CLI usage
if (require.main === module) {
    const inputJson = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const result = fixGoogleCredentialsJson(inputJson);
    
    if (result && result.success) {
        generateEnvVariable(result.fixedJson);
        
        // Save fixed version to file for easy copying
        fs.writeFileSync('fixed-google-credentials.json', result.fixedJson);
        console.log('\n💾 Fixed JSON saved to: fixed-google-credentials.json');
    }
}

module.exports = { fixGoogleCredentialsJson, generateEnvVariable };