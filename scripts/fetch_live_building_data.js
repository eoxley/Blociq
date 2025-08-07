const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const BUILDING_URL = 'https://www.blociq.co.uk/buildings/2beeec1d-a94e-4058-b881-213d74cc6830';
const OUTPUT_FILE = 'live_building_data.json';

// Helper function to make HTTPS requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Function to extract JSON data from HTML
function extractJsonFromHtml(html) {
  const jsonMatches = [];
  
  // Look for script tags with JSON data
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1];
    
    // Look for JSON patterns
    const jsonPatterns = [
      /window\.__NEXT_DATA__\s*=\s*({[\s\S]*?});/,
      /window\.initialData\s*=\s*({[\s\S]*?});/,
      /window\.pageData\s*=\s*({[\s\S]*?});/,
      /const\s+data\s*=\s*({[\s\S]*?});/,
      /let\s+data\s*=\s*({[\s\S]*?});/,
      /var\s+data\s*=\s*({[\s\S]*?});/
    ];
    
    for (const pattern of jsonPatterns) {
      const jsonMatch = scriptContent.match(pattern);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          jsonMatches.push(jsonData);
        } catch (e) {
          // Try to clean up the JSON string
          try {
            const cleaned = jsonMatch[1]
              .replace(/,\s*}/g, '}')
              .replace(/,\s*]/g, ']')
              .replace(/undefined/g, 'null')
              .replace(/null\s*,/g, '');
            const jsonData = JSON.parse(cleaned);
            jsonMatches.push(jsonData);
          } catch (e2) {
            console.log('Failed to parse JSON:', e2.message);
          }
        }
      }
    }
  }
  
  return jsonMatches;
}

// Function to extract building information from HTML
function extractBuildingInfo(html) {
  const buildingInfo = {
    name: null,
    address: null,
    description: null,
    units: [],
    majorWorks: [],
    compliance: []
  };
  
  // Extract building name
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (nameMatch) {
    buildingInfo.name = nameMatch[1].trim();
  }
  
  // Extract address
  const addressMatch = html.match(/<address[^>]*>([^<]+)<\/address>/i) ||
                      html.match(/class="[^"]*address[^"]*"[^>]*>([^<]+)</i) ||
                      html.match(/data-address="([^"]+)"/i);
  if (addressMatch) {
    buildingInfo.address = addressMatch[1].trim();
  }
  
  // Extract description
  const descMatch = html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                   html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/div>/i);
  if (descMatch) {
    buildingInfo.description = descMatch[1].trim();
  }
  
  return buildingInfo;
}

// Function to extract units information
function extractUnitsInfo(html) {
  const units = [];
  
  // Look for unit patterns in HTML
  const unitPatterns = [
    /<div[^>]*class="[^"]*unit[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<li[^>]*class="[^"]*unit[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
    /<tr[^>]*class="[^"]*unit[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  ];
  
  for (const pattern of unitPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const unitHtml = match[1];
      
      // Extract unit number
      const unitNumberMatch = unitHtml.match(/(?:Unit|Apartment|Flat)\s*#?\s*([A-Za-z0-9\-]+)/i) ||
                             unitHtml.match(/class="[^"]*unit-number[^"]*"[^>]*>([^<]+)</i);
      
      // Extract floor
      const floorMatch = unitHtml.match(/(?:Floor|Level)\s*([A-Za-z0-9]+)/i) ||
                        unitHtml.match(/class="[^"]*floor[^"]*"[^>]*>([^<]+)</i);
      
      // Extract type
      const typeMatch = unitHtml.match(/(?:Type|Category)\s*:\s*([A-Za-z\s]+)/i) ||
                       unitHtml.match(/class="[^"]*type[^"]*"[^>]*>([^<]+)</i);
      
      if (unitNumberMatch) {
        units.push({
          unitNumber: unitNumberMatch[1].trim(),
          floor: floorMatch ? floorMatch[1].trim() : null,
          type: typeMatch ? typeMatch[1].trim() : null,
          rawHtml: unitHtml
        });
      }
    }
  }
  
  return units;
}

