# BlocIQ Complete Supabase Schema Documentation

## Overview

This document provides a comprehensive analysis of the BlocIQ frontend application and the complete Supabase schema required to support all functionality. The schema has been designed based on analysis of the frontend codebase, including building management, compliance tracking, email management, document handling, and user management systems.

## Key Areas Analyzed

### 1. Buildings Overview and Detail Pages
- **Core Tables**: `buildings`, `building_setup`, `units`, `leaseholders`
- **Relationships**: Buildings → Units → Leaseholders (one-to-many)
- **Features**: Building information, unit management, leaseholder details

### 2. Units and Leaseholders Linking
- **Core Tables**: `units`, `leaseholders`, `occupiers`
- **Relationships**: 
  - Units belong to Buildings (many-to-one)
  - Leaseholders belong to Units (one-to-one)
  - Occupiers can be associated with Units (one-to-many)
- **Features**: Unit management, leaseholder information, occupier tracking

### 3. Building Compliance Tracker and Asset Setup
- **Core Tables**: `compliance_assets`, `building_compliance_assets`, `compliance_documents`, `compliance_contracts`
- **Relationships**:
  - Compliance assets are templates for compliance items
  - Building compliance assets link buildings to specific compliance requirements
  - Compliance documents store uploaded compliance files
  - Compliance contracts link contractors to compliance assets
- **Features**: Compliance tracking, document management, contractor relationships

### 4. Email Inbox Linked to Leaseholders/Buildings
- **Core Tables**: `incoming_emails`, `email_history`, `email_drafts`
- **Relationships**:
  - Emails can be linked to buildings, units, or leaseholders
  - Email drafts are associated with incoming emails
  - Email history tracks sent communications
- **Features**: Email management, AI classification, assignment to buildings/units

### 5. Uploaded Documents, Classification, and Linking
- **Core Tables**: `building_documents`, `leases`, `document_analysis`, `document_queries`
- **Relationships**:
  - Documents can be linked to buildings, units, or leaseholders
  - Document analysis provides AI-powered text extraction
  - Document queries enable AI-powered document Q&A
- **Features**: Document storage, AI analysis, classification

## Table Relationships

### Core Building Management
```
buildings (1) ←→ (many) units
units (1) ←→ (1) leaseholders
units (1) ←→ (many) occupiers
buildings (1) ←→ (1) building_setup
```

### Compliance Management
```
buildings (1) ←→ (many) building_compliance_assets
compliance_assets (1) ←→ (many) building_compliance_assets
building_compliance_assets (1) ←→ (many) compliance_documents
compliance_assets (1) ←→ (many) compliance_contracts
contractors (1) ←→ (many) compliance_contracts
```

### Email Management
```
incoming_emails (1) ←→ (many) email_drafts
incoming_emails (many) ←→ (1) buildings (optional)
incoming_emails (many) ←→ (1) units (optional)
incoming_emails (many) ←→ (1) leaseholders (optional)
```

### Document Management
```
building_documents (many) ←→ (1) buildings
building_documents (many) ←→ (1) units (optional)
building_documents (many) ←→ (1) leaseholders (optional)
building_documents (1) ←→ (many) document_analysis
building_documents (1) ←→ (many) document_queries
```

### User Management
```
users (1) ←→ (1) profiles
users (many) ←→ (1) agencies
users (many) ←→ (1) buildings (optional)
```

## Additional ALTER TABLE Commands

### Missing Foreign Key Constraints
```sql
-- Add missing foreign keys for email management
ALTER TABLE incoming_emails ADD CONSTRAINT incoming_emails_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add missing foreign keys for document management
ALTER TABLE leases ADD CONSTRAINT leases_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE leases ADD CONSTRAINT leases_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add missing foreign keys for communication templates
ALTER TABLE communications ADD CONSTRAINT communications_template_id_fkey 
  FOREIGN KEY (template_id) REFERENCES communication_templates(id) ON DELETE SET NULL;
```

