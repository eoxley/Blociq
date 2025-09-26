#!/usr/bin/env node

/**
 * AI SYNCHRONIZATION ENFORCEMENT SCRIPT
 *
 * This script enforces the AI synchronization rules by:
 * 1. Checking system prompt consistency across endpoints
 * 2. Verifying response format standardization
 * 3. Ensuring block manager perspective is maintained
 * 4. Generating sync reports
 */

const fs = require('fs');
const path = require('path');

// Define the endpoints that must be synchronized
const AI_ENDPOINTS = {
  askAI: {
    path: 'app/api/ask-ai/route.ts',
    description: 'Main Ask BlocIQ endpoint',
    requiresBlockManager: true,
    requiresSystemPrompts: true
  },
  askAIPublic: {
    path: 'app/api/ask-ai-public/route.ts',
    description: 'Public Ask BlocIQ endpoint',
    requiresBlockManager: true,
    requiresSystemPrompts: true
  },
  outlookPublic: {
    path: 'app/api/ask-ai-outlook-public/route.ts',
    description: 'Public Outlook AI',
    requiresBlockManager: true,
    requiresSystemPrompts: true
  },
  outlookBlocIQ: {
    path: 'app/api/ask-ai-outlook-blociq/route.ts',
    description: 'Pro Outlook AI',
    requiresBlockManager: true,
    requiresSystemPrompts: true
  },
  addinGenerateReply: {
    path: 'app/api/addin/generate-reply/route.ts',
    description: 'Outlook Add-in Generate Reply',
    requiresBlockManager: true,
    requiresSystemPrompts: false
  },
  addinChat: {
    path: 'app/api/addin/chat/route.ts',
    description: 'Outlook Add-in Chat',
    requiresBlockManager: true,
    requiresSystemPrompts: false
  }
};

// Define required patterns for synchronization
const REQUIRED_PATTERNS = {
  blockManagerPerspective: {
    pattern: /professional block manager|block manager/i,
    description: 'Block manager perspective in system prompts'
  },
  firstPersonLanguage: {
    pattern: /I will arrange|I will contact|I will investigate/i,
    description: 'First person ownership language'
  },
  emailReplyFormat: {
    pattern: /Thank you for (bringing this|reporting this)/i,
    description: 'Proper email reply opening format'
  },
  professionalClosing: {
    pattern: /Kind regards|Best regards/i,
    description: 'Professional email closing'
  }
};

class AISyncEnforcer {
  constructor() {
    this.projectRoot = process.cwd();
    this.errors = [];
    this.warnings = [];
    this.successes = [];
  }

  /**
   * Main enforcement function
   */
  async enforce() {
    console.log('🤖 AI Synchronization Enforcement Started');
    console.log('=' .repeat(50));

    // Check all endpoints
    for (const [key, endpoint] of Object.entries(AI_ENDPOINTS)) {
      await this.checkEndpoint(key, endpoint);
    }

    // Generate report
    this.generateReport();

    // Return exit code
    return this.errors.length > 0 ? 1 : 0;
  }

