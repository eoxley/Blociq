# 📧 BlocIQ Email Logging System

## Overview
The BlocIQ Email Logging System automatically captures and logs all emails sent via the Outlook add-in, linking them to buildings and leaseholders in your communications log. This provides complete visibility into all email communications without manual intervention.

## 🎯 **How It Works**

### **1. Automatic Email Capture**
When a user sends an email via Outlook:
1. **Add-in detects send event** - Uses `Office.EventType.ItemSend`
2. **Captures email context** - Subject, body, recipients, timing
3. **Automatically logs** - Sends data to your communications system
4. **Links to buildings/leaseholders** - Uses AI and database matching

### **2. Building & Leaseholder Linking**
The system automatically tries to link emails to your database:

#### **Method 1: Direct Email Match**
- Searches `leaseholders` table by recipient email
- Finds associated unit and building
- Links email to specific leaseholder and building

#### **Method 2: Content Analysis**
- Uses AI to extract building references from email content
- Matches building names/addresses in subject/body
- Links to appropriate building if found

#### **Method 3: Manual Override**
- Users can manually specify building/leaseholder context
- Overrides automatic detection when needed

## 🏗️ **Database Structure**

### **Enhanced communications_log Table**
```sql
-- New columns added for Outlook add-in
ALTER TABLE communications_log 
  ADD COLUMN direction TEXT DEFAULT 'incoming', -- 'incoming' or 'outgoing'
  ADD COLUMN recipient_email TEXT,              -- Recipient email address
  ADD COLUMN is_reply BOOLEAN DEFAULT false,    -- Is this a reply?
  ADD COLUMN is_forward BOOLEAN DEFAULT false,  -- Is this a forward?
  ADD COLUMN source TEXT DEFAULT 'manual';      -- 'outlook_addin', 'manual', 'api'
```

### **Key Relationships**
- **`building_id`** → Links to `buildings` table
- **`unit_id`** → Links to `units` table  
- **`leaseholder_id`** → Links to `leaseholders` table
- **`sent_by`** → Links to `auth.users` table

## 🚀 **Implementation Details**

### **Add-in Email Capture**
```javascript
// Setup automatic email capture
function setupEmailCapture() {
  // Listen for email sends
  Office.context.mailbox.addHandlerAsync(Office.EventType.ItemSend, handleItemSend);
  
  // Listen for email changes
  Office.context.mailbox.addHandlerAsync(Office.EventType.ItemChanged, handleItemChanged);
}

// Handle email send events
async function handleItemSend(event) {
  const emailContext = await getCurrentEmailContext();
  await logOutgoingEmail(emailContext);
}
```

### **API Endpoint**
- **Route**: `/api/communications/log-outgoing`
- **Method**: `POST`
- **Purpose**: Log outgoing emails with building/leaseholder linking

### **Data Flow**
```
Outlook Add-in → API Endpoint → Database Matching → communications_log
     ↓              ↓              ↓              ↓
Email Context → Validation → Building/LH Link → Log Entry
```

## 📊 **What Gets Logged**

### **Email Metadata**
- **Subject**: Email subject line
- **Content**: Full email body
- **Recipients**: All email addresses
- **Timing**: When email was sent
- **Direction**: Outgoing (from add-in)

### **Building Context**
- **Building ID**: Links to buildings table
- **Building Name**: Human-readable name
- **Unit ID**: Links to units table
- **Unit Number**: Human-readable unit number

### **Leaseholder Context**
- **Leaseholder ID**: Links to leaseholders table
- **Leaseholder Name**: Human-readable name
- **Email**: Recipient email address

### **Email Type Detection**
- **Is Reply**: Detects "Re:" in subject
- **Is Forward**: Detects "Fw:" or "Fwd:" in subject
- **Source**: Marked as "outlook_addin"

## 🔍 **Linking Logic**

### **1. Primary Matching (Email Address)**
```sql
-- Find leaseholder by email
SELECT l.id, l.name, u.id as unit_id, u.building_id, b.name as building_name
FROM leaseholders l
JOIN units u ON l.id = u.leaseholder_id
JOIN buildings b ON u.building_id = b.id
WHERE l.email = 'recipient@example.com';
```

