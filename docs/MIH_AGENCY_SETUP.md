# MIH Agency Setup Guide

## 🎯 **Overview**

This guide sets up MIH Property Management as a real agency client in BlocIQ with complete data isolation. MIH users will only see their own buildings and data, while BlocIQ developers/testers cannot access MIH information.

## 🚀 **Quick Start**

### **Step 1: Run Database Setup**
```bash
# In Supabase SQL Editor, run:
\i scripts/setup-mih-agency.sql
```

### **Step 2: Add MIH Buildings**
```bash
# In Supabase SQL Editor, run:
\i scripts/mih-buildings-seed.sql
```

### **Step 3: Set Up Ellie's User Account**
```bash
# In Supabase SQL Editor, run:
\i scripts/setup-mih-user.sql
```

## 📋 **What Gets Created**

### **1. Agencies Table**
- **MIH Property Management** (`mihproperty.co.uk`)
- **BlocIQ** (`blociq.co.uk`) - for existing users

### **2. Data Isolation**
- **Row Level Security (RLS)** enabled on all tables
- **Agency-scoped access** - users only see their agency's data
- **Automatic agency linking** based on email domain

### **3. MIH Buildings**
- **Riverside Court** (24 units, London SE1)
- **Marina Heights** (18 units, Brighton BN1)  
- **Oakwood Gardens** (32 units, Guildford GU1)

### **4. Compliance Assets**
- Fire Safety Assessment
- Electrical Installation Condition Report
- Gas Safety Certificate

## 🔐 **Security Features**

### **Row Level Security Policies**
```sql
-- Users can only access data in their agency
CREATE POLICY "Users can access buildings in their agency" ON buildings
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.agency_id = buildings.agency_id
    )
);
```

### **Automatic Agency Linking**
- **Email Domain Detection**: `@mihproperty.co.uk` → MIH Agency
- **Trigger-based**: Automatically sets `agency_id` on new records
- **User Isolation**: MIH users cannot see BlocIQ data

## 👤 **User Management**

### **Ellie's Account**
- **Email**: `ellie@mihproperty.co.uk`
- **Role**: `mih_manager`
- **Access**: Full MIH portfolio access
- **Isolation**: Cannot see BlocIQ test/demo data

### **New MIH Users**
```typescript
// Automatically linked to MIH agency
import { linkUserToAgency } from '@/lib/auth/agency-onboarding';

const result = await linkUserToAgency(userId, 'newuser@mihproperty.co.uk');
```

## 🏢 **Building Management**

### **Adding New MIH Buildings**
```typescript
// Automatically gets agency_id from user context
const { data: building, error } = await supabase
  .from('buildings')
  .insert({
    name: 'New MIH Building',
    address: '123 MIH Street, London',
    unit_count: 15
    // agency_id automatically set by trigger
  });
```

### **Building Access Control**
- **MIH Users**: See only MIH buildings
- **BlocIQ Users**: See only BlocIQ buildings
- **Cross-Agency Access**: Impossible due to RLS

## 📊 **Data Isolation Verification**

### **Test as MIH User**
```sql
-- Should only show MIH buildings
SELECT * FROM buildings WHERE agency_id = (
  SELECT agency_id FROM users WHERE email = 'ellie@mihproperty.co.uk'
);
```

### **Test as BlocIQ User**
```sql
-- Should only show BlocIQ buildings
SELECT * FROM buildings WHERE agency_id = (
  SELECT agency_id FROM users WHERE email = 'dev@blociq.co.uk'
);
```

## 🔧 **API Endpoints**

### **Agency-Scoped Queries**
All existing API endpoints automatically respect agency isolation:

- `/api/buildings` - Only returns user's agency buildings
- `/api/compliance` - Only returns user's agency compliance data
- `/api/inbox` - Only returns user's agency emails

### **New Agency Endpoints**
- `/api/agency/profile` - Get current user's agency info
- `/api/agency/users` - Get users in same agency
- `/api/agency/buildings` - Get agency buildings summary

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. User Not Linked to Agency**
```sql
-- Check user's agency_id
SELECT u.email, u.agency_id, a.name as agency_name
FROM users u
LEFT JOIN agencies a ON u.agency_id = a.id
WHERE u.email = 'ellie@mihproperty.co.uk';
```

#### **2. RLS Blocking Access**
```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename = 'buildings';
```

#### **3. Agency ID Missing**
```sql
-- Check if agency_id columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'buildings' 
AND column_name = 'agency_id';
```

### **Reset Procedures**

#### **Complete Reset**
```sql
-- Drop all MIH data and start over
DELETE FROM building_compliance_assets WHERE agency_id = (
  SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'
);
DELETE FROM buildings WHERE agency_id = (
  SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'
);
DELETE FROM agencies WHERE domain = 'mihproperty.co.uk';
```

## 📈 **Monitoring & Analytics**

### **Agency Usage Metrics**
```sql
-- MIH Agency Activity
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_records,
    'buildings' as table_name
FROM buildings 
WHERE agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk')
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### **User Activity by Agency**
```sql
-- Track user activity across agencies
SELECT 
    a.name as agency_name,
    COUNT(DISTINCT u.id) as active_users,
    COUNT(b.id) as total_buildings
FROM agencies a
LEFT JOIN users u ON a.id = u.agency_id
LEFT JOIN buildings b ON a.id = b.agency_id
GROUP BY a.id, a.name
ORDER BY active_users DESC;
```

## 🎉 **Success Criteria**

### **✅ Setup Complete When:**
1. **MIH Agency exists** in `agencies` table
2. **Ellie can log in** with `ellie@mihproperty.co.uk`
3. **3 MIH buildings visible** in Ellie's dashboard
4. **BlocIQ users cannot see** MIH buildings
5. **MIH users cannot see** BlocIQ test data
6. **All API calls respect** agency isolation

### **🔍 Verification Steps**
1. **Login as Ellie** → Should see only MIH buildings
2. **Login as BlocIQ user** → Should see only BlocIQ buildings
3. **Check RLS policies** → All tables should have agency-scoped policies
4. **Test API isolation** → Endpoints should return agency-specific data

## 🚀 **Next Steps**

### **Immediate (Today)**
- [ ] Run database setup scripts
- [ ] Verify MIH agency creation
- [ ] Test user isolation

### **Tomorrow**
- [ ] Add 3 real MIH buildings
- [ ] Set up Ellie's user account
- [ ] Test complete data isolation

### **Future Enhancements**
- [ ] Agency switcher for super admins
- [ ] Multi-agency analytics dashboard
- [ ] Agency-specific compliance templates
- [ ] Automated agency onboarding flow

---

## 📞 **Support**

If you encounter issues during setup:

1. **Check Supabase logs** for RLS policy violations
2. **Verify agency_id columns** exist on all tables
3. **Test with simple queries** before complex operations
4. **Contact BlocIQ team** for technical support

**Remember**: Data isolation is critical - test thoroughly before going live! 🔒
