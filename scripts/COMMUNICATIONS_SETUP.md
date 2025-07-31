# Communications Hub Setup Guide

## 🎯 Overview
The Communications Hub provides a centralized interface for managing all leaseholder communications including calls, emails, and letters. It features six main action tiles with full functionality and data safety.

## ✅ Features Implemented

### 📞 Call a Leaseholder
- Search leaseholders by name, email, phone, or unit number
- Shows phone availability status
- Logs calls automatically
- Opens phone dialer for available numbers
- Disables action for leaseholders without phone numbers

### ✉️ Send an Email
- Individual email sending to leaseholders
- AI-powered email drafting (integrated with existing system)
- Validates email addresses before sending
- Logs all email communications
- Shows email availability status

### 📄 Send a Letter
- Letter template system
- PDF generation capability
- Logs letter communications
- Bulk letter generation for buildings

### 🏢 Email All Leaseholders in a Building
- Bulk email functionality
- Fetches all leaseholders with valid emails
- Individual email sending with logging
- Progress tracking and success/failure reporting

### 🏢 Send Letter to All Leaseholders in a Building
- Bulk letter generation
- Template-based letter creation
- PDF export functionality
- Communication logging

### 📜 View Communications Log
- Complete communication history
- Filter by type, leaseholder, building, date
- Detailed view of each communication
- Export capabilities

## 🔧 Database Setup

### 1. Create communications_log table
Run the SQL script in your Supabase dashboard:

```sql
-- Execute scripts/create_communications_log.sql
```

This creates:
- `communications_log` table with proper schema
- Indexes for performance
- Row Level Security (RLS) policies
- Sample data for testing

### 2. Verify existing tables
Ensure these tables exist and have data:
- `leaseholders` (with name, email, phone fields)
- `buildings` (with name, address fields)
- `units` (linking leaseholders to buildings)

## 🚀 API Routes

### `/api/communications/log`
- **POST**: Log new communications
- **GET**: Fetch communication history with filters

### `/api/communications/send`
- **POST**: Send emails (individual or bulk)
- **GET**: Fetch leaseholders for email sending

## 🎨 UI Components

### Main Components
- `CommunicationsHub.tsx` - Main hub interface
- `CallLeaseholderModal.tsx` - Phone call interface
- `LeaseholderSearchModal.tsx` - Leaseholder search
- `BuildingSearchModal.tsx` - Building selection
- `EmailDraftModal.tsx` - Email composition
- `LetterDraftModal.tsx` - Letter composition
- `CommunicationsLogModal.tsx` - Communication history

### Styling Features
- Clean square action tiles with hover effects
- Gradient backgrounds and soft shadows
- Responsive grid layout (3 columns on desktop)
- Consistent BlocIQ branding
- Loading states and error handling

## 🔒 Data Safety Features

### No Hallucinated Data
- Only uses real data from Supabase tables
- Validates contact information before actions
- Disables actions when contact info is missing
- Shows clear status indicators

### Contact Validation
- Email format validation
- Phone number availability checks
- Building and unit relationship validation
- Graceful fallbacks for missing data

## 🧪 Testing

### 1. Run Setup Script
```bash
node scripts/setup_communications.js
```

### 2. Test Each Feature
1. **Call Feature**: Search for leaseholders and test phone calls
2. **Email Feature**: Send individual emails to leaseholders
3. **Letter Feature**: Generate and send letters
4. **Bulk Features**: Test building-wide communications
5. **Log Feature**: View communication history

### 3. Verify Data Safety
- Test with leaseholders missing contact info
- Verify no fake data is displayed
- Check that actions are properly disabled

## 📊 Expected Results

After setup, you should see:
- ✅ Six action tiles with proper styling
- ✅ Working search and selection modals
- ✅ Email sending with validation
- ✅ Call logging and phone dialer integration
- ✅ Communication history tracking
- ✅ Proper error handling and user feedback

## 🚨 Troubleshooting

### Common Issues

1. **"communications_log table does not exist"**
   - Run the SQL script in Supabase dashboard
   - Check that the script executed successfully

2. **"No leaseholders found"**
   - Verify leaseholders table has data
   - Check that leaseholders have proper relationships to units/buildings

3. **"API endpoint not found"**
   - Ensure the development server is running
   - Check that API routes are properly deployed

4. **"Authentication failed"**
   - Verify user is logged in
   - Check Supabase authentication setup

### Debug Steps
1. Check browser console for errors
2. Verify Supabase connection
3. Test API endpoints directly
4. Check database permissions and RLS policies

## 🔗 Useful Links
- Supabase Dashboard: https://supabase.com/dashboard
- Communications Hub: http://localhost:3000/communications
- API Documentation: Check individual route files
- Database Schema: See SQL scripts in `/scripts` folder

## 📝 Next Steps
1. Execute the SQL script to create the communications_log table
2. Run the setup script to verify everything is working
3. Test each communication feature
4. Customize templates and styling as needed
5. Add additional features like email templates or advanced filtering

The Communications Hub is now fully functional and ready for use! 