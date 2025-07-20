export interface ComplianceAssetReminder {
  building_id: string;
  building_name: string;
  asset_id: string;
  asset_name: string;
  asset_category: string | null;
  next_due_date: string;
  status: 'Overdue' | 'Due Soon';
  days_until_due: number;
  last_updated: string;
}

export interface ComplianceDocumentReminder {
  building_id: string;
  building_name: string;
  doc_id: string;
  doc_type: string | null;
  expiry_date: string;
  status: 'Expired' | 'Expiring Soon';
  days_until_expiry: number;
  start_date: string | null;
}

export interface ReminderSummary {
  total_overdue_assets: number;
  total_due_soon_assets: number;
  total_expired_documents: number;
  total_expiring_documents: number;
  total_buildings_affected: number;
  critical_items: number;
  filters_applied?: {
    dueSoonDays: number;
    expiringSoonDays: number;
    buildingIds: string[] | 'all';
    categories: string[] | 'all';
  };
}

export interface ReminderResponse {
  overdue_assets: ComplianceAssetReminder[];
  due_soon_assets: ComplianceAssetReminder[];
  expired_documents: ComplianceDocumentReminder[];
  expiring_documents: ComplianceDocumentReminder[];
  summary: ReminderSummary;
  generated_at: string;
}

/**
 * Calculate days between two dates
 */
