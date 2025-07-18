# Major Works System for BlocIQ

## Overview

BlocIQ now includes a comprehensive Major Works management system that allows property managers to track and manage major works projects across all buildings with timeline tracking, document management, and project coordination.

## 🏗️ Core Features

### 1. Project Tracker Table
- **Location:** `/major-works`
- **Features:**
  - List all major works projects per building
  - Search and filter functionality
  - Status tracking and progress indicators
  - Quick actions (View, Upload, Edit, Delete)
  - Project statistics and overview

### 2. Project Details View
- **Location:** `/major-works/[id]`
- **Features:**
  - Complete project timeline with progress bar
  - Document management and uploads
  - Project information editing
  - Contractor details
  - Cost tracking (estimated vs actual)

### 3. Document Upload System
- **Location:** `/major-works/[id]/upload`
- **Features:**
  - Drag-and-drop file upload
  - Document categorization (Scope, Quote, Notice, etc.)
  - File type validation (PDF, DOCX, XLSX, Images)
  - File size limits (10MB)
  - Automatic organization by project

### 4. New Project Creation
- **Location:** `/major-works/new`
- **Features:**
  - Complete project setup form
  - Building selection
  - Timeline date setting
  - Cost estimation
  - Contractor information

## 📊 Project Timeline Logic

### Standard Major Works Timeline:
```
[Notice of Intention] → (30 days) → [Statement of Estimates] → [Contractor Appointed] → [Construction Period] → [Completion]
```

### Timeline Features:
- **Visual Progress Bar** - Shows current project stage
- **Milestone Tracking** - Key dates with status indicators
- **Flexible Timeline** - Support for custom milestone dates
- **18-Month Maximum** - Standard major works timeline
- **Status-Based Progress** - Automatic progress calculation

### Timeline Stages:
1. **Notice of Intention** - Initial project announcement
2. **Statement of Estimates** - Cost breakdown and consultation
3. **Contractor Appointed** - Contractor selection and appointment
4. **Works in Progress** - Active construction phase
5. **Completed** - Project completion

## 📁 Document Management

### Supported File Types:
- **PDF** - Reports, contracts, notices
- **DOCX** - Letters, correspondence, specifications
- **XLSX** - Cost breakdowns, schedules
- **Images** - Progress photos, site images (JPG, PNG, GIF)

### Document Categories:
- **Scope** - Scope of works and specifications
- **Quote** - Contractor quotes and estimates
- **Notice** - Section 20 notices and legal documents
- **Correspondence** - Letters, emails, communications
- **Contract** - Contractor agreements and contracts
- **Invoice** - Invoices and payment documents
- **Photo** - Progress photos and site images
- **Other** - Miscellaneous documents

### Document Features:
- **Drag-and-Drop Upload** - Easy file upload interface
- **Automatic Organization** - Files linked to projects and buildings
- **Search and Filter** - Find documents by type, date, or project
- **Download Support** - Easy access to all project documents
- **Version Control** - Track document updates and changes

## 🗄️ Database Schema

