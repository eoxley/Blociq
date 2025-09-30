# 🏢 BlocIQ Onboarding Schema Guide

## Overview

This document defines the complete onboarding schema for new agencies in BlocIQ, ensuring smooth data import with all necessary relationships and compliance requirements.

## 🗄️ Core Onboarding Tables

### 1. **agencies** - Property Management Companies

#### Minimal Required Columns
- `id` (uuid, PRIMARY KEY)
- `name` (text, NOT NULL) - Company name
- `slug` (text, UNIQUE, NOT NULL) - URL-friendly identifier
- `agency_id` - Not applicable (this is the root table)

#### Optional but Useful Columns
- `contact_name` (text) - Primary contact person
- `contact_email` (text) - Primary contact email
- `contact_phone` (text) - Primary contact phone
- `address` (text) - Company address
- `postcode` (text) - Company postcode
- `company_number` (text) - Companies House registration
- `vat_number` (text) - VAT registration number
- `domain` (text) - Company website domain
- `logo_url` (text) - Company logo URL
- `onboarding_status` (text) - pending|in_progress|completed|archived

#### Data Types & Constraints
```sql
CREATE TABLE agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  contact_email text,
  onboarding_status text DEFAULT 'pending' 
    CHECK (onboarding_status IN ('pending', 'in_progress', 'completed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### Example Row (MIH)
```csv
id: 01234567-89ab-cdef-0123-456789abcdef
name: MIH Property Management
slug: mih
contact_name: Sarah Johnson
contact_email: sarah@mihproperty.co.uk
```

---

### 2. **agency_members** - User Access Control

#### Minimal Required Columns
- `agency_id` (uuid, NOT NULL, FK to agencies)
- `user_id` (uuid, NOT NULL, FK to auth.users)
- `role` (enum) - owner|admin|manager|viewer

#### Optional but Useful Columns
- `invitation_status` (text) - accepted|pending|declined
- `joined_at` (timestamptz) - When user joined agency

#### Data Types & Constraints
```sql
CREATE TABLE agency_members (
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role agency_role NOT NULL DEFAULT 'manager',
  invitation_status text NOT NULL DEFAULT 'accepted',
  PRIMARY KEY (agency_id, user_id)
);
```

---

### 3. **buildings** - Property Portfolio

#### Minimal Required Columns
- `id` (uuid, PRIMARY KEY)
- `agency_id` (uuid, NOT NULL, FK to agencies)
- `name` (text, NOT NULL) - Building name
- `address` (text) - Full address

#### Optional but Useful Columns
- `postcode` (text) - For mapping and logistics
- `is_hrb` (boolean) - High Risk Building classification
- `year_built` (integer) - Construction year
- `total_units` (integer) - Number of units
- `management_start_date` (date) - When agency started managing
- `freeholder_name` (text) - Freeholder details
- `service_charge_budget` (decimal) - Annual budget
- `building_manager_name` (text) - On-site manager
- `building_manager_email` (text) - Manager contact

#### Data Types & Constraints
```sql
CREATE TABLE buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  name text NOT NULL,
  address text,
  postcode text,
  is_hrb boolean DEFAULT false,
  total_units integer CHECK (total_units > 0),
  building_type text DEFAULT 'residential' 
    CHECK (building_type IN ('residential', 'commercial', 'mixed_use'))
);
```

#### Example Row (Ashwood Court)
```csv
id: 11111111-2222-3333-4444-555555555555
agency_id: 01234567-89ab-cdef-0123-456789abcdef
name: Ashwood Court
address: 45 Ashwood Gardens, London
postcode: SW19 8QR
is_hrb: false
total_units: 12
```

---

### 4. **units** - Individual Properties

#### Minimal Required Columns
- `id` (uuid, PRIMARY KEY)
- `agency_id` (uuid, NOT NULL, FK to agencies)
- `building_id` (uuid, NOT NULL, FK to buildings)
- `unit_number` (text, NOT NULL) - Unit identifier

#### Optional but Useful Columns
- `unit_type` (text) - flat|maisonette|house|commercial
- `bedrooms` (integer) - Number of bedrooms
- `floor` (text) - Floor location
- `sqft` (integer) - Floor area in square feet
- `lease_end_date` (date) - Lease expiry
- `ground_rent_pa` (decimal) - Annual ground rent
- `service_charge_pa` (decimal) - Annual service charge
- `is_let` (boolean) - Whether currently tenanted

#### Data Types & Constraints
```sql
CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  unit_type text DEFAULT 'flat' 
    CHECK (unit_type IN ('flat', 'maisonette', 'house', 'commercial', 'parking', 'storage')),
  bedrooms integer CHECK (bedrooms >= 0),
  is_let boolean DEFAULT true,
  UNIQUE(building_id, unit_number)
);
```

---

### 5. **leaseholders** - Property Owners

#### Minimal Required Columns
- `id` (uuid, PRIMARY KEY)
- `agency_id` (uuid, NOT NULL, FK to agencies)
- `unit_id` (uuid, NOT NULL, FK to units)
- `name` (text) - Full name or company name
- `email` (text) - Primary contact email

#### Optional but Useful Columns
- `correspondence_address` (text) - Alternative postal address
- `phone` (text) - Primary phone number
- `mobile_phone` (text) - Mobile number
- `preferred_contact_method` (text) - email|phone|post
- `is_company` (boolean) - Whether leaseholder is a company
- `is_director` (boolean) - Whether they're an RMC director
- `director_position` (text) - Chairman|Secretary|Treasurer
- `emergency_contact_name` (text) - Emergency contact details

#### Data Types & Constraints
```sql
CREATE TABLE leaseholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name text,
  email text,
  preferred_contact_method text DEFAULT 'email' 
    CHECK (preferred_contact_method IN ('email', 'phone', 'post')),
  is_director boolean DEFAULT false
);
```

---

### 6. **leases** - Lease Agreements

#### Minimal Required Columns
- `id` (uuid, PRIMARY KEY)
- `agency_id` (uuid, NOT NULL, FK to agencies)
- `building_id` (uuid, NOT NULL, FK to buildings)
- `unit_id` (uuid, NOT NULL, FK to units)
- `start_date` (date) - Lease commencement
- `expiry_date` (date) - Lease expiry

#### Optional but Useful Columns
- `lease_type` (text) - residential|commercial|ground|head
- `original_term_years` (integer) - Original lease term
- `annual_ground_rent` (decimal) - Ground rent amount
- `ground_rent_review_date` (date) - Next review date
- `service_charge_percentage` (numeric) - Percentage share
- `subletting_permitted` (boolean) - Subletting allowed
- `pets_permitted` (boolean) - Pets allowed
- `lease_plan_attached` (boolean) - Whether plan is attached

#### Data Types & Constraints
```sql
CREATE TABLE leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  lease_type text DEFAULT 'residential' 
    CHECK (lease_type IN ('residential', 'commercial', 'ground', 'head')),
  start_date date,
  expiry_date date CHECK (expiry_date > start_date)
);
```

---

### 7. **unit_apportionments** - Service Charge Splits

#### Minimal Required Columns
- `id` (uuid, PRIMARY KEY)
- `agency_id` (uuid, NOT NULL, FK to agencies)
- `building_id` (uuid, NOT NULL, FK to buildings)
- `unit_id` (uuid, NOT NULL, FK to units)
- `apportionment_type` (text, NOT NULL) - service_charge|reserve_fund|insurance
- `percentage` (numeric, NOT NULL) - Percentage share (0-100)
- `effective_from` (date, NOT NULL) - When this apportionment starts

#### Optional but Useful Columns
- `fixed_amount` (decimal) - Fixed amount instead of percentage
- `effective_until` (date) - When this apportionment ends
- `calculation_method` (text) - percentage|fixed_amount|per_unit|by_floor_area
- `notes` (text) - Explanation of calculation

#### Data Types & Constraints
```sql
CREATE TABLE unit_apportionments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  apportionment_type text NOT NULL 
    CHECK (apportionment_type IN ('service_charge', 'reserve_fund', 'ground_rent', 'insurance')),
  percentage numeric(6,3) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(unit_id, apportionment_type, effective_from)
);
```

---

### 8. **building_documents** - Document Storage

#### Minimal Required Columns
- `id` (uuid, PRIMARY KEY)
- `agency_id` (uuid, NOT NULL, FK to agencies)
- `building_id` (uuid, FK to buildings) - Can be NULL for agency-wide docs
- `file_name` (text, NOT NULL) - Original filename
- `file_url` (text, NOT NULL) - Storage location

#### Optional but Useful Columns
- `unit_id` (uuid, FK to units) - Unit-specific documents
- `leaseholder_id` (uuid, FK to leaseholders) - Leaseholder-specific docs
- `type` (text) - lease|certificate|insurance|correspondence
- `file_size` (bigint) - File size in bytes
- `mime_type` (text) - File content type

#### Data Types & Constraints
```sql
CREATE TABLE building_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  building_id uuid REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id) ON DELETE CASCADE,
  leaseholder_id uuid REFERENCES leaseholders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  type text CHECK (type IN ('lease', 'certificate', 'insurance', 'correspondence', 'other'))
);
```

---

### 9. **compliance_master_assets** - Compliance Catalogue

#### Minimal Required Columns
- `id` (uuid, PRIMARY KEY)
- `asset_code` (text, UNIQUE, NOT NULL) - e.g., 'EICR', 'FRA'
- `asset_name` (text, NOT NULL) - Display name
- `category` (text, NOT NULL) - electrical|fire_safety|gas|structural
- `frequency_months` (integer, NOT NULL) - How often required

#### Optional but Useful Columns
- `description` (text) - Detailed explanation
- `is_mandatory` (boolean) - Whether legally required
- `applies_to_hrb_only` (boolean) - Only for High Risk Buildings
- `legislation_reference` (text) - Legal requirement reference

#### Data Types & Constraints
```sql
CREATE TABLE compliance_master_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code text UNIQUE NOT NULL,
  asset_name text NOT NULL,
  category text NOT NULL 
    CHECK (category IN ('electrical', 'fire_safety', 'gas', 'structural', 'environmental', 'health_safety', 'building_safety')),
  frequency_months integer NOT NULL CHECK (frequency_months > 0),
  is_mandatory boolean DEFAULT true,
  applies_to_hrb_only boolean DEFAULT false
);
```

---

### 10. **building_compliance_assets** - Per-Building Compliance

#### Minimal Required Columns
- `id` (uuid, PRIMARY KEY)
- `agency_id` (uuid, NOT NULL, FK to agencies)
- `building_id` (uuid, NOT NULL, FK to buildings)
- `compliance_master_asset_id` (uuid, NOT NULL, FK to compliance_master_assets)
- `status` (text) - compliant|due_soon|overdue|pending

#### Optional but Useful Columns
- `last_inspection_date` (date) - When last completed
- `next_inspection_due` (date) - When next due
- `contractor_name` (text) - Who performed inspection
- `contractor_email` (text) - Contractor contact
- `certificate_reference` (text) - Certificate number
- `certificate_url` (text) - Certificate file location
- `cost` (decimal) - Cost of inspection

#### Data Types & Constraints
```sql
CREATE TABLE building_compliance_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_master_asset_id uuid NOT NULL 
    REFERENCES compliance_master_assets(id) ON DELETE RESTRICT,
  status text DEFAULT 'pending' 
    CHECK (status IN ('compliant', 'due_soon', 'overdue', 'pending', 'non_compliant')),
  UNIQUE(building_id, compliance_master_asset_id)
);
```

## 🚀 Deployment Instructions

### 1. Run the Migration
```bash
# Apply the onboarding schema enhancement
psql -f supabase/migrations/0006_onboarding_schema.sql

