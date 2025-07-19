# Building Tasks & Site Inspection Features

## Overview

BlocIQ now includes two powerful new features for building management: **Building-Specific To-Do Lists** and **Smart Site Inspection Generator**. These features help property managers track tasks, manage inspections, and maintain compliance across their building portfolio.

## 🧱 Feature 1: Building Tasks

### Overview
Each building in the system has its own dedicated to-do list where property managers can create, assign, and track tasks with due dates, priorities, and status updates.

### Database Schema

#### `building_tasks` Table
```sql
CREATE TABLE building_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    due_date DATE,
    assigned_to TEXT, -- email or user_id
    status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Complete')),
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,
    notes TEXT
);
```

### Features

#### Task Management
- **Create Tasks**: Add new tasks with descriptions, due dates, and assignees
- **Priority Levels**: Low, Medium, High, Urgent with color-coded badges
- **Status Tracking**: Not Started → In Progress → Complete
- **Assignment**: Assign tasks to team members by email or user ID
- **Notes**: Add detailed notes and context to tasks

#### User Interface
- **Task Cards**: Clean card layout with status icons and priority indicators
- **Filtering**: Filter by status (All, Not Started, In Progress, Complete)
- **Search**: Search tasks by description or assignee
- **Assignee Filter**: Filter tasks by specific team members
- **Due Date Warnings**: Overdue tasks highlighted in red
- **Quick Actions**: Hover to reveal edit and delete buttons

#### Visual Indicators
- **Status Icons**: 
  - 📝 Not Started (Alert Circle)
  - ⏰ In Progress (Clock)
  - ✅ Complete (Check Circle)
- **Priority Colors**:
  - 🔴 Urgent (Red)
  - 🟠 High (Orange)
  - 🟡 Medium (Yellow)
  - 🟢 Low (Green)
- **Overdue Tasks**: Red border and "Overdue" label

### API Endpoints

#### GET `/api/building-tasks`
Fetch tasks for a building with optional filtering
```typescript
// Query parameters
{
  buildingId: string;
  status?: 'all' | 'Not Started' | 'In Progress' | 'Complete';
  assignedTo?: string;
}
```

#### POST `/api/building-tasks`
Create a new task
```typescript
{
  buildingId: string;
  task: string;
  dueDate?: string;
  assignedTo?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  notes?: string;
  createdBy?: string;
}
```

#### PUT `/api/building-tasks/[id]`
Update an existing task
```typescript
{
  task?: string;
  dueDate?: string;
  assignedTo?: string;
  status?: 'Not Started' | 'In Progress' | 'Complete';
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  notes?: string;
}
```

#### DELETE `/api/building-tasks/[id]`
Delete a task

## 🏢 Feature 2: Smart Site Inspection Generator

### Overview
Automated site inspection system that generates comprehensive checklists based on building compliance assets and provides AI-powered summary reports.

### Database Schema

