# 📧 BlocIQ Mail Merge Setup Guide

This guide will help you set up the complete mail merge system for production use.

## ✅ Final Requirements Completed

### 1. 🗃️ Database Schema
- **Status**: ✅ Complete
- **Files**: `supabase/migrations/20240916_communication_templates.sql`
- **Action Required**: Apply the migration to your Supabase database

```sql
-- Run this in your Supabase SQL editor:
-- The migration creates the communication_templates table with proper RLS policies
```

### 2. 📝 Template Upload System
- **Status**: ✅ Complete
- **Files**: `app/(dashboard)/communications/templates/upload/page.tsx`
- **Features**: Full template creation UI with placeholder management

### 3. 📧 Email Service Integration
- **Status**: ✅ Complete
- **Files**: `lib/services/email-service.ts`
- **Supports**: SendGrid, SMTP, Console (dev mode)

### 4. 🔄 End-to-End Mail Merge
- **Status**: ✅ Complete
- **API**: `/api/comms/send-emails` with real email sending
- **Features**: Template rendering, placeholder replacement, email logging

## 🚀 Production Setup Steps

### Step 1: Database Migration
Apply the communication templates migration:

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run the migration file: `supabase/migrations/20240916_communication_templates.sql`

### Step 2: Email Service Configuration

#### Option A: SendGrid (Recommended)
1. Sign up for SendGrid account
2. Create API key with Mail Send permissions
3. Add to your `.env.local`:
```env
SENDGRID_API_KEY=SG.your-api-key-here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Company Name
```

#### Option B: SMTP (Alternative)
1. Get SMTP credentials from your email provider
2. Add to your `.env.local`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_SECURE=false
```

### Step 3: Create Sample Templates
1. Visit `/communications/templates`
2. Click "Create Sample Templates"
3. Or manually create templates using the upload form

### Step 4: Test Mail Merge
Run the comprehensive test:
```bash
curl -X POST http://localhost:3000/api/test-mail-merge
```

## 🧪 Testing the System

### Test Endpoints Available:
- `GET /api/test-mail-merge` - Test information
- `POST /api/test-mail-merge` - Full system test
- `GET /api/communications/templates` - List templates
- `POST /api/comms/seed-templates` - Create sample templates

### Manual Testing Steps:
1. **Create Templates**: Use `/communications/templates/upload`
2. **Load Recipients**: Select a building with leaseholders who have emails
3. **Preview Mail Merge**: Use the mail merge modal in communications page
4. **Send Test Campaign**: Enable test mode for safe testing
5. **Check Logs**: Verify emails appear in communications log

## 📊 System Architecture

### Data Flow:
```
Templates (DB) → Recipients (DB) → Render → Email Service → Communications Log
     ↓              ↓                ↓           ↓              ↓
Template Mgmt → Building Select → Placeholders → SendGrid → Activity Tracking
```

### Key Components:
- **Templates**: `communication_templates` table
- **Recipients**: Auto-loaded from `leaseholders` table
- **Email Service**: `lib/services/email-service.ts`
- **Mail Merge API**: `/api/comms/send-emails`
- **UI Components**: `MailMergeModal`, Template management
- **Logging**: `communications_log` table via `communications-logger.ts`

## ⚙️ Configuration Options

### Email Service Features:
- ✅ **Multi-provider support** (SendGrid, SMTP, Console)
- ✅ **Test mode** for safe testing
- ✅ **Automatic logging** of all sent emails
- ✅ **HTML and text** email versions
- ✅ **Bulk sending** with individual personalization
- ✅ **Error handling** and retry logic

### Template Features:
- ✅ **Placeholder system** (`{{recipient.name}}`, `{{building.name}}`, etc.)
- ✅ **HTML templates** with rich formatting
- ✅ **Category organization** (welcome letters, notices, etc.)
- ✅ **Template preview** and validation
- ✅ **Custom placeholder** creation

### Mail Merge Features:
- ✅ **Building-wide campaigns**
- ✅ **Individual personalization** per recipient
- ✅ **Preview before sending**
- ✅ **Test mode** for safe testing
- ✅ **Success/failure tracking**
- ✅ **Communications logging** for compliance

## 📈 Production Readiness

### ✅ Ready for Production:
- Database schema complete
- Email service integration working
- Template management system functional
- Mail merge API endpoints operational
- Communications logging active
- Error handling and validation in place
- Test mode for safe deployment

### 🔧 Optional Enhancements:
- Email queue for large campaigns
- Advanced template editor (WYSIWYG)
- Email analytics and open tracking
- Automated campaigns and scheduling
- A/B testing for email effectiveness

## 🎯 Usage Instructions

### For Property Managers:
1. **Create Templates**: Visit Communications → Templates → Upload Template
2. **Start Campaign**: Go to Communications page → Mail-Merge Campaign
3. **Select Building**: Choose target building for recipients
4. **Choose Template**: Pick appropriate template
5. **Preview**: Review personalized emails
6. **Send**: Execute campaign (use test mode first)

### For Developers:
- Mail merge API: `POST /api/comms/send-emails`
- Template API: `GET/POST /api/communications/templates`
- Recipients API: `GET /api/comms/recipients`
- Test suite: `POST /api/test-mail-merge`

## 🛡️ Security & Compliance

- ✅ **RLS Policies** on all database tables
- ✅ **Authentication required** for all operations
- ✅ **Communications logging** for audit trails
- ✅ **Test mode** to prevent accidental sends
- ✅ **Email validation** and error handling
- ✅ **Environment variable** protection for API keys

---

## 🎉 System Complete!

The BlocIQ mail merge system is now **production-ready** with:
- Complete database schema
- Professional template management
- Multi-provider email service
- End-to-end mail merge workflow
- Comprehensive logging and tracking

**Ready to send professional property management communications at scale!** 📧✨