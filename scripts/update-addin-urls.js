#!/usr/bin/env node

/**
 * BlocIQ Add-in URL Update Script
 * Updates manifest URLs based on environment
 */

const fs = require('fs');
const path = require('path');

// Environment configuration
const environments = {
  development: {
    baseUrl: 'https://blociq-frontend.vercel.app',
    manifestPath: './public/outlook-addin/manifest.xml'
  },
  production: {
    baseUrl: 'https://www.blociq.co.uk',
    manifestPath: './public/outlook-addin/manifest.xml'
  },
  local: {
    baseUrl: 'http://localhost:3000',
    manifestPath: './public/outlook-addin/manifest.xml'
  }
};

function updateManifestUrls(environment) {
  const config = environments[environment];
  
  if (!config) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.log('Available environments: development, production, local');
    process.exit(1);
  }

  console.log(`🔄 Updating add-in URLs for ${environment} environment...`);
  console.log(`   Base URL: ${config.baseUrl}`);

  try {
    // Read manifest
    const manifestPath = config.manifestPath;
    let manifestXml = fs.readFileSync(manifestPath, 'utf8');

    // Update URLs
    manifestXml = manifestXml.replace(/https:\/\/www\.blociq\.co\.uk/g, config.baseUrl);
    manifestXml = manifestXml.replace(/https:\/\/blociq-frontend\.vercel\.app/g, config.baseUrl);
    manifestXml = manifestXml.replace(/http:\/\/localhost:3000/g, config.baseUrl);

    // Write updated manifest
    fs.writeFileSync(manifestPath, manifestXml, 'utf8');

    console.log('✅ Manifest URLs updated successfully!');
    console.log(`   Updated: ${manifestPath}`);
    
    // Show updated URLs
    const lines = manifestXml.split('\n');
    const urlLines = lines.filter(line => 
      line.includes('DefaultValue="https://') || 
      line.includes('DefaultValue="http://')
    );
    
    console.log('\n📋 Updated URLs:');
    urlLines.forEach(line => {
      const match = line.match(/DefaultValue="([^"]+)"/);
      if (match) {
        console.log(`   ${match[1]}`);
      }
    });

  } catch (error) {
    console.error('❌ Error updating manifest:', error.message);
    process.exit(1);
  }
}

// Get environment from command line argument
const environment = process.argv[2] || 'production';

console.log('🚀 BlocIQ Add-in URL Updater');
console.log('============================\n');

updateManifestUrls(environment);
