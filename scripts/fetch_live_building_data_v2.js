const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Configuration
const BUILDING_ID = '2beeec1d-a94e-4058-b881-213d74cc6830';
const BASE_URL = 'https://www.blociq.co.uk';
const OUTPUT_FILE = 'live_building_data_v2.json';

// Helper function to make HTTPS requests with proper decompression
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      // Handle different content encodings
      let stream = res;
      if (res.headers['content-encoding'] === 'gzip') {
        stream = res.pipe(zlib.createGunzip());
      } else if (res.headers['content-encoding'] === 'deflate') {
        stream = res.pipe(zlib.createInflate());
      } else if (res.headers['content-encoding'] === 'br') {
        stream = res.pipe(zlib.createBrotliDecompress());
      }
      
      stream.on('data', (chunk) => {
        data += chunk;
      });
      
      stream.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Function to try different API endpoints
async function tryApiEndpoints(buildingId) {
  const endpoints = [
    `/api/buildings/${buildingId}`,
    `/api/buildings/${buildingId}/units`,
    `/api/buildings/${buildingId}/major-works`,
    `/api/buildings/${buildingId}/compliance`,
    `/api/major-works/building/${buildingId}`,
    `/api/compliance/building/${buildingId}`,
    `/api/test-building?buildingId=${buildingId}`,
    `/api/test-building-page?buildingId=${buildingId}`,
    `/api/test-units?buildingId=${buildingId}`,
    `/api/test-compliance-access?buildingId=${buildingId}`,
    `/api/test-major-works`,
    `/api/list-buildings`
  ];

  const results = {};

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Trying endpoint: ${endpoint}`);
      const response = await makeRequest(`${BASE_URL}${endpoint}`);
      
      if (response.statusCode === 200) {
        try {
          const jsonData = JSON.parse(response.data);
          results[endpoint] = {
            status: 'success',
            data: jsonData
          };
          console.log(`✅ Success: ${endpoint}`);
        } catch (parseError) {
          results[endpoint] = {
            status: 'parse_error',
            error: parseError.message,
            rawData: response.data.substring(0, 500)
          };
          console.log(`⚠️ Parse error: ${endpoint}`);
        }
      } else {
        results[endpoint] = {
          status: 'http_error',
          statusCode: response.statusCode,
          data: response.data.substring(0, 500)
        };
        console.log(`❌ HTTP ${response.statusCode}: ${endpoint}`);
      }
    } catch (error) {
      results[endpoint] = {
        status: 'request_error',
        error: error.message
      };
      console.log(`❌ Request error: ${endpoint} - ${error.message}`);
    }
  }

  return results;
}

// Function to extract data from HTML (improved version)
function extractDataFromHtml(html) {
  const extracted = {
    building: {},
    units: [],
    majorWorks: [],
    compliance: []
  };

  // Try to find JSON data in script tags
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1];
    
    // Look for various JSON patterns
    const patterns = [
      /window\.__NEXT_DATA__\s*=\s*({[\s\S]*?});/,
      /window\.initialData\s*=\s*({[\s\S]*?});/,
      /window\.pageData\s*=\s*({[\s\S]*?});/,
      /const\s+data\s*=\s*({[\s\S]*?});/,
      /let\s+data\s*=\s*({[\s\S]*?});/,
      /var\s+data\s*=\s*({[\s\S]*?});/,
      /"building":\s*({[\s\S]*?})/,
      /"units":\s*(\[[\s\S]*?\])/,
      /"majorWorks":\s*(\[[\s\S]*?\])/,
      /"compliance":\s*(\[[\s\S]*?\])/
    ];
    
    for (const pattern of patterns) {
      const jsonMatch = scriptContent.match(pattern);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          if (jsonData.building) extracted.building = jsonData.building;
          if (jsonData.units) extracted.units = jsonData.units;
          if (jsonData.majorWorks) extracted.majorWorks = jsonData.majorWorks;
          if (jsonData.compliance) extracted.compliance = jsonData.compliance;
        } catch (e) {
          // Try to clean up the JSON string
          try {
            const cleaned = jsonMatch[1]
              .replace(/,\s*}/g, '}')
              .replace(/,\s*]/g, ']')
              .replace(/undefined/g, 'null')
              .replace(/null\s*,/g, '');
            const jsonData = JSON.parse(cleaned);
            if (jsonData.building) extracted.building = jsonData.building;
            if (jsonData.units) extracted.units = jsonData.units;
            if (jsonData.majorWorks) extracted.majorWorks = jsonData.majorWorks;
            if (jsonData.compliance) extracted.compliance = jsonData.compliance;
          } catch (e2) {
            console.log('Failed to parse JSON pattern:', e2.message);
          }
        }
      }
    }
  }

  // Extract building name from HTML
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                   html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (nameMatch && !extracted.building.name) {
    extracted.building.name = nameMatch[1].trim();
  }

  // Extract address from HTML
  const addressMatch = html.match(/<address[^>]*>([^<]+)<\/address>/i) ||
                      html.match(/class="[^"]*address[^"]*"[^>]*>([^<]+)</i) ||
                      html.match(/data-address="([^"]+)"/i);
  if (addressMatch && !extracted.building.address) {
    extracted.building.address = addressMatch[1].trim();
  }

  return extracted;
}

// Main function to fetch and process data
async function fetchLiveBuildingData() {
  try {
    console.log('🚀 Starting live data extraction for building:', BUILDING_ID);
    
    // Try API endpoints first
    console.log('\n📡 Trying API endpoints...');
    const apiResults = await tryApiEndpoints(BUILDING_ID);
    
    // Try the main building page
    console.log('\n📡 Fetching main building page...');
    const pageResponse = await makeRequest(`${BASE_URL}/buildings/${BUILDING_ID}`);
    
    let pageData = null;
    if (pageResponse.statusCode === 200) {
      console.log('✅ Main page fetched successfully');
      pageData = extractDataFromHtml(pageResponse.data);
    } else {
      console.log(`❌ Main page failed: HTTP ${pageResponse.statusCode}`);
    }
    
    // Compile the final data structure
    const liveData = {
      buildingId: BUILDING_ID,
      url: `${BASE_URL}/buildings/${BUILDING_ID}`,
      timestamp: new Date().toISOString(),
      apiResults: apiResults,
      pageData: pageData,
      summary: {
        successfulApis: Object.keys(apiResults).filter(key => apiResults[key].status === 'success').length,
        totalApis: Object.keys(apiResults).length,
        hasPageData: !!pageData
      }
    };
    
    // Save to file
    const outputPath = path.join(__dirname, OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(liveData, null, 2));
    
    console.log('\n💾 Data saved to:', outputPath);
    console.log('\n📊 Summary:');
    console.log('  Successful APIs:', liveData.summary.successfulApis);
    console.log('  Total APIs tried:', liveData.summary.totalApis);
    console.log('  Page data extracted:', liveData.summary.hasPageData);
    
    // Show successful API results
    const successfulApis = Object.keys(apiResults).filter(key => apiResults[key].status === 'success');
    if (successfulApis.length > 0) {
      console.log('\n✅ Successful API endpoints:');
      successfulApis.forEach(api => {
        console.log(`  - ${api}`);
      });
    }
    
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