#### `site_inspections` Table
```sql
CREATE TABLE site_inspections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    inspected_by TEXT NOT NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    status TEXT DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Completed', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `inspection_items` Table
```sql
CREATE TABLE inspection_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inspection_id UUID NOT NULL REFERENCES site_inspections(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Not Inspected' CHECK (status IN ('OK', 'Issue Found', 'Not Inspected', 'Needs Attention')),
    notes TEXT,
    location TEXT,
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Features

#### Automated Checklist Generation
- **Asset-Based Items**: Automatically creates inspection items from `compliance_assets` table
- **Priority Assignment**: Critical assets (Fire Alarm, Emergency Lighting) marked as high priority
- **Location Tracking**: Includes asset locations when available
- **Smart Categorization**: Groups assets by type (Fire Safety, Electrical, HVAC, etc.)

#### Inspection Workflow
1. **Start Inspection**: Create new inspection with inspector details
2. **Auto-Generated Checklist**: System creates items from compliance assets
3. **Item-by-Item Review**: Mark each item as OK, Issue Found, Needs Attention, or Not Inspected
4. **Notes Addition**: Add detailed notes for each inspection item
5. **Completion**: Mark inspection as complete with optional AI summary

#### AI-Powered Summary Generation
- **Automatic Analysis**: AI reviews all inspection items and their statuses
- **Professional Summary**: Generates 2-3 sentence summary highlighting:
  - Overall inspection status
  - Critical issues found
  - Recommended next steps
- **Actionable Insights**: Provides clear guidance for property managers

#### User Interface
- **Progress Tracking**: Visual progress bar showing completion percentage
- **Status Indicators**:
  - ✅ OK (Green)
  - ⚠️ Needs Attention (Yellow)
  - ❌ Issue Found (Red)
  - ⏸️ Not Inspected (Gray)
- **Real-time Updates**: Instant status updates with visual feedback
- **Export Functionality**: Download inspection reports as text files

### API Endpoints

#### GET `/api/site-inspections`
Fetch inspections for a building
```typescript
// Query parameters
{
  buildingId: string;
  status?: 'all' | 'In Progress' | 'Completed' | 'Cancelled';
}
```

#### POST `/api/site-inspections`
Create a new inspection (auto-generates checklist)
```typescript
{
  buildingId: string;
  inspectedBy: string;
  inspectionDate?: string;
  notes?: string;
}
```

#### PUT `/api/site-inspections/[id]`
Update inspection status and generate AI summary
```typescript
{
  status?: 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  generateSummary?: boolean; // Triggers AI summary generation
}
```

#### PUT `/api/inspection-items/[id]`
Update individual inspection item
```typescript
{
  status?: 'OK' | 'Issue Found' | 'Not Inspected' | 'Needs Attention';
  notes?: string;
}
```

### Database Functions

#### Auto-Generation Function
```sql
CREATE OR REPLACE FUNCTION generate_inspection_items(inspection_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO inspection_items (inspection_id, asset_type, asset_name, location, priority)
    SELECT 
        inspection_id,
        ca.asset_type,
        ca.name,
        COALESCE(ca.location, 'General'),
        CASE 
            WHEN ca.asset_type IN ('Fire Alarm', 'Emergency Lighting', 'Fire Extinguishers') THEN 'Critical'
            WHEN ca.asset_type IN ('Lifts', 'HVAC', 'Electrical') THEN 'High'
            ELSE 'Medium'
        END as priority
    FROM compliance_assets ca
    INNER JOIN site_inspections si ON ca.building_id = si.building_id
    WHERE si.id = inspection_id
    AND ca.status = 'Active';
END;
$$ LANGUAGE plpgsql;
```

#### Trigger for Auto-Generation
```sql
CREATE TRIGGER auto_generate_inspection_items
    AFTER INSERT ON site_inspections
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_inspection_items();
```

## 🎨 User Interface Integration

### Building Detail Page
The new features are integrated into the building detail page with a tabbed interface:

#### Tab Structure
1. **📝 Tasks Tab**: Building-specific to-do list
2. **🏢 Inspections Tab**: Site inspection management
3. **📊 Overview Tab**: Building information and statistics

#### Layout Features
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Consistent Styling**: Matches BlocIQ design system
- **Loading States**: Skeleton loaders for better UX
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Success/error feedback

### Component Architecture

#### BuildingTasks Component
```typescript
interface BuildingTasksProps {
  buildingId: string;
}
```

**Features**:
- Task list with filtering and search
- Add/edit/delete task modals
- Status toggle with instant feedback
- Priority and due date management
- Assignee tracking

#### SiteInspection Component
```typescript
interface SiteInspectionProps {
  buildingId: string;
}
```

**Features**:
- Active inspection management
- Auto-generated checklist display
- Item status updates
- Progress tracking
- AI summary generation
- Report export

## 🔒 Security & Permissions

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:

#### Building Tasks RLS
- Users can only view/edit tasks for buildings they have access to
- Full CRUD operations with building-level permissions

#### Site Inspections RLS
- Users can only access inspections for their buildings
- Inspection items inherit inspection permissions

### Data Validation
- **Input Validation**: All form inputs validated on frontend and backend
- **Type Safety**: Full TypeScript implementation
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Input sanitization

## 📊 Performance Optimizations

### Database Indexes
```sql
-- Building tasks indexes
CREATE INDEX idx_building_tasks_building_id ON building_tasks(building_id);
CREATE INDEX idx_building_tasks_status ON building_tasks(status);
CREATE INDEX idx_building_tasks_due_date ON building_tasks(due_date);
CREATE INDEX idx_building_tasks_assigned_to ON building_tasks(assigned_to);

-- Site inspections indexes
CREATE INDEX idx_site_inspections_building_id ON site_inspections(building_id);
CREATE INDEX idx_site_inspections_date ON site_inspections(inspection_date);

-- Inspection items indexes
CREATE INDEX idx_inspection_items_inspection_id ON inspection_items(inspection_id);
CREATE INDEX idx_inspection_items_status ON inspection_items(status);
```

### Frontend Optimizations
- **Lazy Loading**: Components load only when needed
- **Debounced Search**: Efficient search with debouncing
- **Optimistic Updates**: Instant UI feedback
- **Caching**: Efficient data fetching and caching

## 🚀 Usage Examples

### Creating a Building Task
```typescript
// Add a new task
const newTask = {
  buildingId: "building-123",
  task: "Replace fire alarm batteries",
  dueDate: "2024-02-15",
  assignedTo: "john@example.com",
  priority: "High",
  notes: "All units need battery replacement"
};

const response = await fetch('/api/building-tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newTask)
});
```

### Starting a Site Inspection
```typescript
// Start new inspection
const newInspection = {
  buildingId: "building-123",
  inspectedBy: "Sarah Johnson",
  inspectionDate: "2024-01-20",
  notes: "Monthly compliance check"
};

const response = await fetch('/api/site-inspections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newInspection)
});
// Automatically generates inspection items from compliance assets
```

### Completing Inspection with AI Summary
```typescript
// Complete inspection with AI summary
const response = await fetch(`/api/site-inspections/${inspectionId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'Completed',
    generateSummary: true
  })
});
// Generates AI summary like: "Fire alarm functional. Emergency lighting failed on level 2. Recommend follow-up."
```

## 🔮 Future Enhancements

### Planned Features
1. **Task Templates**: Pre-defined task templates for common building operations
2. **Recurring Tasks**: Automatically recurring tasks (monthly, quarterly, yearly)
3. **Task Dependencies**: Tasks that depend on other tasks
4. **Photo Attachments**: Add photos to inspection items
5. **Digital Signatures**: Inspector signatures for compliance
6. **Integration**: Connect with external compliance systems
7. **Mobile App**: Native mobile application for field inspections
8. **Advanced Analytics**: Inspection trends and compliance reporting

### AI Enhancements
1. **Predictive Maintenance**: AI suggests maintenance based on inspection history
2. **Issue Classification**: Automatically categorize inspection issues
3. **Recommendation Engine**: AI-powered recommendations for task prioritization
4. **Natural Language**: Voice-to-text for inspection notes

## 📋 Implementation Checklist

### Database Setup
- [x] Create `building_tasks` table with RLS
- [x] Create `site_inspections` table with RLS
- [x] Create `inspection_items` table with RLS
- [x] Add database indexes for performance
- [x] Create auto-generation functions and triggers
- [x] Test RLS policies

### API Development
- [x] Building tasks CRUD endpoints
- [x] Site inspections CRUD endpoints
- [x] Inspection items update endpoint
- [x] AI summary generation integration
- [x] Error handling and validation

### Frontend Components
- [x] BuildingTasks component with full functionality
- [x] SiteInspection component with checklist management
- [x] Building detail page integration
- [x] Modal forms for task and inspection creation
- [x] Responsive design and mobile optimization

### Testing & Deployment
- [x] Component testing
- [x] API endpoint testing
- [x] Database migration testing
- [x] Security testing
- [x] Performance testing
- [x] Production deployment

## 🎉 Benefits

### For Property Managers
1. **Efficient Task Management**: Centralized task tracking per building
2. **Compliance Assurance**: Automated inspection checklists
3. **Time Savings**: AI-generated summaries and reports
4. **Better Organization**: Clear task priorities and assignments
5. **Audit Trail**: Complete history of tasks and inspections

### For Building Operations
1. **Standardized Processes**: Consistent inspection procedures
2. **Risk Reduction**: Proactive issue identification
3. **Resource Optimization**: Better task allocation and prioritization
4. **Compliance Tracking**: Automated compliance asset management
5. **Professional Reporting**: AI-powered professional summaries

### For Business
1. **Operational Efficiency**: Streamlined building management
2. **Compliance Management**: Reduced compliance risks
3. **Client Satisfaction**: Professional, organized property management
4. **Scalability**: Easy to manage multiple buildings
5. **Data Insights**: Valuable operational data and trends

The Building Tasks and Site Inspection features provide a comprehensive solution for property managers to efficiently manage building operations, maintain compliance, and deliver professional service to their clients. 