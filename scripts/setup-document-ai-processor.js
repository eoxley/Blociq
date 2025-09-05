const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');

async function createDocumentProcessor() {
  const client = new DocumentProcessorServiceClient({
    keyFilename: './blociq-vision-ocr-eb56bcc273e6.json',
    projectId: 'blociq-vision-ocr'
  });
  
  const parent = client.locationPath('blociq-vision-ocr', 'us');
  
  const processor = {
    displayName: 'Lease Document Processor',
    type: 'FORM_PARSER_PROCESSOR',
  };

  try {
    const [response] = await client.createProcessor({
      parent,
      processor,
    });
    
    const processorId = response.name.split('/').pop();
    console.log('✅ Processor created successfully!');
    console.log('Add this to your .env file:');
    console.log(`DOCUMENT_AI_PROCESSOR_ID=${processorId}`);
    
    return processorId;
  } catch (error) {
    console.error('Failed to create processor:', error);
  }
}

// Run the setup
createDocumentProcessor().catch(console.error);