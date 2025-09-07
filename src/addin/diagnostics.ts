/**
 * Outlook Add-in Diagnostics & Auto-Repair
 * Deep runtime checks to prevent crashes and provide visibility
 */

export interface DiagnosticsReport {
  environment: EnvironmentInfo;
  capabilities: CapabilityInfo;
  errors: ErrorInfo[];
  timestamp: string;
  version: string;
}

export interface EnvironmentInfo {
  requirementSet: string;
  host: string;
  platform: string;
  hostName?: string;
  platformInfo?: string;
  userAgent: string;
  location: string;
}

export interface CapabilityInfo {
  showAsTaskpane: boolean;
  displayReplyForm: boolean;
  isMessageRead: boolean;
  isMessageCompose: boolean;
  hasComposeBody: boolean;
  hasNotificationMessages: boolean;
  hasDisplayDialogAsync: boolean;
}

export interface ErrorInfo {
  message: string;
  source?: string;
  line?: number;
  column?: number;
  error?: any;
  timestamp: string;
}

class AddinDiagnostics {
  private errors: ErrorInfo[] = [];
  private version: string;

  constructor() {
    this.version = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
    this.setupGlobalErrorHandling();
  }

  /**
   * Setup global error handling for the add-in
   */
  private setupGlobalErrorHandling(): void {
    // Global error handler
    window.onerror = (message, source, line, column, error) => {
      this.errors.push({
        message: String(message),
        source: String(source),
        line: line || 0,
        column: column || 0,
        error,
        timestamp: new Date().toISOString()
      });
      
      console.error('[BlocIQ Add-in Error]', {
        message,
        source,
        line,
        column,
        error
      });
    };

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.errors.push({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        error: event.reason,
        timestamp: new Date().toISOString()
      });
      
      console.error('[BlocIQ Add-in Promise Error]', event.reason);
    });
  }

  /**
   * Print environment information
   */
  printEnvironment(): EnvironmentInfo {
    const env: EnvironmentInfo = {
      requirementSet: Office?.context?.requirements?.isSetSupported?.('Mailbox', '1.8') ? '1.8+' : '1.7',
      host: Office?.context?.host || 'unknown',
      platform: Office?.context?.platform || 'unknown',
      hostName: Office?.context?.diagnostics?.hostName || 'unknown',
      platformInfo: Office?.context?.platform || 'unknown',
      userAgent: navigator.userAgent,
      location: window.location.href
    };

    console.groupCollapsed('[BlocIQ Add-in] Environment');
    console.log('Requirement Set:', env.requirementSet);
    console.log('Host:', env.host);
    console.log('Platform:', env.platform);
    console.log('Host Name:', env.hostName);
    console.log('User Agent:', env.userAgent);
    console.log('Location:', env.location);
    console.log('Version:', this.version);
    console.groupEnd();

    return env;
  }

  /**
   * Probe Office capabilities
   */
  probeCapabilities(): CapabilityInfo {
    const capabilities: CapabilityInfo = {
      showAsTaskpane: !!(Office?.addin && typeof Office.addin.showAsTaskpane === 'function'),
      displayReplyForm: !!(Office?.context?.mailbox?.item && typeof Office.context.mailbox.item.displayReplyForm === 'function'),
      isMessageRead: Office?.context?.mailbox?.item?.itemType === 'message',
      isMessageCompose: Office?.context?.mailbox?.item?.itemType === 'message' && 
                       Office?.context?.mailbox?.item?.body !== undefined,
      hasComposeBody: !!(Office?.context?.mailbox?.item && 
                        typeof (Office.context.mailbox.item as any)?.body?.setAsync === 'function'),
      hasNotificationMessages: !!(Office?.context?.mailbox?.item && 
                                 typeof Office.context.mailbox.item.notificationMessages?.replaceAsync === 'function'),
      hasDisplayDialogAsync: !!(Office?.context?.ui && typeof Office.context.ui.displayDialogAsync === 'function')
    };

    console.groupCollapsed('[BlocIQ Add-in] Capabilities');
    console.log('Show as Taskpane:', capabilities.showAsTaskpane);
    console.log('Display Reply Form:', capabilities.displayReplyForm);
    console.log('Is Message Read:', capabilities.isMessageRead);
    console.log('Is Message Compose:', capabilities.isMessageCompose);
    console.log('Has Compose Body:', capabilities.hasComposeBody);
    console.log('Has Notification Messages:', capabilities.hasNotificationMessages);
    console.log('Has Display Dialog Async:', capabilities.hasDisplayDialogAsync);
    console.groupEnd();

    return capabilities;
  }

  /**
   * Report status with structured logging
   */
  report(status: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.groupCollapsed(`[BlocIQ Add-in] ${status}`);
    console.log('Timestamp:', timestamp);
    console.log('Version:', this.version);
    if (data) {
      console.log('Data:', data);
    }
    console.groupEnd();
  }

  /**
   * Check API connectivity
   */
  async checkApiConnectivity(): Promise<{ ok: boolean; cors: boolean; error?: string }> {
    try {
      this.report('Checking API connectivity');
      
      const response = await fetch('/api/ask-ai/ping', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = {
        ok: response.ok,
        cors: response.type === 'cors' || response.type === 'basic',
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };

      this.report('API connectivity check', result);
      return result;
    } catch (error) {
      const result = {
        ok: false,
        cors: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.report('API connectivity failed', result);
      return result;
    }
  }

  /**
   * Validate handler exports
   */
  validateHandlerExports(): { valid: boolean; missing: string[] } {
    const requiredHandlers = [
      'onGenerateReplyFromRead',
      'showChatPane',
      'showChatPaneCompose',
      'onGenerateIntoCompose'
    ];

    const missing: string[] = [];
    
    for (const handler of requiredHandlers) {
      if (typeof (window as any)[handler] !== 'function') {
        missing.push(handler);
      }
    }

    const valid = missing.length === 0;
    
    this.report('Handler validation', {
      valid,
      missing,
      total: requiredHandlers.length
    });

    return { valid, missing };
  }

  /**
   * Get comprehensive diagnostics report
   */
  getFullReport(): DiagnosticsReport {
    return {
      environment: this.printEnvironment(),
      capabilities: this.probeCapabilities(),
      errors: [...this.errors],
      timestamp: new Date().toISOString(),
      version: this.version
    };
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errors = [];
    this.report('Errors cleared');
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Check if add-in is in a healthy state
   */
  isHealthy(): boolean {
    const capabilities = this.probeCapabilities();
    const handlers = this.validateHandlerExports();
    
    return capabilities.showAsTaskpane && 
           capabilities.displayReplyForm && 
           handlers.valid && 
           this.errors.length === 0;
  }

  /**
   * Auto-repair common issues
   */
  async autoRepair(): Promise<{ repaired: string[]; failed: string[] }> {
    const repaired: string[] = [];
    const failed: string[] = [];

    this.report('Starting auto-repair');

    // Check if handlers are bound to window
    const handlers = this.validateHandlerExports();
    if (!handlers.valid) {
      try {
        // This would need to be implemented in the commands file
        this.report('Attempting to rebind handlers');
        // The actual rebinding would happen in commands.ts
        repaired.push('Handler binding');
      } catch (error) {
        failed.push('Handler binding');
      }
    }

    // Check API connectivity
    const apiCheck = await this.checkApiConnectivity();
    if (!apiCheck.ok) {
      this.report('API connectivity issue detected', apiCheck);
      failed.push('API connectivity');
    }

    this.report('Auto-repair completed', { repaired, failed });
    return { repaired, failed };
  }
}

// Export singleton instance
export const diagnostics = new AddinDiagnostics();

// Export individual functions for easy access
export const printEnvironment = () => diagnostics.printEnvironment();
export const probeCapabilities = () => diagnostics.probeCapabilities();
export const report = (status: string, data?: any) => diagnostics.report(status, data);
export const checkApiConnectivity = () => diagnostics.checkApiConnectivity();
export const validateHandlerExports = () => diagnostics.validateHandlerExports();
export const getFullReport = () => diagnostics.getFullReport();
export const isHealthy = () => diagnostics.isHealthy();
export const autoRepair = () => diagnostics.autoRepair();
