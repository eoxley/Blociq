// test-credentials.js
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');

async function testCredentials() {
  console.log('🔍 Testing Google Document AI credentials...');
  console.log('Note: You need to download blociq-vision-ocr-eb56bcc273e6.json from Google Cloud Console');
  console.log('Project: blociq-vision-ocr');
  console.log('Service Account: blociq-document-ai-service@blociq-vision-ocr.iam.gserviceaccount.com\n');
  
  // For now, return instructions since we need the actual service account key
  console.log('❌ Missing credentials file: blociq-vision-ocr-eb56bcc273e6.json');
  console.log('\n📋 Steps to get the credentials:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Select project: blociq-vision-ocr');
  console.log('3. Go to IAM & Admin → Service Accounts');
  console.log('4. Find: blociq-document-ai-service@blociq-vision-ocr.iam.gserviceaccount.com');
  console.log('5. Actions → Manage Keys → Add Key → Create New Key → JSON');
  console.log('6. Save as: blociq-vision-ocr-eb56bcc273e6.json in project root');
  
  return false;
  
  try {
    const client = new DocumentProcessorServiceClient({
      keyFilename: './blociq-vision-ocr-eb56bcc273e6.json',
      projectId: 'blociq-vision-ocr'
    });
    
    // Test by listing processors
    const parent = client.locationPath('blociq-vision-ocr', 'us');
    const [processors] = await client.listProcessors({ parent });
    
    console.log('✅ Credentials working!');
    console.log('Available processors:', processors.length);
    
    if (processors.length > 0) {
      console.log('Existing processors:');
      processors.forEach((processor, index) => {
        console.log(`${index + 1}. ${processor.displayName} (${processor.name.split('/').pop()})`);
      });
    } else {
      console.log('No processors found - you need to create one');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Credentials failed:', error.message);
    return false;
  }
}

testCredentials();