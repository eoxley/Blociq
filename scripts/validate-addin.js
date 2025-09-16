#!/usr/bin/env node

/**
 * BlocIQ Outlook Add-in Validation Script
 * Validates manifest.xml and tests all referenced URLs
 */

const https = require('https');
const fs = require('fs');
const xml2js = require('xml2js');

async function validateManifest() {
  console.log('🔍 Validating BlocIQ Outlook Add-in...\n');
  
  try {
    // Read manifest.xml - try both locations
    let manifestPath = './public/outlook-addin/manifest.xml';
    let manifestXml;
    
    try {
      manifestXml = fs.readFileSync(manifestPath, 'utf8');
      console.log(`📄 Using manifest: ${manifestPath}`);
    } catch (error) {
      // Fallback to individual manifests
      manifestPath = './public/ask-blociq.xml';
      manifestXml = fs.readFileSync(manifestPath, 'utf8');
      console.log(`📄 Using fallback manifest: ${manifestPath}`);
    }
    
    // Parse XML
    const parser = new xml2js.Parser();
    const manifest = await parser.parseStringPromise(manifestXml);
    
    const officeApp = manifest.OfficeApp;
    
    console.log('📋 Manifest Information:');
    console.log(`   ID: ${officeApp.Id[0]}`);
    console.log(`   Version: ${officeApp.Version[0]}`);
    console.log(`   Name: ${officeApp.DisplayName[0].$.DefaultValue}`);
    console.log(`   Description: ${officeApp.Description[0].$.DefaultValue}`);
    console.log('');
    
    // Test URLs
    const urlsToTest = [
      officeApp.IconUrl[0].$.DefaultValue,
      officeApp.HighResolutionIconUrl[0].$.DefaultValue,
      officeApp.SupportUrl[0].$.DefaultValue
    ];
    
    // Add optional URLs if they exist
    if (officeApp.PrivacyUrl) {
      urlsToTest.push(officeApp.PrivacyUrl[0].$.DefaultValue);
    }
    if (officeApp.TermsOfUseUrl) {
      urlsToTest.push(officeApp.TermsOfUseUrl[0].$.DefaultValue);
    }
    
    // Add URLs from VersionOverrides
    const versionOverrides = officeApp.VersionOverrides[0].VersionOverrides[0];
    const resources = versionOverrides.Resources[0];
    
    if (resources.bt$Urls) {
      resources.bt$Urls[0].bt$Url.forEach(url => {
        urlsToTest.push(url.$.DefaultValue);
      });
    }
    
    console.log('🌐 Testing URLs...');
    let allUrlsValid = true;
    
    for (const url of urlsToTest) {
      try {
        const status = await testUrl(url);
        const statusEmoji = status === 200 ? '✅' : '❌';
        console.log(`   ${statusEmoji} ${url} (${status})`);
        
        if (status !== 200) {
          allUrlsValid = false;
        }
      } catch (error) {
        console.log(`   ❌ ${url} (Error: ${error.message})`);
        allUrlsValid = false;
      }
    }
    
    console.log('');
    
    if (allUrlsValid) {
      console.log('✅ All URLs are accessible!');
    } else {
      console.log('❌ Some URLs are not accessible. Please fix these before submitting.');
    }
    
    // Check for common issues
    console.log('\n🔧 Common Issues Check:');
    
    // Check for HTTPS
    const nonHttpsUrls = urlsToTest.filter(url => !url.startsWith('https://'));
    if (nonHttpsUrls.length > 0) {
      console.log('   ❌ Non-HTTPS URLs found (Microsoft requires HTTPS):');
      nonHttpsUrls.forEach(url => console.log(`      - ${url}`));
    } else {
      console.log('   ✅ All URLs use HTTPS');
    }
    
    // Check description length (Microsoft prefers detailed descriptions)
    const description = officeApp.Description[0].$.DefaultValue;
    if (description.length < 50) {
      console.log('   ⚠️  Description is quite short. Consider adding more detail for better Microsoft approval.');
    } else {
      console.log('   ✅ Description length looks good');
    }
    
    // Check for privacy policy and terms
    if (officeApp.PrivacyUrl && officeApp.TermsOfUseUrl) {
      console.log('   ✅ Privacy Policy and Terms of Use URLs included');
    } else {
      console.log('   ⚠️  Missing Privacy Policy or Terms of Use URLs (recommended for Microsoft approval)');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Fix any URL issues identified above');
    console.log('   2. Test the add-in locally using "npm run dev" and sideload in Outlook');
    console.log('   3. Submit to Microsoft Partner Center for approval');
    console.log('   4. Monitor the approval status and respond to any feedback');
    
  } catch (error) {
    console.error('❌ Error validating manifest:', error.message);
    process.exit(1);
  }
}

function testUrl(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      resolve(response.statusCode);
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Run validation
validateManifest().catch(console.error);
