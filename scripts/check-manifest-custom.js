#!/usr/bin/env node

/**
 * Custom Outlook Add-in Manifest Validation
 * 
 * Performs hard checks that the standard validator won't catch:
 * - HTTPS requirements for all URLs
 * - Pinned task pane wiring
 * - Command handler existence
 * - Requirement set validation
 * - Icon file existence
 * - Host configuration
 * - Duplicate ID detection
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MANIFEST_PATH = process.argv[2] || 'manifest.xml';
const ICONS_DIR = 'public/icons';
const COMMANDS_FILE = 'src/addin/commands.ts';

// Expected command handlers
const REQUIRED_HANDLERS = [
  'showChatPane',
  'showChatPaneCompose', 
  'onGenerateReplyFromRead',
  'onGenerateIntoCompose'
];

/**
 * Parse XML content and extract key elements
 */
function parseManifest(xmlContent) {
  const manifest = {
    urls: [],
    taskPanes: [],
    controls: [],
    requirements: [],
    resources: [],
    hosts: [],
    icons: [],
    ids: []
  };

  // Extract URLs (SourceLocation, FunctionFile, IconUrl)
  const urlMatches = xmlContent.match(/<(?:SourceLocation|FunctionFile|IconUrl|HighResolutionIconUrl)\s+[^>]*DefaultValue="([^"]+)"/g);
  if (urlMatches) {
    manifest.urls = urlMatches.map(match => {
      const url = match.match(/DefaultValue="([^"]+)"/)[1];
      return { url, type: match.includes('SourceLocation') ? 'SourceLocation' : 
                        match.includes('FunctionFile') ? 'FunctionFile' : 'IconUrl' };
    });
  }

  // Extract TaskPanes
  const taskPaneMatches = xmlContent.match(/<TaskPane[^>]*id="([^"]+)"[^>]*>[\s\S]*?<\/TaskPane>/g);
  if (taskPaneMatches) {
    manifest.taskPanes = taskPaneMatches.map(match => {
      const id = match.match(/id="([^"]+)"/)[1];
      const supportsPinning = match.includes('<SupportsPinning>true</SupportsPinning>');
      const sourceLocation = match.match(/<SourceLocation\s+[^>]*resid="([^"]+)"/);
      return {
        id,
        supportsPinning,
        sourceLocation: sourceLocation ? sourceLocation[1] : null
      };
    });
  }

  // Extract Controls
  const controlMatches = xmlContent.match(/<Control[^>]*>[\s\S]*?<\/Control>/g);
  if (controlMatches) {
    manifest.controls = controlMatches.map(match => {
      const onAction = match.match(/onAction="([^"]+)"/);
      const taskPaneId = match.match(/<TaskPaneId>([^<]+)<\/TaskPaneId>/);
      return {
        onAction: onAction ? onAction[1] : null,
        taskPaneId: taskPaneId ? taskPaneId[1] : null
      };
    });
  }

  // Extract Requirements
  const reqMatches = xmlContent.match(/<Set\s+Name="([^"]+)"\s+MinVersion="([^"]+)"/g);
  if (reqMatches) {
    manifest.requirements = reqMatches.map(match => {
      const name = match.match(/Name="([^"]+)"/)[1];
      const version = match.match(/MinVersion="([^"]+)"/)[1];
      return { name, version };
    });
  }

  // Extract Resources
  const resourceMatches = xmlContent.match(/<bt:Url\s+id="([^"]+)"\s+DefaultValue="([^"]+)"/g);
  if (resourceMatches) {
    manifest.resources = resourceMatches.map(match => {
      const id = match.match(/id="([^"]+)"/)[1];
      const url = match.match(/DefaultValue="([^"]+)"/)[1];
      return { id, url };
    });
  }

  // Extract Hosts
  const hostMatches = xmlContent.match(/<Host\s+Name="([^"]+)"/g);
  if (hostMatches) {
    manifest.hosts = hostMatches.map(match => match.match(/Name="([^"]+)"/)[1]);
  }

  // Extract Icons
  const iconMatches = xmlContent.match(/<bt:Image\s+id="([^"]+)"\s+DefaultValue="([^"]+)"/g);
  if (iconMatches) {
    manifest.icons = iconMatches.map(match => {
      const id = match.match(/id="([^"]+)"/)[1];
      const url = match.match(/DefaultValue="([^"]+)"/)[1];
      // Extract filename from URL for local file checking
      const filename = url.split('/').pop();
      return { id, url, filename };
    });
  }

  // Extract all IDs
  const idMatches = xmlContent.match(/id="([^"]+)"/g);
  if (idMatches) {
    manifest.ids = idMatches.map(match => match.match(/id="([^"]+)"/)[1]);
  }

  return manifest;
}

