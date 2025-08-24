import { BuildingComplianceAsset, ComplianceStatus, ComplianceAsset } from '@/types/compliance';
import { MASTER_COMPLIANCE_ASSETS } from '@/lib/compliance/masterAssets';

export function calculateNextDueDate(lastCompleted: string, frequencyMonths: number): string {
  const lastCompletedDate = new Date(lastCompleted);
  const nextDue = new Date(lastCompletedDate);
  nextDue.setMonth(nextDue.getMonth() + frequencyMonths);
  return nextDue.toISOString().split('T')[0];
}

export function calculateComplianceStatus(asset: BuildingComplianceAsset): 'compliant' | 'due_soon' | 'overdue' | 'missing' {
  if (!asset.due_date) return 'missing';
  
  const today = new Date();
  const dueDate = new Date(asset.due_date);
  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 30) return 'due_soon';
  return 'compliant';
}

export function calculateCompliancePercentage(assets: BuildingComplianceAsset[]): number {
  if (assets.length === 0) return 0;
  
  const compliantAssets = assets.filter(asset => asset.status === 'compliant').length;
  return Math.round((compliantAssets / assets.length) * 100);
}

export function getComplianceStatus(assets: BuildingComplianceAsset[]): ComplianceStatus {
  const total = assets.length;
  const compliant = assets.filter(asset => asset.status === 'compliant').length;
  const dueSoon = assets.filter(asset => asset.status === 'due_soon').length;
  const overdue = assets.filter(asset => asset.status === 'overdue').length;
  const missing = assets.filter(asset => asset.status === 'missing').length;
  
  return {
    total_assets: total,
    compliant,
    due_soon: dueSoon,
    overdue,
    missing,
    compliance_percentage: total > 0 ? Math.round((compliant / total) * 100) : 0
  };
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'compliant': return 'text-green-600 bg-green-50 border-green-200';
    case 'due_soon': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
    case 'missing': return 'text-gray-600 bg-gray-50 border-gray-200';
    case 'pending': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'compliant': return '✅';
    case 'due_soon': return '⚠️';
    case 'overdue': return '❌';
    case 'missing': return '📄';
    case 'pending': return '⏳';
    default: return '❓';
  }
}

export function getPriorityIcon(priority: string): string {
  switch (priority) {
    case 'urgent': return '🚨';
    case 'high': return '🔴';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
  }
}

export function formatDueDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  
  const date = new Date(dateString);
  const today = new Date();
  const daysUntilDue = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue < 0) {
    return `${Math.abs(daysUntilDue)} days overdue`;
  } else if (daysUntilDue === 0) {
    return 'Due today';
  } else if (daysUntilDue === 1) {
    return 'Due tomorrow';
  } else if (daysUntilDue <= 7) {
    return `Due in ${daysUntilDue} days`;
  } else if (daysUntilDue <= 30) {
    const weeks = Math.ceil(daysUntilDue / 7);
    return `Due in ${weeks} week${weeks > 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  }
}

export function getDaysUntilDue(dateString: string | null): number {
  if (!dateString) return Infinity;
  
  const today = new Date();
  const dueDate = new Date(dateString);
  return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdue(dateString: string | null): boolean {
  if (!dateString) return false;
  return getDaysUntilDue(dateString) < 0;
}

export function isDueSoon(dateString: string | null, daysThreshold: number = 30): boolean {
  if (!dateString) return false;
  const daysUntilDue = getDaysUntilDue(dateString);
  return daysUntilDue >= 0 && daysUntilDue <= daysThreshold;
}

export function sortAssetsByPriority(assets: BuildingComplianceAsset[]): BuildingComplianceAsset[] {
  const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
  
  return [...assets].sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // If same priority, sort by due date (overdue first, then due soon, then compliant)
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (b.status === 'overdue' && a.status !== 'overdue') return 1;
    if (a.status === 'due_soon' && b.status !== 'due_soon') return -1;
    if (b.status === 'due_soon' && a.status !== 'due_soon') return 1;
    
    // If same status, sort by due date
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    
    return 0;
  });
}

export function filterAssetsByStatus(assets: BuildingComplianceAsset[], status: string[]): BuildingComplianceAsset[] {
  if (status.length === 0) return assets;
  return assets.filter(asset => status.includes(asset.status));
}

export function filterAssetsByPriority(assets: BuildingComplianceAsset[], priority: string[]): BuildingComplianceAsset[] {
  if (priority.length === 0) return assets;
  return assets.filter(asset => priority.includes(asset.priority));
}

export function filterAssetsByCategory(assets: BuildingComplianceAsset[], category: string[]): BuildingComplianceAsset[] {
  if (category.length === 0) return assets;
  return assets.filter(asset => {
    const masterAsset = MASTER_COMPLIANCE_ASSETS.find(ma => ma.id === asset.asset_id);
    return masterAsset && category.includes(masterAsset.category);
  });
}

export function searchAssets(assets: BuildingComplianceAsset[], query: string): BuildingComplianceAsset[] {
  if (!query.trim()) return assets;
  
  const searchTerm = query.toLowerCase();
  return assets.filter(asset => {
    const masterAsset = MASTER_COMPLIANCE_ASSETS.find(ma => ma.id === asset.asset_id);
    if (!masterAsset) return false;
    
    return (
      masterAsset.title.toLowerCase().includes(searchTerm) ||
      masterAsset.description.toLowerCase().includes(searchTerm) ||
      masterAsset.category.toLowerCase().includes(searchTerm) ||
      (asset.notes && asset.notes.toLowerCase().includes(searchTerm)) ||
      (asset.assigned_to && asset.assigned_to.toLowerCase().includes(searchTerm))
    );
  });
}

export function getAssetTitle(assetId: string): string {
  const masterAsset = MASTER_COMPLIANCE_ASSETS.find(asset => asset.id === assetId);
  return masterAsset ? masterAsset.title : 'Unknown Asset';
}

export function getAssetCategory(assetId: string): string {
  const masterAsset = MASTER_COMPLIANCE_ASSETS.find(asset => asset.id === assetId);
  return masterAsset ? masterAsset.category : 'Unknown Category';
}

export function getAssetDescription(assetId: string): string {
  const masterAsset = MASTER_COMPLIANCE_ASSETS.find(asset => asset.id === assetId);
  return masterAsset ? masterAsset.description : 'No description available';
}

export function getAssetFrequency(assetId: string): number {
  const masterAsset = MASTER_COMPLIANCE_ASSETS.find(asset => asset.id === assetId);
  return masterAsset ? masterAsset.frequency_months : 12;
}

export function getAssetPriority(assetId: string): string {
  const masterAsset = MASTER_COMPLIANCE_ASSETS.find(asset => asset.id === assetId);
  return masterAsset ? masterAsset.priority : 'medium';
}

export function getAssetLegalRequirement(assetId: string): boolean {
  const masterAsset = MASTER_COMPLIANCE_ASSETS.find(asset => asset.id === assetId);
  return masterAsset ? masterAsset.legal_requirement : false;
}

export function getAssetDefaultNotes(assetId: string): string {
  const masterAsset = MASTER_COMPLIANCE_ASSETS.find(asset => asset.id === assetId);
  return masterAsset ? (masterAsset.default_notes || '') : '';
}