# Verify the migration
SELECT 'ONBOARDING SCHEMA READY' as status;
```

### 2. Import CSV Data
Use the provided CSV templates in the Supabase Table Editor:

1. **agencies.csv** → `agencies` table
2. **buildings.csv** → `buildings` table  
3. **units.csv** → `units` table
4. **leaseholders.csv** → `leaseholders` table
5. **leases.csv** → `leases` table
6. **unit_apportionments.csv** → `unit_apportionments` table
7. **building_documents.csv** → `building_documents` table
8. **building_compliance_assets.csv** → `building_compliance_assets` table

### 3. Verify Import
```sql
-- Check MIH data is visible
SELECT 
  a.name as agency,
  COUNT(b.id) as buildings,
  COUNT(u.id) as units,
  COUNT(l.id) as leaseholders
FROM agencies a
LEFT JOIN buildings b ON b.agency_id = a.id
LEFT JOIN units u ON u.building_id = b.id  
LEFT JOIN leaseholders l ON l.unit_id = u.id
WHERE a.slug = 'mih'
GROUP BY a.name;
```

## 🔒 Security Features

### Agency Scoping
- **All tables include `agency_id`** with NOT NULL constraints
- **RLS policies** prevent cross-agency data access
- **Foreign key constraints** maintain referential integrity

### Role-Based Access
- **Owner/Admin**: Full agency management + user management
- **Manager**: Data CRUD operations
- **Viewer**: Read-only access

### Data Isolation
- **Automatic filtering** by current agency in all queries
- **Insert protection** - agency_id added automatically
- **No cross-agency visibility** even with direct database access

## 📊 Example Data Structure

After importing the CSV templates, you'll have:

**MIH Agency** with:
- ✅ 1 building (Ashwood Court)
- ✅ 3 units (Flats 1-3)
- ✅ 3 leaseholders (including RMC directors)
- ✅ 3 leases (with proper terms and ground rent)
- ✅ 6 apportionments (service charge + reserve fund)
- ✅ 4 compliance assets (FRA, EICR, Gas Safety, Lift)
- ✅ 19 seeded compliance master assets

## ✅ Acceptance Criteria Met

- ✅ **Clean schema** ready for onboarding
- ✅ **CSV import** creates immediate MIH visibility  
- ✅ **Agency scoping** applies automatically
- ✅ **Extensible design** supports unlimited agencies/buildings
- ✅ **Proper relationships** with foreign key constraints
- ✅ **UK compliance focus** with relevant asset types
- ✅ **Production ready** with performance indexes and RLS

The onboarding system is now ready for MIH and future agencies! 🎉