/**
 * Check if all URLs are HTTPS (allow HTTP for dev manifests)
 */
function validateHttpsUrls(manifest) {
  const errors = [];
  const isDevManifest = MANIFEST_PATH.includes('dev');
  
  manifest.urls.forEach(({ url, type }) => {
    if (url.startsWith('http://') && !isDevManifest) {
      errors.push(`${type} URL must be HTTPS: ${url}`);
    } else if (!url.startsWith('https://') && !url.startsWith('http://') && !url.startsWith('/')) {
      errors.push(`${type} URL must be HTTPS: ${url}`);
    }
  });

  return errors;
}

/**
 * Validate pinned task pane wiring
 */
function validatePinnedTaskPane(manifest) {
  const errors = [];
  
  // Find pinned task panes
  const pinnedPanes = manifest.taskPanes.filter(pane => pane.supportsPinning);
  
  if (pinnedPanes.length === 0) {
    errors.push('No pinned task panes found. Chat pane should support pinning.');
    return errors;
  }

  // Check that controls reference the same TaskPane ID
  const taskPaneIds = new Set();
  manifest.controls.forEach(control => {
    if (control.taskPaneId) {
      taskPaneIds.add(control.taskPaneId);
    }
  });

  if (taskPaneIds.size > 1) {
    errors.push('Multiple TaskPane IDs referenced by controls. All chat controls must reference the same TaskPane ID.');
  }

  // Check that pinned pane ID is referenced by controls
  if (pinnedPanes.length > 0) {
    const pinnedIds = pinnedPanes.map(pane => pane.id);
    const referencedIds = Array.from(taskPaneIds);
    
    const hasMatchingPinnedPane = pinnedIds.some(id => referencedIds.includes(id));
    
    if (!hasMatchingPinnedPane) {
      errors.push('Pinned task pane ID must be referenced by chat controls.');
    }
  }

  return errors;
}

/**
 * Validate command handlers exist in source code
 */
function validateCommandHandlers(manifest) {
  const errors = [];
  
  if (!fs.existsSync(COMMANDS_FILE)) {
    errors.push(`Commands file not found: ${COMMANDS_FILE}`);
    return errors;
  }

  const commandsContent = fs.readFileSync(COMMANDS_FILE, 'utf8');
  
  manifest.controls.forEach(control => {
    if (control.onAction && !REQUIRED_HANDLERS.includes(control.onAction)) {
      // Check if handler exists in source
      const handlerPattern = new RegExp(`(export\\s+)?(function|const|let|var)\\s+${control.onAction}\\s*[=(]`);
      if (!handlerPattern.test(commandsContent)) {
        errors.push(`Handler '${control.onAction}' declared in manifest but not found in ${COMMANDS_FILE}`);
      }
    }
  });

  return errors;
}

/**
 * Validate requirement sets
 */
function validateRequirementSets(manifest) {
  const errors = [];
  
  const mailboxReqs = manifest.requirements.filter(req => req.name === 'Mailbox');
  
  if (mailboxReqs.length === 0) {
    errors.push('Mailbox requirement set is required.');
    return errors;
  }

  // Check minimum version for commands (1.10)
  const hasCommandVersion = mailboxReqs.some(req => {
    const version = parseVersion(req.version);
    return version >= parseVersion('1.10');
  });

  if (!hasCommandVersion) {
    errors.push('Mailbox requirement must be ≥ 1.10 for command buttons.');
  }

  // Check pinning support (1.8)
  const hasPinningVersion = mailboxReqs.some(req => {
    const version = parseVersion(req.version);
    return version >= parseVersion('1.8');
  });

  if (!hasPinningVersion) {
    errors.push('Mailbox requirement must be ≥ 1.8 for pinning support.');
  }

  return errors;
}