// Function to extract major works information
function extractMajorWorksInfo(html) {
  const majorWorks = [];
  
  // Look for major works patterns
  const worksPatterns = [
    /<div[^>]*class="[^"]*major-works[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*project[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*class="[^"]*works[^"]*"[^>]*>([\s\S]*?)<\/section>/gi
  ];
  
  for (const pattern of worksPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const worksHtml = match[1];
      
      // Extract project title
      const titleMatch = worksHtml.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/i) ||
                        worksHtml.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</i);
      
      // Extract status
      const statusMatch = worksHtml.match(/Status\s*:\s*([A-Za-z\s]+)/i) ||
                         worksHtml.match(/class="[^"]*status[^"]*"[^>]*>([^<]+)</i);
      
      // Extract description
      const descMatch = worksHtml.match(/<p[^>]*>([^<]+)<\/p>/i);
      
      if (titleMatch) {
        majorWorks.push({
          title: titleMatch[1].trim(),
          status: statusMatch ? statusMatch[1].trim() : null,
          description: descMatch ? descMatch[1].trim() : null,
          rawHtml: worksHtml
        });
      }
    }
  }
  
  return majorWorks;
}

// Function to extract compliance information
function extractComplianceInfo(html) {
  const compliance = [];
  
  // Look for compliance patterns
  const compliancePatterns = [
    /<div[^>]*class="[^"]*compliance[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*certificate[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*class="[^"]*compliance[^"]*"[^>]*>([\s\S]*?)<\/section>/gi
  ];
  
  for (const pattern of compliancePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const complianceHtml = match[1];
      
      // Extract certificate type
      const typeMatch = complianceHtml.match(/(?:Certificate|Document)\s*Type\s*:\s*([A-Za-z\s]+)/i) ||
                       complianceHtml.match(/class="[^"]*type[^"]*"[^>]*>([^<]+)</i);
      
      // Extract expiry date
      const expiryMatch = complianceHtml.match(/Expiry\s*Date\s*:\s*([0-9\/\-]+)/i) ||
                         complianceHtml.match(/class="[^"]*expiry[^"]*"[^>]*>([^<]+)</i);
      
      // Extract status
      const statusMatch = complianceHtml.match(/Status\s*:\s*([A-Za-z\s]+)/i) ||
                         complianceHtml.match(/class="[^"]*status[^"]*"[^>]*>([^<]+)</i);
      
      if (typeMatch) {
        compliance.push({
          type: typeMatch[1].trim(),
          expiryDate: expiryMatch ? expiryMatch[1].trim() : null,
          status: statusMatch ? statusMatch[1].trim() : null,
          rawHtml: complianceHtml
        });
      }
    }
  }
  
  return compliance;
}

// Main function to fetch and process data
async function fetchLiveBuildingData() {
  try {
    console.log('🚀 Starting live data extraction from:', BUILDING_URL);
    
    // Fetch the main page
    console.log('📡 Fetching main page...');
    const response = await makeRequest(BUILDING_URL);
    
    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}: Failed to fetch page`);
    }
    
    console.log('✅ Page fetched successfully');
    console.log('📊 Page size:', response.data.length, 'characters');
    
    // Extract JSON data from HTML
    console.log('🔍 Extracting JSON data...');
    const jsonData = extractJsonFromHtml(response.data);
    console.log('📋 Found', jsonData.length, 'JSON data blocks');
    
    // Extract building information from HTML
    console.log('🏢 Extracting building information...');
    const buildingInfo = extractBuildingInfo(response.data);
    
    // Extract units information
    console.log('🏠 Extracting units information...');
    const units = extractUnitsInfo(response.data);
    
    // Extract major works information
    console.log('🏗️ Extracting major works information...');
    const majorWorks = extractMajorWorksInfo(response.data);
    
    // Extract compliance information
    console.log('📋 Extracting compliance information...');
    const compliance = extractComplianceInfo(response.data);
    
    // Compile the final data structure
    const liveData = {
      url: BUILDING_URL,
      timestamp: new Date().toISOString(),
      building: buildingInfo,
      units: units,
      majorWorks: majorWorks,
      compliance: compliance,
      extractedJson: jsonData,
      rawHtml: response.data.substring(0, 1000) + '...' // First 1000 chars for debugging
    };
    
    // Save to file
    const outputPath = path.join(__dirname, OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(liveData, null, 2));
    
    console.log('💾 Data saved to:', outputPath);
    console.log('\n📊 Summary:');
    console.log('  Building:', buildingInfo.name || 'Not found');
    console.log('  Address:', buildingInfo.address || 'Not found');
    console.log('  Units found:', units.length);
    console.log('  Major works found:', majorWorks.length);
    console.log('  Compliance items found:', compliance.length);
    console.log('  JSON data blocks:', jsonData.length);
    
    return liveData;
    
  } catch (error) {
    console.error('❌ Error fetching live data:', error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  fetchLiveBuildingData()
    .then(data => {
      console.log('\n✅ Live data extraction completed successfully!');
    })
    .catch(error => {
      console.error('\n❌ Live data extraction failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fetchLiveBuildingData }; 