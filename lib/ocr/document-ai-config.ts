const path = require('path');

const ocrConfig = {
  // Google Document AI configuration
  google: {
    applicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || './blociq-vision-ocr-eb56bcc273e6.json',
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'blociq-vision-ocr',
    location: process.env.DOCUMENT_AI_LOCATION || 'us',
    
    // Initialize Google Document AI client
    getDocumentAIClient: function() {
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
      
      return new DocumentProcessorServiceClient({
        keyFilename: this.applicationCredentials,
        projectId: this.projectId
      });
    }
  },
  
  // Fallback configuration
  fallback: {
    useBasicPDFExtraction: true,
    enableTestMode: false
  }
};

module.exports = ocrConfig;