### Missing NOT NULL Constraints
```sql
-- Add NOT NULL constraints where appropriate
ALTER TABLE buildings ALTER COLUMN name SET NOT NULL;
ALTER TABLE units ALTER COLUMN unit_number SET NOT NULL;
ALTER TABLE units ALTER COLUMN building_id SET NOT NULL;
ALTER TABLE leaseholders ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE compliance_assets ALTER COLUMN category SET NOT NULL;
ALTER TABLE compliance_assets ALTER COLUMN name SET NOT NULL;
ALTER TABLE building_compliance_assets ALTER COLUMN building_id SET NOT NULL;
ALTER TABLE building_compliance_assets ALTER COLUMN asset_id SET NOT NULL;
ALTER TABLE incoming_emails ALTER COLUMN message_id SET NOT NULL;
ALTER TABLE building_documents ALTER COLUMN file_name SET NOT NULL;
ALTER TABLE building_documents ALTER COLUMN file_url SET NOT NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE occupiers ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE occupiers ALTER COLUMN unit_id SET NOT NULL;
```

### Missing DEFAULT Values
```sql
-- Add DEFAULT values for status fields
ALTER TABLE building_compliance_assets ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE incoming_emails ALTER COLUMN unread SET DEFAULT true;
ALTER TABLE incoming_emails ALTER COLUMN handled SET DEFAULT false;
ALTER TABLE incoming_emails ALTER COLUMN pinned SET DEFAULT false;
ALTER TABLE incoming_emails ALTER COLUMN flag_status SET DEFAULT 'none';
ALTER TABLE email_history ALTER COLUMN status SET DEFAULT 'sent';
ALTER TABLE major_works ALTER COLUMN status SET DEFAULT 'planning';
ALTER TABLE occupiers ALTER COLUMN status SET DEFAULT 'current';
ALTER TABLE buildings ALTER COLUMN demo_ready SET DEFAULT false;
```

## Missing RLS Policies

### Comprehensive RLS Policies
```sql
-- Buildings policies
CREATE POLICY "Users can view buildings they have access to" ON buildings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE building_id = buildings.id
      UNION
      SELECT id FROM users WHERE building_id = buildings.id
    )
  );

CREATE POLICY "Users can update buildings they have access to" ON buildings
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE building_id = buildings.id
      UNION
      SELECT id FROM users WHERE building_id = buildings.id
    )
  );

-- Units policies
CREATE POLICY "Users can view units in their buildings" ON units
  FOR SELECT USING (
    building_id IN (
      SELECT building_id FROM profiles WHERE user_id = auth.uid()
      UNION
      SELECT building_id FROM users WHERE id = auth.uid()
    )
  );

-- Leaseholders policies
CREATE POLICY "Users can view leaseholders in their buildings" ON leaseholders
  FOR SELECT USING (
    unit_id IN (
      SELECT u.id FROM units u
      JOIN profiles p ON u.building_id = p.building_id
      WHERE p.user_id = auth.uid()
      UNION
      SELECT u.id FROM units u
      JOIN users usr ON u.building_id = usr.building_id
      WHERE usr.id = auth.uid()
    )
  );

-- Compliance policies
CREATE POLICY "Users can view compliance assets" ON compliance_assets
  FOR SELECT USING (true);

CREATE POLICY "Users can view building compliance for their buildings" ON building_compliance_assets
  FOR SELECT USING (
    building_id IN (
      SELECT building_id FROM profiles WHERE user_id = auth.uid()
      UNION
      SELECT building_id FROM users WHERE id = auth.uid()
    )
  );

-- Email policies
CREATE POLICY "Users can view emails for their buildings" ON incoming_emails
  FOR SELECT USING (
    building_id IN (
      SELECT building_id FROM profiles WHERE user_id = auth.uid()
      UNION
      SELECT building_id FROM users WHERE id = auth.uid()
    )
    OR building_id IS NULL
  );

-- Document policies
CREATE POLICY "Users can view documents for their buildings" ON building_documents
  FOR SELECT USING (
    building_id IN (
      SELECT building_id FROM profiles WHERE user_id = auth.uid()
      UNION
      SELECT building_id FROM users WHERE id = auth.uid()
    )
  );
```

