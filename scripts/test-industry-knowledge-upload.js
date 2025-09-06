#!/usr/bin/env node

/**
 * Test script for industry knowledge PDF upload functionality
 */

const fs = require('fs');
const path = require('path');

// Create a test PDF content (simulate a small PDF)
function createTestPDF() {
  const testContent = 'This is a test industry knowledge document about property management regulations and compliance requirements.';
  const testDocPath = path.join(__dirname, 'test-industry-knowledge.pdf');
  
  // Create a simple text file that simulates PDF content
  fs.writeFileSync(testDocPath, testContent);
  console.log(`📄 Created test PDF: ${testDocPath}`);
  
  return testDocPath;
}

async function testIndustryKnowledgeUpload() {
  console.log('🧠 Testing Industry Knowledge PDF Upload...\n');
  
  try {
    // Create test PDF
    const testDocPath = createTestPDF();
    const fileBuffer = fs.readFileSync(testDocPath);
    const base64Content = fileBuffer.toString('base64');
    
    // Create form data
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), 'test-industry-knowledge.pdf');
    formData.append('title', 'Test Industry Knowledge Document');
    formData.append('category', 'compliance');
    formData.append('subcategory', 'regulations');
    formData.append('tags', 'test, compliance, regulations, property management');
    
    console.log('📤 Uploading PDF to industry knowledge system...');
    
    const response = await fetch('http://localhost:3000/api/admin/industry-knowledge/upload', {
      method: 'POST',
      body: formData
    });

    console.log('Response Status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Upload successful!');
      console.log('Document ID:', result.document?.id);
      console.log('Title:', result.document?.title);
      console.log('Category:', result.document?.category);
    } else {
      const error = await response.text();
      console.log('❌ Upload failed:', error);
    }
    
    // Clean up test file
    fs.unlinkSync(testDocPath);
    console.log('🧹 Cleaned up test file');
    
  } catch (error) {
    console.error('❌ Error testing industry knowledge upload:', error.message);
  }
}

async function testKnowledgeBaseStats() {
  console.log('\n📊 Testing Knowledge Base Statistics...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/industry-knowledge/upload');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Knowledge base stats retrieved:');
      console.log('Total Documents:', data.stats?.totalDocuments || 0);
      console.log('Total Chunks:', data.stats?.totalChunks || 0);
      console.log('Categories:', data.categories?.length || 0);
    } else {
      console.log('❌ Failed to get knowledge base stats');
    }
    
  } catch (error) {
    console.error('❌ Error getting knowledge base stats:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Industry Knowledge Upload Tests...\n');
  
  // Test knowledge base stats
  await testKnowledgeBaseStats();
  
  // Test PDF upload
  await testIndustryKnowledgeUpload();
  
  console.log('\n✅ Tests completed!');
}

// Run the tests
runTests().catch(console.error);