  /**
   * Check a single endpoint for compliance
   */
  async checkEndpoint(key, endpoint) {
    console.log(`\\n📁 Checking ${endpoint.description} (${key})`);

    const filePath = path.join(this.projectRoot, endpoint.path);

    if (!fs.existsSync(filePath)) {
      this.errors.push(`❌ ${endpoint.description}: File not found at ${endpoint.path}`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // Check block manager perspective
    if (endpoint.requiresBlockManager) {
      this.checkBlockManagerPerspective(key, endpoint, content);
    }

    // Check system prompts if required
    if (endpoint.requiresSystemPrompts) {
      this.checkSystemPrompts(key, endpoint, content);
    }

    // Check response patterns
    this.checkResponsePatterns(key, endpoint, content);
  }

  /**
   * Check for block manager perspective
   */
  checkBlockManagerPerspective(key, endpoint, content) {
    const hasBlockManager = REQUIRED_PATTERNS.blockManagerPerspective.pattern.test(content);

    if (hasBlockManager) {
      this.successes.push(`✅ ${endpoint.description}: Block manager perspective found`);
    } else {
      this.errors.push(`❌ ${endpoint.description}: Missing block manager perspective`);
    }

    // Check for first-person language
    const hasFirstPerson = REQUIRED_PATTERNS.firstPersonLanguage.pattern.test(content);

    if (hasFirstPerson) {
      this.successes.push(`✅ ${endpoint.description}: First-person ownership language found`);
    } else {
      this.warnings.push(`⚠️ ${endpoint.description}: Consider adding more first-person ownership language`);
    }
  }

  /**
   * Check system prompts consistency
   */
  checkSystemPrompts(key, endpoint, content) {
    // Check for SYSTEM_PROMPTS object
    const hasSystemPrompts = /SYSTEM_PROMPTS\\s*=\\s*{/.test(content);

    if (hasSystemPrompts) {
      this.successes.push(`✅ ${endpoint.description}: System prompts structure found`);

      // Check for required prompt types
      const requiredPrompts = ['general', 'email_reply'];

      requiredPrompts.forEach(promptType => {
        const promptPattern = new RegExp(`${promptType}:\\s*\`.*?professional block manager`, 'i');

        if (promptPattern.test(content)) {
          this.successes.push(`✅ ${endpoint.description}: ${promptType} prompt has block manager perspective`);
        } else {
          this.errors.push(`❌ ${endpoint.description}: ${promptType} prompt missing block manager perspective`);
        }
      });
    } else {
      this.warnings.push(`⚠️ ${endpoint.description}: No SYSTEM_PROMPTS structure found`);
    }
  }

  /**
   * Check response patterns
   */
  checkResponsePatterns(key, endpoint, content) {
    // Check for proper email reply format
    const hasProperReplyFormat = REQUIRED_PATTERNS.emailReplyFormat.pattern.test(content);

    if (hasProperReplyFormat) {
      this.successes.push(`✅ ${endpoint.description}: Proper email reply format found`);
    } else {
      this.warnings.push(`⚠️ ${endpoint.description}: Consider updating email reply format`);
    }

    // Check for professional closing
    const hasProfessionalClosing = REQUIRED_PATTERNS.professionalClosing.pattern.test(content);

    if (hasProfessionalClosing) {
      this.successes.push(`✅ ${endpoint.description}: Professional closing format found`);
    } else {
      this.warnings.push(`⚠️ ${endpoint.description}: Consider adding professional closing format`);
    }
  }

  /**
   * Generate synchronization report
   */
  generateReport() {
    console.log('\\n' + '=' .repeat(50));
    console.log('📊 AI SYNCHRONIZATION REPORT');
    console.log('=' .repeat(50));

    console.log(`\\n✅ SUCCESSES (${this.successes.length}):`);
    this.successes.forEach(success => console.log(`  ${success}`));

    console.log(`\\n⚠️ WARNINGS (${this.warnings.length}):`);
    this.warnings.forEach(warning => console.log(`  ${warning}`));

    console.log(`\\n❌ ERRORS (${this.errors.length}):`);
    this.errors.forEach(error => console.log(`  ${error}`));

    if (this.errors.length > 0) {
      console.log('\\n🚨 SYNCHRONIZATION FAILED');
      console.log('All errors must be resolved before deployment.');
    } else if (this.warnings.length > 0) {
      console.log('\\n⚠️ SYNCHRONIZATION WARNINGS');
      console.log('Consider addressing warnings for optimal consistency.');
    } else {
      console.log('\\n🎉 SYNCHRONIZATION SUCCESS');
      console.log('All endpoints are properly synchronized.');
    }

    // Generate detailed report file
    this.generateDetailedReport();
  }

  /**
   * Generate detailed report file
   */
  generateDetailedReport() {
    const reportPath = path.join(this.projectRoot, 'ai-sync-report.md');

    const report = `# AI Synchronization Report
Generated: ${new Date().toISOString()}

## Summary
- ✅ Successes: ${this.successes.length}
- ⚠️ Warnings: ${this.warnings.length}
- ❌ Errors: ${this.errors.length}

## Detailed Results

### ✅ Successes
${this.successes.map(s => `- ${s}`).join('\\n')}

### ⚠️ Warnings
${this.warnings.map(w => `- ${w}`).join('\\n')}

### ❌ Errors
${this.errors.map(e => `- ${e}`).join('\\n')}

## Recommendations

${this.errors.length > 0 ? `
### Critical Actions Required
${this.errors.map(e => `- ${e.replace('❌ ', '')}`).join('\\n')}
` : ''}

${this.warnings.length > 0 ? `
### Suggested Improvements
${this.warnings.map(w => `- ${w.replace('⚠️ ', '')}`).join('\\n')}
` : ''}

## Next Steps
1. Resolve all errors before deployment
2. Address warnings for optimal consistency
3. Run this script again to verify fixes
4. Update AI_SYNCHRONIZATION_RULES.md with any new patterns

---
Generated by AI Sync Enforcement Script
`;

    fs.writeFileSync(reportPath, report);
    console.log(`\\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// CLI execution
if (require.main === module) {
  const enforcer = new AISyncEnforcer();
  enforcer.enforce().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { AISyncEnforcer, AI_ENDPOINTS, REQUIRED_PATTERNS };