## Missing Supabase Functions

### Email Management Functions
```sql
-- Function to automatically classify emails
CREATE OR REPLACE FUNCTION classify_email()
RETURNS TRIGGER AS $$
BEGIN
  -- AI classification logic would go here
  -- This is a placeholder for the actual implementation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for email classification
CREATE TRIGGER trigger_classify_email
  AFTER INSERT ON incoming_emails
  FOR EACH ROW
  EXECUTE FUNCTION classify_email();

-- Function to update compliance status
CREATE OR REPLACE FUNCTION update_compliance_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update compliance status based on due dates
  UPDATE building_compliance_assets 
  SET status = CASE 
    WHEN next_due_date < CURRENT_DATE THEN 'overdue'
    WHEN next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'pending'
    ELSE 'active'
  END
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for compliance status updates
CREATE TRIGGER trigger_update_compliance_status
  AFTER INSERT OR UPDATE ON building_compliance_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_status();
```

### Document Analysis Functions
```sql
-- Function to extract text from documents
CREATE OR REPLACE FUNCTION extract_document_text()
RETURNS TRIGGER AS $$
BEGIN
  -- AI text extraction logic would go here
  -- This is a placeholder for the actual implementation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for document text extraction
CREATE TRIGGER trigger_extract_document_text
  AFTER INSERT ON building_documents
  FOR EACH ROW
  EXECUTE FUNCTION extract_document_text();
```

## Missing Views

### Compliance Overview View
```sql
-- View for compliance overview
CREATE VIEW compliance_overview AS
SELECT 
  b.id as building_id,
  b.name as building_name,
  ca.category,
  ca.name as compliance_item,
  bca.status,
  bca.next_due_date,
  bca.last_renewed_date,
  cd.document_url as latest_document,
  c.name as contractor_name
FROM buildings b
LEFT JOIN building_compliance_assets bca ON b.id = bca.building_id
LEFT JOIN compliance_assets ca ON bca.asset_id = ca.id
LEFT JOIN compliance_documents cd ON bca.latest_document_id = cd.id
LEFT JOIN compliance_contracts cc ON bca.asset_id = cc.compliance_asset_id AND b.id = cc.building_id
LEFT JOIN contractors c ON cc.contractor_id = c.id;
```

### Email Summary View
```sql
-- View for email summary
CREATE VIEW email_summary AS
SELECT 
  b.id as building_id,
  b.name as building_name,
  COUNT(ie.id) as total_emails,
  COUNT(CASE WHEN ie.unread = true THEN 1 END) as unread_emails,
  COUNT(CASE WHEN ie.handled = false THEN 1 END) as unhandled_emails,
  COUNT(CASE WHEN ie.flag_status = 'flagged' THEN 1 END) as flagged_emails
FROM buildings b
LEFT JOIN incoming_emails ie ON b.id = ie.building_id
GROUP BY b.id, b.name;
```

### Building Overview View
```sql
-- View for building overview
CREATE VIEW building_overview AS
SELECT 
  b.*,
  COUNT(u.id) as unit_count,
  COUNT(l.id) as leaseholder_count,
  COUNT(o.id) as occupier_count,
  COUNT(ie.id) as email_count,
  COUNT(bd.id) as document_count
FROM buildings b
LEFT JOIN units u ON b.id = u.building_id
LEFT JOIN leaseholders l ON u.id = l.unit_id
LEFT JOIN occupiers o ON u.id = o.unit_id
LEFT JOIN incoming_emails ie ON b.id = ie.building_id
LEFT JOIN building_documents bd ON b.id = bd.building_id
GROUP BY b.id;
```

