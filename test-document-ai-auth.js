const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');

async function testDocumentAIAuth() {
    console.log('🧪 Testing Google Document AI Authentication...\n');
    
    try {
        // Method 1: Test JSON parsing first
        console.log('Step 1: Testing JSON credentials parsing...');
        
        const jsonString = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        if (!jsonString) {
            throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not set');
        }
        
        console.log(`JSON string length: ${jsonString.length}`);
        
        let credentials;
        try {
            credentials = JSON.parse(jsonString);
            console.log('✅ JSON parsing successful');
            console.log(`✅ Service account: ${credentials.client_email}`);
            console.log(`✅ Project ID: ${credentials.project_id}`);
        } catch (parseError) {
            console.log('❌ JSON parsing failed:', parseError.message);
            
            // Try the fix script
            console.log('\n🔧 Attempting automatic fix...');
            const { fixGoogleCredentialsJson } = require('./fix-google-credentials');
            const result = fixGoogleCredentialsJson(jsonString);
            
            if (result && result.success) {
                credentials = result.parsed;
                console.log('✅ JSON fixed and parsed successfully');
            } else {
                throw new Error('Could not fix JSON: ' + (result?.error || 'Unknown error'));
            }
        }
        
        // Method 2: Test Document AI client initialization
        console.log('\nStep 2: Testing Document AI client initialization...');
        
        const client = new DocumentProcessorServiceClient({
            credentials: credentials,
            projectId: credentials.project_id
        });
        
        console.log('✅ Document AI client created successfully');
        
        // Method 3: Test basic API call (list processors)
        console.log('\nStep 3: Testing API connectivity...');
        
        const location = 'us'; // or 'eu' depending on your setup
        const parent = `projects/${credentials.project_id}/locations/${location}`;
        
        try {
            const [processors] = await client.listProcessors({
                parent: parent
            });
            
            console.log(`✅ API call successful! Found ${processors.length} processors`);
            
            if (processors.length > 0) {
                console.log('\n📋 Available processors:');
                processors.forEach((processor, index) => {
                    console.log(`  ${index + 1}. ${processor.displayName} (${processor.type})`);
                    console.log(`     Name: ${processor.name}`);
                    console.log(`     State: ${processor.state}`);
                });
            } else {
                console.log('ℹ️  No processors found. You may need to create one first.');
            }
            
        } catch (apiError) {
            if (apiError.code === 7) { // PERMISSION_DENIED
                console.log('❌ Permission denied. Check that the service account has Document AI permissions');
                console.log('   Required roles: roles/documentai.editor or roles/documentai.apiUser');
            } else if (apiError.code === 3) { // INVALID_ARGUMENT
                console.log('❌ Invalid argument. Check that the project ID and location are correct');
            } else {
                console.log('❌ API call failed:', apiError.message);
            }
            throw apiError;
        }
        
        console.log('\n🎉 All tests passed! Document AI authentication is working correctly.');
        
        return {
            success: true,
            credentials: credentials,
            processorsCount: processors?.length || 0
        };
        
    } catch (error) {
        console.log('\n💥 Test failed:', error.message);
        
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Run: node diagnose-json-error.js');
        console.log('2. Run: node fix-google-credentials.js');
        console.log('3. Check service account permissions in Google Cloud Console');
        console.log('4. Verify GOOGLE_APPLICATION_CREDENTIALS_JSON is set correctly');
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Export for use in other scripts
if (require.main === module) {
    testDocumentAIAuth().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = testDocumentAIAuth;