### major_works_projects Table:
```sql
CREATE TABLE major_works_projects (
    id UUID PRIMARY KEY,
    building_id UUID REFERENCES buildings(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'notice_of_intention',
    notice_of_intention_date DATE,
    statement_of_estimates_date DATE,
    contractor_appointed_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    contractor_name TEXT,
    contractor_contact TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### major_works_documents Table:
```sql
CREATE TABLE major_works_documents (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES major_works_projects(id),
    building_id UUID REFERENCES buildings(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    document_tag TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    description TEXT
);
```

### major_works_timeline_events Table:
```sql
CREATE TABLE major_works_timeline_events (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES major_works_projects(id),
    event_name TEXT NOT NULL,
    event_date DATE,
    event_type TEXT NOT NULL DEFAULT 'milestone',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Project Status Management

### Status Types:
- **notice_of_intention** - Project announced, consultation phase
- **statement_of_estimates** - Cost estimates provided
- **contractor_appointed** - Contractor selected and appointed
- **works_in_progress** - Active construction work
- **completed** - Project finished
- **on_hold** - Project temporarily paused
- **cancelled** - Project cancelled

### Status Features:
- **Visual Indicators** - Color-coded status badges
- **Progress Tracking** - Automatic timeline updates
- **Status Transitions** - Logical workflow progression
- **History Tracking** - Status change audit trail

## 💰 Cost Management

### Cost Tracking:
- **Estimated Cost** - Initial project cost estimate
- **Actual Cost** - Final project cost
- **Cost Comparison** - Variance analysis
- **Currency Formatting** - GBP formatting with proper symbols

### Cost Features:
- **Budget Tracking** - Monitor project costs vs estimates
- **Cost Reporting** - Generate cost reports and summaries
- **Invoice Management** - Track payments and invoices
- **Financial Planning** - Support for financial planning

## 🔧 Technical Implementation

### Frontend Components:
1. **MajorWorksPage** - Main project listing page
2. **ProjectDetailsPage** - Individual project view with timeline
3. **DocumentUploadPage** - File upload interface
4. **NewProjectPage** - Project creation form

### API Endpoints:
- **Project CRUD** - Create, read, update, delete projects
- **Document Upload** - File upload and management
- **Timeline Events** - Custom milestone management
- **Status Updates** - Project status management

### Storage:
- **Supabase Storage** - Document file storage
- **Database Records** - Project and document metadata
- **Public URLs** - Direct file access for downloads

## 📱 User Interface

### Design Principles:
- **iPhone-Style Tiles** - Clean, modern card-based design
- **Consistent Branding** - Matches BlocIQ dashboard theme
- **Responsive Design** - Works on all device sizes
- **Intuitive Navigation** - Easy project and document access

### UI Components:
- **Progress Bars** - Visual timeline representation
- **Status Badges** - Color-coded project status
- **Document Cards** - Organized file management
- **Filter Panels** - Advanced search and filtering

## 🔄 Workflow Integration

### Complete Project Workflow:
1. **Project Creation** - Set up new major works project
2. **Notice Phase** - Issue Section 20 notices
3. **Consultation** - Leaseholder consultation period
4. **Contractor Selection** - Appoint contractor
5. **Construction** - Monitor works progress
6. **Completion** - Project handover and documentation
7. **Documentation** - Archive all project documents

### Integration Points:
- **Building Management** - Links to existing building data
- **Document System** - Integrates with existing document management
- **User Management** - Tracks who uploaded documents
- **Communication System** - Can generate notices and letters

## 🚀 Future Enhancements

### Planned Features:
1. **AI Document Analysis** - Auto-categorize uploaded files
2. **Automated Notifications** - Email alerts for timeline milestones
3. **Reporting Dashboard** - Advanced project analytics
4. **Mobile App** - On-site project management
5. **Integration APIs** - Connect with external systems
6. **Advanced Timeline** - Gantt chart visualization
7. **Cost Forecasting** - Predictive cost analysis
8. **Quality Assurance** - Inspection and quality tracking

### Technical Improvements:
1. **Real-time Updates** - Live project status updates
2. **Advanced Search** - Full-text document search
3. **Bulk Operations** - Mass document upload and management
4. **Export Functionality** - Project reports and data export
5. **Audit Trail** - Complete project history tracking

## 📋 Usage Examples

### Creating a New Project:
```typescript
// Navigate to new project page
router.push('/major-works/new');

// Fill in project details
const projectData = {
  name: 'Roof Replacement Project',
  building_id: 'building-uuid',
  status: 'notice_of_intention',
  estimated_cost: 85000.00
};

// Create project
const { data } = await supabase
  .from('major_works_projects')
  .insert(projectData);
```

### Uploading Documents:
```typescript
// Upload file to storage
const { data: uploadData } = await supabase.storage
  .from('major-works-documents')
  .upload(filePath, file);

// Save document record
const { data: docData } = await supabase
  .from('major_works_documents')
  .insert({
    project_id: projectId,
    file_name: fileName,
    file_url: fileUrl,
    document_tag: 'scope'
  });
```

### Updating Project Status:
```typescript
// Update project status
const { data } = await supabase
  .from('major_works_projects')
  .update({ 
    status: 'works_in_progress',
    contractor_appointed_date: new Date().toISOString()
  })
  .eq('id', projectId);
```

## 🎯 Benefits

### For Property Managers:
- **Centralized Management** - All major works in one place
- **Timeline Tracking** - Clear project progression
- **Document Organization** - Easy file management
- **Cost Control** - Budget tracking and management
- **Compliance** - Section 20 notice management

### For Leaseholders:
- **Transparency** - Clear project information
- **Communication** - Regular project updates
- **Document Access** - Easy access to project documents
- **Timeline Visibility** - Know what to expect and when

### For Contractors:
- **Project Coordination** - Clear project requirements
- **Document Sharing** - Easy file exchange
- **Timeline Management** - Clear deadlines and milestones
- **Communication** - Direct project communication

The Major Works system provides BlocIQ with comprehensive project management capabilities, enabling property managers to efficiently track, manage, and coordinate major works projects while maintaining full transparency and compliance with UK leasehold regulations. 