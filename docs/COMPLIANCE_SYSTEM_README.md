# 🏗️ BlocIQ Compliance System

A comprehensive compliance management system for property managers to track, monitor, and maintain regulatory compliance across their building portfolio.

## 🎯 **System Overview**

The BlocIQ Compliance System transforms reactive compliance management into proactive compliance assurance, providing property managers with:

- **Automated compliance monitoring** with real-time alerts
- **Centralized compliance dashboard** for all buildings
- **Proactive compliance management** with due date tracking
- **Integrated document management** for all compliance records
- **Regulatory compliance assurance** for UK property management

## 🏢 **Three-Tier Architecture**

### **1. Compliance Setup Page** (`/buildings/compliance/setup`)
**Purpose**: Configuration wizard for property managers to select which compliance assets to track for a specific building.

**What It Does**:
- Displays master asset list with 10 categories and 60+ compliance requirements
- Asset selection interface with checkboxes for each compliance item
- Bulk configuration options (Select All, Select None, Select Required Only)
- Default values setup with initial tracking configuration
- Transforms buildings from no compliance tracking to complete compliance management

**Categories Available**:
- **Fire Safety** (8 items): Fire Risk Assessment, Fire Alarm Tests, Emergency Lighting, etc.
- **Gas Safety** (4 items): Gas Safety Certificate, Appliance Service, Emergency Procedures, etc.
- **Electrical Safety** (6 items): EICR Certificate, PAT Testing, Electrical Maintenance, etc.
- **Structural & Condition** (4 items): Building Surveys, Structural Inspections, Roof/Drainage, etc.
- **Operational & Contracts** (4 items): Lift Inspection, Heating Systems, Water Testing, etc.
- **Insurance** (3 items): Building, Liability, D&O Insurance
- **Lease & Documentation** (3 items): Lease Compliance, Document Management, Regulatory Updates
- **Admin & Reporting** (3 items): Compliance Reporting, Audit Preparation, Training Records
- **Smart Records** (3 items): Digital Systems, Smart Building Tech, Data Protection
- **BSA Safety** (3 items): BSA Audits, Safety Policies, Incident Reporting

### **2. Compliance Tracking Page** (`/buildings/[id]/compliance`)
**Purpose**: Live dashboard that monitors the compliance status of all configured assets for a building in real-time.

**What It Does**:
- **Status Overview**: Shows compliance status across all assets (✅ Compliant, ⚠️ Due Soon, ❌ Overdue, 📄 Missing)
- **Real-time Monitoring**: Due date calculations, automatic status updates, priority indicators
- **Asset Management**: Edit due dates, assign responsibilities, add notes, upload documents
- **Category Organization**: Groups assets by type for easy navigation
- **Advanced Filtering**: Search, status filters, priority filters, category filters

**Key Features**:
- Compliance percentage visualization
- Priority-based sorting (Urgent → High → Medium → Low)
- Due date formatting with smart relative dates
- Inline editing for quick updates
- Mark as completed functionality with automatic next due date calculation

### **3. Portfolio Overview Page** (`/buildings/compliance`)
**Purpose**: Navigation-based compliance page showing portfolio-wide overview of all buildings' compliance within the user's profile.

**What It Does**:
- **Portfolio Statistics**: Total buildings, assets, overall compliance percentage, critical issues
- **Critical Alerts**: Real-time notifications for overdue compliance items
- **Building Summaries**: Individual building compliance status with progress bars
- **Multi-building Filtering**: Search, status filters, priority filters across all buildings
- **Sorting Options**: By compliance percentage, overdue items, building name, document count

## 🗄️ **Database Schema**

### **Core Tables**

#### **`building_compliance_assets`**
```sql
- id (UUID, Primary Key)
- building_id (UUID, Foreign Key to buildings)
- asset_id (String, Reference to master assets)
- status (Enum: 'pending' | 'compliant' | 'overdue' | 'due_soon' | 'missing')
- priority (Enum: 'low' | 'medium' | 'high' | 'urgent')
- due_date (Date, When compliance is due)
- last_completed (Date, Last completion date)
- next_due (Date, Next due date)
- assigned_to (String, Person responsible)
- notes (Text, Additional notes)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### **`compliance_documents`**
```sql
- id (UUID, Primary Key)
- asset_id (UUID, Foreign Key to building_compliance_assets)
- building_id (UUID, Foreign Key to buildings)
- title (String, Document title)
- document_type (String, Type of document)
- file_url (String, Storage URL)
- file_name (String, Original filename)
- file_size (Integer, File size in bytes)
- uploaded_by (UUID, User who uploaded)
- uploaded_at (Timestamp)
- notes (Text, Document notes)
```

#### **`compliance_history`**
```sql
- id (UUID, Primary Key)
- building_id (UUID, Foreign Key to buildings)
- asset_id (UUID, Foreign Key to building_compliance_assets, nullable)
- action (Enum: 'created' | 'updated' | 'completed' | 'overdue' | 'document_uploaded')
- changed_by (UUID, User who made the change)
- changed_at (Timestamp)
- old_value (JSON, Previous state)
- new_value (JSON, New state)
- notes (Text, Change description)
```

## 🔌 **API Endpoints**

### **Compliance Setup**
```typescript
POST /api/compliance/setup
Body: {
  building_id: string
  asset_ids: string[]
}
```

### **Asset Management**
```typescript
PUT /api/compliance/assets/[assetId]
Body: {
  building_id: string
  status?: string
  priority?: string
  due_date?: string
  assigned_to?: string
  notes?: string
}

