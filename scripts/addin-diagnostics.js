#!/usr/bin/env node

/**
 * Outlook Add-in Diagnostics
 * 
 * Prints requirement set, supportsPinning, and current form factor
 * Handy for debugging client quirks
 */

console.log('🔍 Outlook Add-in Diagnostics');
console.log('============================');

// Check if we're running in Outlook context
if (typeof Office !== 'undefined') {
  console.log('✅ Office.js loaded');
  console.log('📱 Host:', Office.context.host);
  console.log('📱 Platform:', Office.context.platform);
  
  // Check requirement sets
  if (Office.context.requirements) {
    console.log('📋 Requirement Sets:');
    Office.context.requirements.isSetSupported('Mailbox', '1.10') && console.log('  ✅ Mailbox 1.10 (commands)');
    Office.context.requirements.isSetSupported('Mailbox', '1.8') && console.log('  ✅ Mailbox 1.8 (pinning)');
  }
  
  // Check mailbox context
  if (Office.context.mailbox) {
    console.log('📧 Mailbox Context:');
    console.log('  - Item Type:', Office.context.mailbox.item?.itemType || 'Unknown');
    console.log('  - Item ID:', Office.context.mailbox.item?.itemId || 'None');
  }
  
  // Check task pane support
  if (Office.ribbon) {
    console.log('🎛️ Ribbon Support: ✅ Available');
  }
  
  if (Office.context.mailbox?.item?.displayReplyForm) {
    console.log('📝 Reply Form Support: ✅ Available');
  }
  
} else {
  console.log('❌ Office.js not loaded - running outside Outlook context');
  console.log('💡 This script is designed to run within the Outlook Add-in');
}

console.log('\n📋 Manifest Validation:');
console.log('Run: npm run addin:manifest:check');
