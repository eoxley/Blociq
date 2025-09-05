const fs = require('fs');

function diagnoseJsonError() {
    console.log('🔍 Diagnosing Google Credentials JSON parsing error...\n');
    
    // Get the JSON string from environment variable
    const jsonString = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    
    if (!jsonString) {
        console.log('❌ GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not found');
        console.log('Please set it with: export GOOGLE_APPLICATION_CREDENTIALS_JSON=\'{"type":"service_account",...}\'');
        return;
    }
    
    console.log('📊 JSON String Analysis:');
    console.log(`Total length: ${jsonString.length} characters`);
    console.log(`First 50 chars: ${jsonString.substring(0, 50)}...`);
    console.log(`Last 50 chars: ...${jsonString.substring(jsonString.length - 50)}`);
    
    // Check character at position 120 and surrounding area
    console.log('\n🎯 Problem Area Analysis (around position 120):');
    const startPos = Math.max(0, 115);
    const endPos = Math.min(jsonString.length, 125);
    
    console.log(`Characters ${startPos}-${endPos}:`);
    for (let i = startPos; i < endPos; i++) {
        const char = jsonString[i];
        const charCode = char.charCodeAt(0);
        const isControl = charCode < 32 || charCode === 127;
        
        console.log(`Position ${i}: "${char}" (code: ${charCode})${isControl ? ' ⚠️  CONTROL CHARACTER' : ''}`);
        
        if (i === 120) {
            console.log('  👆 THIS IS POSITION 120 (the error position)');
        }
    }
    
    // Try to parse and catch the specific error
    console.log('\n🧪 JSON Parsing Test:');
    try {
        const parsed = JSON.parse(jsonString);
        console.log('✅ JSON parsed successfully!');
        console.log('Service account email:', parsed.client_email);
    } catch (error) {
        console.log('❌ JSON parsing failed:');
        console.log(`Error: ${error.message}`);
        
        // Extract position from error message
        const match = error.message.match(/position (\d+)/);
        if (match) {
            const errorPos = parseInt(match[1]);
            console.log(`\n🔍 Character at error position ${errorPos}:`);
            
            const problemChar = jsonString[errorPos];
            const charCode = problemChar ? problemChar.charCodeAt(0) : null;
            
            console.log(`Character: "${problemChar}"`);
            console.log(`Character code: ${charCode}`);
            console.log(`Is control character: ${charCode < 32 || charCode === 127}`);
            
            // Show context around error
            const contextStart = Math.max(0, errorPos - 20);
            const contextEnd = Math.min(jsonString.length, errorPos + 20);
            console.log(`\nContext: "${jsonString.substring(contextStart, contextEnd)}"`);
            console.log(' '.repeat(errorPos - contextStart) + '^^^^ ERROR HERE');
        }
    }
    
    // Check for common issues
    console.log('\n🔧 Common Issue Checks:');
    
    // Check for unescaped newlines
    const newlineMatches = jsonString.match(/(?<!\\)\n/g);
    if (newlineMatches) {
        console.log(`⚠️  Found ${newlineMatches.length} unescaped newline characters`);
    }
    
    // Check for unescaped quotes
    const unescapedQuotes = jsonString.match(/(?<!\\)"/g);
    if (unescapedQuotes && unescapedQuotes.length % 2 !== 0) {
        console.log('⚠️  Possibly unmatched quote characters');
    }
    
    // Check for control characters in private key area
    const privateKeyMatch = jsonString.match(/"private_key":\s*"([^"]+)"/);
    if (privateKeyMatch) {
        const privateKey = privateKeyMatch[1];
        const controlChars = privateKey.match(/[\x00-\x1F\x7F]/g);
        if (controlChars) {
            console.log(`⚠️  Found ${controlChars.length} control characters in private_key`);
        }
    }
}

// Export for use in other scripts
if (require.main === module) {
    diagnoseJsonError();
}

module.exports = diagnoseJsonError;