### **2. Secondary Matching (Content Analysis)**
```sql
-- Find building by name/address in email content
SELECT id, name, address
FROM buildings
WHERE name ILIKE '%building_name%' 
   OR address ILIKE '%building_address%';
```

### **3. Fallback Handling**
- If no match found, logs with "Unknown" building/leaseholder
- Maintains email record for future linking
- Allows manual correction later

## 📈 **Views and Analytics**

### **outlook_email_history View**
```sql
-- Complete view of all Outlook add-in emails
SELECT 
  subject, recipient_email, building_name, leaseholder_name,
  sent_at, is_reply, is_forward, user_name
FROM outlook_email_history
ORDER BY sent_at DESC;
```

### **Building Email Statistics**
```sql
-- Get email stats for a specific building
SELECT * FROM get_building_email_stats('building-uuid-here');
```

### **Sample Queries**
```sql
-- All emails to a specific leaseholder
SELECT * FROM communications_log 
WHERE leaseholder_id = 'leaseholder-uuid' 
  AND direction = 'outgoing';

-- All emails from a specific building
SELECT * FROM communications_log 
WHERE building_id = 'building-uuid' 
  AND direction = 'outgoing';

-- Reply vs. Forward statistics
SELECT 
  COUNT(*) as total_emails,
  COUNT(CASE WHEN is_reply THEN 1 END) as replies,
  COUNT(CASE WHEN is_forward THEN 1 END) as forwards
FROM communications_log 
WHERE source = 'outlook_addin';
```

## 🛡️ **Security & Privacy**

### **Row Level Security (RLS)**
- Users can only see their own communications
- Building managers see building-specific communications
- Admin users see all communications

### **Data Validation**
- Email addresses validated before logging
- Content sanitized to prevent injection
- User authentication required for all operations

### **Audit Trail**
- All email logs include user ID
- Timestamps for creation and updates
- Source tracking for compliance

## 🔧 **Setup Instructions**

### **1. Run Database Migration**
```bash
# In your Supabase dashboard, run:
supabase/migrations/20250117000002_enhance_communications_log_for_outlook.sql
```

### **2. Deploy API Endpoint**
The `/api/communications/log-outgoing` endpoint is automatically created.

### **3. Update Add-in**
The add-in automatically includes email capture functionality.

### **4. Test the System**
1. Send an email via Outlook add-in
2. Check communications log for new entry
3. Verify building/leaseholder linking
4. Review analytics and reports

## 📱 **User Experience**

### **For End Users**
- **Transparent**: No additional steps required
- **Automatic**: All emails logged automatically
- **Accurate**: Smart building/leaseholder linking
- **Fast**: No performance impact on email sending

### **For Property Managers**
- **Complete Visibility**: See all email communications
- **Building Context**: Understand communication patterns
- **Leaseholder History**: Track communication history
- **Compliance**: Maintain communication records

### **For Administrators**
- **System Overview**: Monitor email activity
- **Analytics**: Track communication patterns
- **Audit Trail**: Maintain compliance records
- **Performance**: Monitor system health

## 🚨 **Troubleshooting**

### **Common Issues**

**Emails not being logged**
- Check add-in console for errors
- Verify API endpoint is accessible
- Check user authentication

**Building/leaseholder not linking**
- Verify email addresses in database
- Check building names match exactly
- Review AI extraction logic

**Performance issues**
- Check database indexes
- Monitor API response times
- Review email content size

### **Debug Commands**
```javascript
// Check email capture status
console.log('Email capture active:', !!Office.context.mailbox);

// Test API connectivity
fetch('/api/communications/log-outgoing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true })
}).then(r => console.log('API Status:', r.status));
```

## 🎉 **Benefits**

### **Automatic Compliance**
- All emails automatically logged
- Building/leaseholder context preserved
- Audit trail maintained

### **Complete Visibility**
- See all email communications
- Track communication patterns
- Monitor building activity

### **Smart Linking**
- AI-powered building detection
- Automatic leaseholder matching
- Context-aware logging

### **Zero Maintenance**
- Works automatically
- No user intervention required
- Self-maintaining system

The Email Logging System provides complete transparency into all email communications while maintaining the user experience and ensuring compliance with property management requirements.
