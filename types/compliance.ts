export interface BuildingComplianceAsset {
  id: string;
  building_id: string;
  asset_id: string;
  status: 'pending' | 'compliant' | 'overdue' | 'due_soon' | 'missing';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  last_completed: string | null;
  next_due: string | null;
  assigned_to: string | null;
  notes: string | null;
  documents: ComplianceDocument[];
  created_at: string;
  updated_at: string;
}

export interface ComplianceDocument {
  id: string;
  asset_id: string;
  building_id: string;
  title: string;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  notes: string | null;
}

export interface ComplianceStatus {
  total_assets: number;
  compliant: number;
  due_soon: number;
  overdue: number;
  missing: number;
  compliance_percentage: number;
}

export interface ComplianceCategory {
  name: string;
  assets: BuildingComplianceAsset[];
  status: ComplianceStatus;
}

export interface BuildingComplianceOverview {
  building_id: string;
  building_name: string;
  total_assets: number;
  compliant: number;
  due_soon: number;
  overdue: number;
  missing: number;
  compliance_percentage: number;
  last_updated: string;
  categories: ComplianceCategory[];
}

export interface ComplianceSetupRequest {
  building_id: string;
  asset_ids: string[];
}

export interface ComplianceAssetUpdate {
  status?: 'pending' | 'compliant' | 'overdue' | 'due_soon' | 'missing';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string | null;
  last_completed?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
}

export interface ComplianceFilter {
  status?: string[];
  priority?: string[];
  category?: string[];
  assigned_to?: string[];
  due_date_range?: {
    start: string;
    end: string;
  };
}

export interface ComplianceSearch {
  query: string;
  filters: ComplianceFilter;
}

export interface ComplianceExport {
  building_id: string;
  format: 'csv' | 'pdf' | 'excel';
  filters?: ComplianceFilter;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface ComplianceReminder {
  id: string;
  asset_id: string;
  building_id: string;
  type: 'due_soon' | 'overdue' | 'expiring';
  message: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
}

export interface ComplianceReport {
  id: string;
  building_id: string;
  report_type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  generated_at: string;
  generated_by: string;
  data: {
    overview: ComplianceStatus;
    categories: ComplianceCategory[];
    overdue_items: BuildingComplianceAsset[];
    due_soon_items: BuildingComplianceAsset[];
    recommendations: string[];
  };
  file_url?: string;
}

export interface ComplianceAudit {
  id: string;
  building_id: string;
  auditor: string;
  audit_date: string;
  audit_type: 'internal' | 'external' | 'regulatory';
  findings: {
    compliant_items: string[];
    non_compliant_items: string[];
    recommendations: string[];
    risk_level: 'low' | 'medium' | 'high' | 'critical';
  };
  status: 'draft' | 'final' | 'approved';
  created_at: string;
  updated_at: string;
}

export interface ComplianceSettings {
  building_id: string;
  reminder_days: {
    due_soon: number;
    overdue: number;
    expiring: number;
  };
  notification_emails: string[];
  auto_assign: boolean;
  default_priority: 'low' | 'medium' | 'high' | 'urgent';
  compliance_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface ComplianceHistory {
  id: string;
  asset_id: string;
  building_id: string;
  action: 'created' | 'updated' | 'completed' | 'overdue' | 'document_uploaded';
  old_value?: any;
  new_value?: any;
  changed_by: string;
  changed_at: string;
  notes?: string;
}

export interface ComplianceDashboard {
  portfolio_overview: {
    total_buildings: number;
    total_assets: number;
    overall_compliance: number;
    critical_overdue: number;
    due_this_month: number;
  };
  building_summaries: BuildingComplianceOverview[];
  recent_activities: ComplianceHistory[];
  upcoming_deadlines: BuildingComplianceAsset[];
  alerts: ComplianceReminder[];
}
