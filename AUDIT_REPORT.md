# BlocIQ Codebase Audit Report
## Orphaned UI Features & Broken API References

### 🔍 Audit Summary
This report identifies UI components, pages, buttons, and features that exist visually but lack proper backend support, API endpoints, or contain placeholder/test data.

---

## ❌ 1. Unlinked Components

### Components with No Usage
- **`components/GlobalNavigation.tsx`** - Returns `null`, imported but unused
- **`components/ConditionalFloatingButtons.tsx`** - Imported in layout but potentially unused
- **`components/MailboxWidget.tsx`** - No imports found
- **`components/UnitDetailHeader.tsx`** - No imports found

### Components with Empty Implementations
- **`components/GlobalNavigation.tsx`** - Returns `null` with comment "Component removed - no longer needed"

---

## 🚧 2. "Coming Soon" Features

### UI Elements Marked as Coming Soon
- **Sidebar Navigation** (`components/sidebar.tsx:100-103`)
  - Coming Soon section with placeholder features
- **Email Draft Assistant** (`components/ui/EmailDraftAssistant.tsx:120`)
  - Tag feature marked as "Coming Soon"
- **Inbox AI Action Bar** (`app/inbox/components/AIActionBar.tsx:260`)
  - Tag functionality marked as "Coming Soon"
- **Compliance Reports** (`app/compliance/reports/ComplianceReportsClient.tsx:440`)
  - AI Summary marked as "Coming Soon"
- **Buildings Client** (`app/buildings/BuildingsClient.tsx:303,449`)
  - Multiple features marked as "🚧 Coming Soon"
- **Building Detail Client** (`app/buildings/[buildingId]/BuildingDetailClient.tsx:349,365,407`)
  - Multiple sections marked as "Coming Soon"
- **Compliance Setup** (`app/compliance/buildings/[buildingId]/page.tsx:526`)
  - Custom Items marked as "Coming Soon"
- **Account Page** (`app/account/page.tsx:28`)
  - Features marked as "Coming soon"

---

## 🔗 3. Broken API References

### Missing API Endpoints
- **`/api/save-draft`** - Referenced in `components/ReplyEditor.tsx:30`
  - Used for saving email drafts but endpoint doesn't exist
- **`/api/dashboard/stats`** - Referenced in `app/dashboard/DashboardInner.tsx:48`
  - Used for dashboard statistics but endpoint doesn't exist
- **`/api/ocr`** - Referenced in `app/api/upload-and-analyse/route.ts:143`
  - Exists in `pages/api/ocr.ts` but using old Pages Router format

### API Endpoints with TODO Comments
- **`/api/send-communication`** (`app/api/send-communication/route.ts:72`)
  - TODO: Integrate with email service (Outlook SMTP/Graph API)
- **`/api/save-emails`** (`app/api/save-emails/route.ts:11`)
  - TODO: Save email to database (e.g., Supabase)

---

## 📊 4. Placeholder UI

### Hardcoded Values
- **Buildings Page** (`app/buildings/page.tsx:114`)
  - Debug message: "No buildings found in database. Using demo data"
- **Send Email Form** (`components/SendEmailForm.tsx:77`)
  - TODO: Get actual user ID (currently hardcoded as 'current_user')
- **Major Works Upload** (`app/major-works/[id]/upload/page.tsx:171`)
  - TODO: Get actual user ID (currently hardcoded as 'current_user')
- **Leases Upload** (`app/leases/upload/page.tsx:29`)
  - TODO: add actual upload logic here

### Static Counters/Data
- **AI Documents Page** (`app/ai-documents/page.tsx`)
  - Hardcoded stats: 24 Documents, 18 Analyzed, 156 Chat Messages, 12 AI Insights
- **Buildings Client** (`app/buildings/BuildingsClient.tsx`)
  - Demo data fallback when no real buildings found

---

## 🗄️ 5. Orphaned Supabase Queries

### Tables with Test Data
- **`building_todos`** - Referenced extensively but contains test data
  - Used in: `app/api/cleanup-test-data/route.ts`, `scripts/cleanupTestData.ts`
  - Test data cleanup scripts available
- **`major_works`** - Contains mock data
  - Multiple SQL scripts for inserting mock data
  - Referenced in: `scripts/createMockMajorWorksData.sql`

### Tables with Placeholder Data
- **`compliance_docs`** - Contains test data
- **`property_events`** - Contains test data
- **`incoming_emails`** - Contains test data

---

## 🧪 6. Test/Demo Pages

### Unused Test Pages
- **`app/test/daily-summary/`** - Test page for daily summary
- **`app/test/sent-emails/`** - Test page for sent emails
- **`app/test/create-event/`** - Test page for event creation
- **No navigation links** to these test pages found

---

## 🔧 7. Incomplete Implementations

### Components with TODO Comments
- **Compliance Tracker** (`app/buildings/[buildingId]/compliance/tracker/ComplianceTrackerClient.tsx:42,47`)
  - TODO: Implement status update logic
  - TODO: Implement document upload logic

### Features with Placeholder Logic
- **Email Draft Generation** - Multiple components with placeholder implementations
- **Document Upload** - Some upload endpoints return placeholder responses
- **AI Classification** - Some AI features return mock data

---

## 📋 8. Recommendations

### Immediate Actions
1. **Remove unused components**: `GlobalNavigation`, `ConditionalFloatingButtons`, `MailboxWidget`, `UnitDetailHeader`
2. **Implement missing API endpoints**: `/api/save-draft`, `/api/dashboard/stats`
3. **Migrate OCR endpoint**: Move from `pages/api/ocr.ts` to `app/api/ocr/route.ts`
4. **Clean up test data**: Use existing cleanup scripts to remove test data

### Medium Priority
1. **Implement TODO features**: Complete placeholder implementations
2. **Replace hardcoded values**: Implement proper user ID handling
3. **Add proper error handling**: For missing API endpoints
4. **Remove "Coming Soon" sections**: Or implement the features

### Long Term
1. **Audit all API calls**: Ensure all frontend API calls have corresponding endpoints
2. **Implement proper data validation**: For all form submissions
3. **Add comprehensive testing**: For all implemented features
4. **Document API endpoints**: Create API documentation

---

## 📈 Impact Assessment

### High Impact Issues
- Missing `/api/save-draft` endpoint breaks email draft functionality
- Missing `/api/dashboard/stats` breaks dashboard statistics
- Test data in production tables affects data integrity

### Medium Impact Issues
- "Coming Soon" features create user confusion
- Hardcoded user IDs affect multi-user functionality
- Unused components increase bundle size

### Low Impact Issues
- Unused test pages don't affect production
- Placeholder UI elements can be easily replaced
- Debug messages should be removed in production

---

## ✅ Verification Checklist

- [ ] Remove unused components
- [ ] Implement missing API endpoints
- [ ] Migrate OCR endpoint to App Router
- [ ] Clean up test data from database
- [ ] Replace hardcoded values with proper implementations
- [ ] Remove or implement "Coming Soon" features
- [ ] Add proper error handling for missing endpoints
- [ ] Remove debug messages and console logs
- [ ] Update documentation for implemented features
- [ ] Test all API endpoints for proper functionality 