export function calculateDaysBetween(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get priority level for a reminder item
 */
export function getReminderPriority(
  status: 'Overdue' | 'Due Soon' | 'Expired' | 'Expiring Soon',
  daysUntil: number
): 'Critical' | 'High' | 'Medium' | 'Low' {
  if (status === 'Overdue' || status === 'Expired') {
    return 'Critical';
  }
  
  if (daysUntil <= 7) {
    return 'High';
  }
  
  if (daysUntil <= 14) {
    return 'Medium';
  }
  
  return 'Low';
}

/**
 * Format reminder message for display
 */
export function formatReminderMessage(
  type: 'asset' | 'document',
  name: string,
  status: string,
  daysUntil: number,
  buildingName: string
): string {
  const itemType = type === 'asset' ? 'compliance item' : 'document';
  
  if (status === 'Overdue' || status === 'Expired') {
    return `${name} (${buildingName}) is ${status.toLowerCase()}. Immediate action required.`;
  }
  
  const timeFrame = daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
  return `${name} (${buildingName}) is due ${timeFrame}.`;
}

/**
 * Group reminders by building
 */
export function groupRemindersByBuilding(response: ReminderResponse) {
  const buildingGroups: Record<string, {
    building_name: string;
    overdue_assets: ComplianceAssetReminder[];
    due_soon_assets: ComplianceAssetReminder[];
    expired_documents: ComplianceDocumentReminder[];
    expiring_documents: ComplianceDocumentReminder[];
    total_critical: number;
  }> = {};

  // Process assets
  response.overdue_assets.forEach(asset => {
    if (!buildingGroups[asset.building_id]) {
      buildingGroups[asset.building_id] = {
        building_name: asset.building_name,
        overdue_assets: [],
        due_soon_assets: [],
        expired_documents: [],
        expiring_documents: [],
        total_critical: 0
      };
    }
    buildingGroups[asset.building_id].overdue_assets.push(asset);
    buildingGroups[asset.building_id].total_critical++;
  });

  response.due_soon_assets.forEach(asset => {
    if (!buildingGroups[asset.building_id]) {
      buildingGroups[asset.building_id] = {
        building_name: asset.building_name,
        overdue_assets: [],
        due_soon_assets: [],
        expired_documents: [],
        expiring_documents: [],
        total_critical: 0
      };
    }
    buildingGroups[asset.building_id].due_soon_assets.push(asset);
  });

  // Process documents
  response.expired_documents.forEach(doc => {
    if (!buildingGroups[doc.building_id]) {
      buildingGroups[doc.building_id] = {
        building_name: doc.building_name,
        overdue_assets: [],
        due_soon_assets: [],
        expired_documents: [],
        expiring_documents: [],
        total_critical: 0
      };
    }
    buildingGroups[doc.building_id].expired_documents.push(doc);
    buildingGroups[doc.building_id].total_critical++;
  });

  response.expiring_documents.forEach(doc => {
    if (!buildingGroups[doc.building_id]) {
      buildingGroups[doc.building_id] = {
        building_name: doc.building_name,
        overdue_assets: [],
        due_soon_assets: [],
        expired_documents: [],
        expiring_documents: [],
        total_critical: 0
      };
    }
    buildingGroups[doc.building_id].expiring_documents.push(doc);
  });

  return buildingGroups;
}

/**
 * Get category breakdown of reminders
 */
export function getCategoryBreakdown(response: ReminderResponse) {
  const categories: Record<string, {
    overdue_count: number;
    due_soon_count: number;
    total_count: number;
  }> = {};

  // Process assets by category
  response.overdue_assets.forEach(asset => {
    const category = asset.asset_category || 'Uncategorized';
    if (!categories[category]) {
      categories[category] = { overdue_count: 0, due_soon_count: 0, total_count: 0 };
    }
    categories[category].overdue_count++;
    categories[category].total_count++;
  });

  response.due_soon_assets.forEach(asset => {
    const category = asset.asset_category || 'Uncategorized';
    if (!categories[category]) {
      categories[category] = { overdue_count: 0, due_soon_count: 0, total_count: 0 };
    }
    categories[category].due_soon_count++;
    categories[category].total_count++;
  });

  return categories;
}

/**
 * Check if there are any critical reminders
 */
export function hasCriticalReminders(response: ReminderResponse): boolean {
  return response.summary.critical_items > 0;
}

/**
 * Get urgent reminders (due within 7 days or overdue)
 */
export function getUrgentReminders(response: ReminderResponse) {
  const urgentAssets = [
    ...response.overdue_assets,
    ...response.due_soon_assets.filter(asset => asset.days_until_due <= 7)
  ];

  const urgentDocuments = [
    ...response.expired_documents,
    ...response.expiring_documents.filter(doc => doc.days_until_expiry <= 7)
  ];

  return {
    urgent_assets: urgentAssets,
    urgent_documents: urgentDocuments,
    total_urgent: urgentAssets.length + urgentDocuments.length
  };
}

/**
 * Generate email subject line for reminders
 */
export function generateReminderEmailSubject(response: ReminderResponse): string {
  const criticalCount = response.summary.critical_items;
  const totalCount = response.summary.total_overdue_assets + 
                    response.summary.total_due_soon_assets + 
                    response.summary.total_expired_documents + 
                    response.summary.total_expiring_documents;

  if (criticalCount > 0) {
    return `🚨 URGENT: ${criticalCount} Critical Compliance Items Require Immediate Attention`;
  }

  if (totalCount > 0) {
    return `⚠️ Compliance Reminder: ${totalCount} Items Due Soon`;
  }

  return '✅ All Compliance Items Up to Date';
}

/**
 * Generate email body for reminders
 */
export function generateReminderEmailBody(response: ReminderResponse): string {
  const buildingGroups = groupRemindersByBuilding(response);
  const urgentReminders = getUrgentReminders(response);

  let body = `Compliance Reminder Report\n`;
  body += `Generated: ${new Date(response.generated_at).toLocaleDateString()}\n\n`;

  // Summary
  body += `📊 Summary:\n`;
  body += `• Critical Items (Overdue/Expired): ${response.summary.critical_items}\n`;
  body += `• Due Soon: ${response.summary.total_due_soon_assets + response.summary.total_expiring_documents}\n`;
  body += `• Buildings Affected: ${response.summary.total_buildings_affected}\n\n`;

  // Critical items first
  if (urgentReminders.total_urgent > 0) {
    body += `🚨 URGENT ITEMS:\n`;
    
    urgentReminders.urgent_assets.forEach(asset => {
      body += `• ${asset.asset_name} (${asset.building_name}) - ${asset.status}\n`;
    });
    
    urgentReminders.urgent_documents.forEach(doc => {
      body += `• ${doc.doc_type || 'Document'} (${doc.building_name}) - ${doc.status}\n`;
    });
    
    body += `\n`;
  }

  // Building breakdown
  body += `🏢 Building Breakdown:\n`;
  Object.entries(buildingGroups).forEach(([buildingId, building]) => {
    const totalItems = building.overdue_assets.length + 
                      building.due_soon_assets.length + 
                      building.expired_documents.length + 
                      building.expiring_documents.length;
    
    if (totalItems > 0) {
      body += `\n${building.building_name}:\n`;
      if (building.total_critical > 0) {
        body += `  🚨 ${building.total_critical} critical items\n`;
      }
      body += `  📋 ${totalItems} total items requiring attention\n`;
    }
  });

  body += `\n\nPlease log into BlocIQ to review and update these compliance items.`;

  return body;
} 