DELETE /api/compliance/assets/[assetId]?building_id=[buildingId]
```

### **Asset Completion**
```typescript
POST /api/compliance/assets/[assetId]/complete
Body: {
  building_id: string
  completed_date: string
}
```

## 🎨 **UI Components**

### **Core Components**
- **`ComplianceSetupWizard`**: Asset selection interface with category expansion
- **`BuildingComplianceDashboard`**: Real-time monitoring dashboard with inline editing
- **`PortfolioComplianceOverview`**: Multi-building overview with critical alerts

### **Utility Components**
- **`AssetRow`**: Individual asset display with edit/complete functionality
- **Status indicators**: Color-coded status and priority badges
- **Progress bars**: Visual compliance percentage representation

## 🛠️ **Technical Features**

### **Real-time Calculations**
- Automatic status updates based on due dates
- Compliance percentage calculations
- Next due date calculations based on frequency
- Priority-based sorting and filtering

### **Advanced Filtering**
- Multi-select status filters
- Priority-based filtering
- Category-based filtering
- Full-text search across asset titles and descriptions

### **Data Validation**
- Asset ID validation against master list
- Building access control verification
- User authentication and authorization
- Input sanitization and validation

### **Audit Trail**
- Complete change history logging
- User action tracking
- Before/after state preservation
- Compliance event logging

## 🚀 **Getting Started**

### **1. Setup Compliance for a Building**
1. Navigate to `/buildings/compliance/setup?buildingId=[buildingId]`
2. Select desired compliance assets from the master list
3. Configure initial settings (optional)
4. Submit to create building-specific compliance tracking

### **2. Monitor Building Compliance**
1. Navigate to `/buildings/[buildingId]/compliance`
2. View real-time compliance status
3. Edit asset details inline
4. Mark assets as completed
5. Upload compliance documents

### **3. Portfolio Overview**
1. Navigate to `/buildings/compliance`
2. View compliance across all buildings
3. Identify critical issues and overdue items
4. Filter and sort by various criteria
5. Access individual building details

## 🔒 **Security & Access Control**

- **Authentication Required**: All endpoints require valid user session
- **Building Access Control**: Users can only access buildings they're assigned to
- **Input Validation**: All user inputs are validated and sanitized
- **Audit Logging**: All changes are logged with user attribution
- **Rate Limiting**: API endpoints include rate limiting protection

## 📊 **Performance Considerations**

- **Efficient Queries**: Optimized database queries with proper indexing
- **Lazy Loading**: Category expansion on demand
- **Memoized Calculations**: Expensive calculations cached and memoized
- **Pagination**: Large datasets handled with pagination
- **Real-time Updates**: Minimal page refreshes with smart state management

## 🔮 **Future Enhancements**

- **Email Notifications**: Automated compliance reminders
- **Mobile App**: Native mobile compliance management
- **Integration APIs**: Third-party system integrations
- **Advanced Reporting**: Custom compliance reports and analytics
- **Workflow Automation**: Automated compliance workflows
- **AI-powered Insights**: Machine learning for compliance optimization

## 🐛 **Troubleshooting**

### **Common Issues**
1. **Assets not appearing**: Check if building has compliance assets configured
2. **Permission errors**: Verify user has access to the building
3. **Status not updating**: Check due date format and calculations
4. **API errors**: Verify authentication and request format

### **Debug Information**
- All API endpoints include detailed error logging
- Client-side error handling with user-friendly messages
- Console logging for development debugging
- Database query logging for performance analysis

## 📚 **Additional Resources**

- **Master Assets List**: `lib/compliance/masterAssets.ts`
- **Utility Functions**: `lib/compliance/utils.ts`
- **Type Definitions**: `types/compliance.ts`
- **API Documentation**: See individual route files for detailed endpoint documentation

---

**Built with ❤️ for BlocIQ Property Management**