## Enum Values

### Status Enums
```sql
-- Compliance status enum
CREATE TYPE compliance_status AS ENUM ('pending', 'active', 'overdue', 'completed', 'expired');

-- Email flag status enum
CREATE TYPE email_flag_status AS ENUM ('none', 'flagged', 'urgent');

-- Major works status enum
CREATE TYPE major_works_status AS ENUM ('planning', 'in_progress', 'completed', 'on_hold');

-- Occupier status enum
CREATE TYPE occupier_status AS ENUM ('current', 'former', 'pending');

-- Building structure type enum
CREATE TYPE building_structure_type AS ENUM ('Freehold', 'RMC', 'Tripartite');

-- Client type enum
CREATE TYPE client_type AS ENUM ('Freeholder Company', 'Board of Directors');
```

## Performance Optimizations

### Additional Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_units_building_leaseholder ON units(building_id, leaseholder_id);
CREATE INDEX idx_incoming_emails_building_status ON incoming_emails(building_id, handled, unread);
CREATE INDEX idx_building_compliance_assets_building_status_due ON building_compliance_assets(building_id, status, next_due_date);
CREATE INDEX idx_building_documents_building_type ON building_documents(building_id, type);
CREATE INDEX idx_property_events_building_time ON property_events(building_id, start_time);

-- Partial indexes for active records
CREATE INDEX idx_active_occupiers ON occupiers(unit_id) WHERE status = 'current';
CREATE INDEX idx_unread_emails ON incoming_emails(building_id) WHERE unread = true;
CREATE INDEX idx_overdue_compliance ON building_compliance_assets(building_id) WHERE status = 'overdue';
```

### Materialized Views for Complex Queries
```sql
-- Materialized view for compliance dashboard
CREATE MATERIALIZED VIEW compliance_dashboard AS
SELECT 
  b.id as building_id,
  b.name as building_name,
  COUNT(bca.id) as total_compliance_items,
  COUNT(CASE WHEN bca.status = 'overdue' THEN 1 END) as overdue_items,
  COUNT(CASE WHEN bca.status = 'pending' THEN 1 END) as pending_items,
  COUNT(CASE WHEN bca.status = 'active' THEN 1 END) as active_items
FROM buildings b
LEFT JOIN building_compliance_assets bca ON b.id = bca.building_id
GROUP BY b.id, b.name;

-- Refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_compliance_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW compliance_dashboard;
END;
$$ LANGUAGE plpgsql;
```

## Security Considerations

### Row Level Security Policies
All tables have RLS enabled with appropriate policies to ensure users can only access data they are authorized to see. The policies are based on:
- User's building assignments
- User's agency membership
- User's role and permissions

### Data Validation
- All foreign key relationships are properly enforced
- Check constraints ensure data integrity
- NOT NULL constraints prevent invalid data
- Default values provide sensible defaults

### Audit Trail
- All tables include `created_at` and `updated_at` timestamps
- Building amendments table tracks all changes to building data
- Triggers automatically update timestamps

## Migration Strategy

### Phase 1: Core Tables
1. Create buildings, units, leaseholders tables
2. Set up basic relationships and constraints
3. Enable RLS policies

### Phase 2: Compliance System
1. Create compliance-related tables
2. Set up compliance assets and assignments
3. Configure compliance tracking

### Phase 3: Email Management
1. Create email tables
2. Set up email classification
3. Configure email assignment

### Phase 4: Document Management
1. Create document tables
2. Set up document analysis
3. Configure document linking

### Phase 5: Advanced Features
1. Create views and materialized views
2. Set up advanced functions
3. Configure performance optimizations

## Conclusion

This complete Supabase schema provides a robust foundation for the BlocIQ property management system. It supports all the functionality identified in the frontend analysis while maintaining data integrity, security, and performance. The schema is designed to be scalable and can accommodate future enhancements as the application evolves. 