/**
 * Parse version string to comparable number
 */
function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return parts[0] * 100 + parts[1];
}

/**
 * Validate icon files exist
 */
function validateIcons(manifest) {
  const errors = [];
  
  manifest.icons.forEach(({ id, url, filename }) => {
    // Only check local files, not remote URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // For remote URLs, just check that the filename exists locally
      const iconPath = path.join(ICONS_DIR, filename);
      if (!fs.existsSync(iconPath)) {
        errors.push(`Icon file not found: ${iconPath} (referenced by ${id})`);
      }
    } else {
      // For local paths, check the full path
      const iconPath = path.join(ICONS_DIR, url);
      if (!fs.existsSync(iconPath)) {
        errors.push(`Icon file not found: ${iconPath} (referenced by ${id})`);
      }
    }
  });

  return errors;
}

/**
 * Validate host configuration
 */
function validateHosts(manifest) {
  const errors = [];
  
  if (!manifest.hosts.includes('Mailbox')) {
    errors.push('Outlook host (Mailbox) must be present.');
  }

  const unsupportedHosts = manifest.hosts.filter(host => !['Mailbox'].includes(host));
  if (unsupportedHosts.length > 0) {
    errors.push(`Unsupported hosts found: ${unsupportedHosts.join(', ')}`);
  }

  return errors;
}

/**
 * Check for duplicate IDs (excluding resource IDs which can be reused)
 */
function validateUniqueIds(manifest) {
  const errors = [];
  const idCounts = {};
  
  // Filter out resource IDs that are allowed to be reused
  const resourceIds = new Set(['icon16', 'icon32', 'icon80', 'replyIcon16', 'replyIcon32', 'replyIcon80', 
                              'groupLabel', 'chatButtonLabel', 'chatSuperTipTitle', 'chatSuperTipDescription',
                              'replyButtonLabel', 'replySuperTipTitle', 'replySuperTipDescription',
                              'taskpaneUrl', 'functionFileUrl', 'TabDefault']);
  
  manifest.ids.forEach(id => {
    if (!resourceIds.has(id)) {
      idCounts[id] = (idCounts[id] || 0) + 1;
    }
  });

  Object.entries(idCounts).forEach(([id, count]) => {
    if (count > 1) {
      errors.push(`Duplicate ID found: ${id} (used ${count} times)`);
    }
  });

  return errors;
}

/**
 * Validate FunctionFile resource exists
 */
function validateFunctionFile(manifest) {
  const errors = [];
  
  const functionFileUrls = manifest.urls.filter(url => url.type === 'FunctionFile');
  
  functionFileUrls.forEach(({ url }) => {
    // Check if URL is in resources
    const resource = manifest.resources.find(res => res.url === url);
    if (!resource) {
      errors.push(`FunctionFile URL not found in Resources: ${url}`);
    }
  });

  return errors;
}

/**
 * Main validation function
 */
function validateManifest() {
  console.log('🔍 Validating Outlook Add-in manifest...\n');
  
  const manifestPath = MANIFEST_PATH;
  
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Manifest file not found: ${manifestPath}`);
    process.exit(1);
  }

  console.log(`📄 Reading manifest: ${manifestPath}`);
  const xmlContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = parseManifest(xmlContent);

  const allErrors = [
    ...validateHttpsUrls(manifest),
    ...validatePinnedTaskPane(manifest),
    ...validateCommandHandlers(manifest),
    ...validateRequirementSets(manifest),
    ...validateIcons(manifest),
    ...validateHosts(manifest),
    ...validateUniqueIds(manifest),
    ...validateFunctionFile(manifest)
  ];

  if (allErrors.length > 0) {
    console.error('❌ Manifest validation failed:\n');
    allErrors.forEach(error => console.error(`  • ${error}`));
    console.error('\n💡 Fix these issues and run the validation again.');
    process.exit(1);
  }

  console.log('✅ Manifest validation passed!');
  console.log(`📊 Validated ${manifest.urls.length} URLs, ${manifest.taskPanes.length} task panes, ${manifest.controls.length} controls`);
}

// Run validation
if (require.main === module) {
  validateManifest();
}

module.exports = { validateManifest };
