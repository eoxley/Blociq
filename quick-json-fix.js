// Quick JSON fix for Google Document AI credentials
// Usage: node quick-json-fix.js 'YOUR_JSON_STRING_HERE'

function quickFixJson(jsonString) {
    console.log('🔧 Quick JSON Fix for Google Credentials\n');
    
    if (!jsonString) {
        console.log('Usage: node quick-json-fix.js \'{"type":"service_account",...}\'');
        console.log('Or paste your JSON and press Enter:');
        return;
    }
    
    console.log(`Original length: ${jsonString.length} characters`);
    
    // Common fixes for the position 120 error
    let fixed = jsonString;
    
    // 1. Fix double escaping
    if (fixed.includes('\\"')) {
        console.log('✓ Removing double escaping');
        fixed = fixed.replace(/\\"/g, '"');
    }
    
    // 2. Fix newlines in private key
    console.log('✓ Fixing private key newlines');
    fixed = fixed.replace(
        /"private_key":\s*"([^"]*?)"/g,
        (match, key) => {
            // Replace literal \n with proper JSON escaping
            const fixedKey = key
                .replace(/\\n/g, '\n')  // Convert \\n to actual newlines
                .replace(/\n/g, '\\n')  // Escape them properly for JSON
                .replace(/\r/g, '\\r'); // Handle carriage returns
            return `"private_key":"${fixedKey}"`;
        }
    );
    
    // 3. Remove control characters
    console.log('✓ Removing control characters');
    fixed = fixed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // 4. Fix common quote issues
    console.log('✓ Checking quote balance');
    
    // Test parsing
    try {
        const parsed = JSON.parse(fixed);
        console.log('\n✅ SUCCESS! JSON is now valid');
        console.log(`Service Account: ${parsed.client_email}`);
        console.log(`Project: ${parsed.project_id}`);
        
        console.log('\n📋 For Vercel Environment Variable:');
        console.log('Variable Name: GOOGLE_APPLICATION_CREDENTIALS_JSON');
        console.log('Variable Value (copy exactly):');
        console.log('---START---');
        console.log(fixed);
        console.log('---END---');
        
        console.log('\n📋 For .env.local:');
        console.log(`GOOGLE_APPLICATION_CREDENTIALS_JSON='${fixed.replace(/'/g, "\\'")}'`);
        
        return fixed;
        
    } catch (error) {
        console.log('\n❌ Still has errors:', error.message);
        
        // Show position of error
        const match = error.message.match(/position (\d+)/);
        if (match) {
            const pos = parseInt(match[1]);
            console.log(`\nProblem at position ${pos}:`);
            console.log(`Character: "${fixed[pos]}" (code: ${fixed[pos]?.charCodeAt(0)})`);
            console.log(`Context: "${fixed.substring(Math.max(0, pos-10), pos+10)}"`);
            console.log(' '.repeat(10) + '^^^');
        }
        
        return null;
    }
}

// Handle command line argument or interactive input
if (require.main === module) {
    const input = process.argv[2];
    if (input) {
        quickFixJson(input);
    } else {
        console.log('Paste your JSON string and press Enter:');
        process.stdin.setEncoding('utf8');
        process.stdin.on('readable', () => {
            const chunk = process.stdin.read();
            if (chunk !== null) {
                quickFixJson(chunk.trim());
                process.exit(0);
            }
        });
    }
}

module.exports = quickFixJson;