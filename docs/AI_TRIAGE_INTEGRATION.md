# AI Triage Integration Guide

This document explains how to integrate the new AI triage system with your existing inbox components.

## 🚀 **What's New**

### **1. Shared Hook: `useTriageDraft`**
- **Location**: `hooks/useTriageDraft.ts`
- **Purpose**: Centralised AI draft generation with triage functionality
- **Features**: Priority classification, category detection, attachment suggestions

### **2. Shared Utilities: `replyUtils`**
- **Location**: `lib/replyUtils.ts`
- **Purpose**: Common functions for email composition
- **Features**: Recipient deduplication, subject formatting, thread quoting

### **3. Enhanced Reply Modals**
- **ReplyModal**: Updated to use new hook and utilities
- **ReplyAllModal**: New component with recipient deduplication

## 🔧 **Integration Steps**

### **Step 1: Update Your Message List Component**

Add reply buttons to your message list:

```tsx
import ReplyModal from './ReplyModal'
import ReplyAllModal from './ReplyAllModal'

// Add state variables
const [showReplyModal, setShowReplyModal] = useState(false)
const [showReplyAllModal, setShowReplyAllModal] = useState(false)
const [selectedMessage, setSelectedMessage] = useState<any>(null)

// Add handler functions
const handleReply = (message: any) => {
  setSelectedMessage(message)
  setShowReplyModal(true)
}

const handleReplyAll = (message: any) => {
  setSelectedMessage(message)
  setShowReplyAllModal(true)
}

// Add buttons in your message row
<button onClick={() => handleReply(message)}>Reply</button>
<button onClick={() => handleReplyAll(message)}>Reply All</button>

// Add modals at the bottom
{showReplyModal && (
  <ReplyModal
    isOpen={showReplyModal}
    onClose={() => setShowReplyModal(false)}
    message={selectedMessage}
    replyType="reply"
  />
)}

{showReplyAllModal && (
  <ReplyAllModal
    isOpen={showReplyAllModal}
    onClose={() => setShowReplyAllModal(false)}
    message={selectedMessage}
    ownEmails={['your-email@example.com']} // Add your email addresses
  />
)}
```

### **Step 2: Configure Your Email Addresses**

Update the `ownEmails` prop in `ReplyAllModal` to exclude your addresses from recipients:

```tsx
ownEmails={[
  'your-email@example.com',
  'your-alias@example.com'
]}
```

### **Step 3: Customise the Send Function**

Update the `handleSend` function in both modals to use your email sending logic:

```tsx
const handleSend = async () => {
  try {
    // Use your existing email sending API
    const response = await fetch('/api/your-email-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toRecipients.filter(Boolean),
        cc: ccRecipients.filter(Boolean),
        subject: subject.trim(),
        body: htmlBody.trim(),
        attachments: attachIds // Document IDs from triage
      })
    })
    
    if (response.ok) {
      reset() // Reset triage state
      onClose()
    }
  } catch (error) {
    console.error('Error sending email:', error)
  }
}
```

## 🎯 **Key Features**

### **AI Triage Results Display**
- Priority levels (P0-P4)
- Category classification (FIRE, LIFT, LEAK, etc.)
- Required actions
- SLA targets

### **Attachment Suggestions**
- AI identifies relevant documents
- Users can toggle attachments on/off
- Automatic attachment to draft emails

### **Smart Recipient Handling**
- Reply: Only sender
- Reply All: All recipients (deduplicated)
- Excludes your own email addresses

### **House Style Enforcement**
- Greeting format: "Dear [Name]"
- Sign-off: "Kind regards"
- Signature: "Property Management Team, Blociq"

## 🔍 **How It Works**

### **1. User Clicks "Generate with AI"**
- Modal calls `useTriageDraft().generate()`
- Sends email content to `/api/triage`
- AI analyses content and returns triage results

### **2. AI Triage Processing**
- Classifies email priority and category
- Identifies required actions
- Suggests relevant attachments
- Generates contextual draft reply

### **3. User Review & Edit**
- Triage results displayed as badges
- Draft reply populated in editor
- Attachment suggestions shown as toggles
- User can modify before sending

### **4. Send Email**
- Recipients deduplicated and formatted
- Subject automatically prefixed with "Re:"
- Body includes quoted thread
- Selected attachments included

## 🛠 **Customisation Options**

### **Priority Mapping**
Update `lib/ai/triage.ts` to customise priority-to-label mapping:

```tsx
function mapPriorityToLabel(priority: string): string {
  switch (priority) {
    case "P0": return "critical";     // Add your custom labels
    case "P1": return "urgent";
    case "P2": return "high";
    case "P3": return "medium";
    case "P4": return "low";
    default: return "medium";
  }
}
```

### **Category Definitions**
Update `lib/ai/triageSchema.ts` to add/remove categories:

```tsx
category: z.enum([
  "FIRE", "LIFT", "LEAK", "ELEC", "SEC", "COMP", 
  "INS", "MW", "FIN", "LEGAL", "OPS", "WASTE", 
  "KEYS", "PARK", "GEN", "CUSTOM_CATEGORY" // Add your categories
])
```

### **Attachment Types**
Update attachment kind enums in the schema:

```tsx
kind: z.enum([
  "lease_extract", "management_agreement", "insurance",
  "FRA", "EICR", "lift_contract", "s20_notice", 
  "major_works_scope", "photo", "report", "other",
  "your_custom_type" // Add your document types
])
```

## 🧪 **Testing**

### **1. Test AI Generation**
- Select an email in your inbox
- Click "Reply" or "Reply All"
- Click "Generate with AI"
- Verify triage results appear
- Check attachment suggestions

### **2. Test Recipient Handling**
- Test Reply (should only include sender)
- Test Reply All (should include all recipients, deduplicated)
- Verify your email addresses are excluded

### **3. Test Attachment Handling**
- Generate AI reply with attachment suggestions
- Toggle attachments on/off
- Verify selected attachments are included in send

## 🚨 **Troubleshooting**

### **Common Issues**

1. **AI Generation Fails**
   - Check `/api/triage` endpoint is working
   - Verify OpenAI API key is configured
   - Check browser console for errors

2. **Attachments Not Showing**
   - Verify triage results include `attachments_suggestions`
   - Check document IDs exist in your database
   - Verify attachment toggle functionality

3. **Recipients Not Deduplicating**
   - Check `ownEmails` array is populated
   - Verify `dedupeEmails` function is working
   - Test with known duplicate addresses

### **Debug Mode**

Enable debug logging in `useTriageDraft`:

```tsx
const generate = useCallback(async (p: Params) => {
  console.log('Generating triage for:', p) // Add this line
  setLoading(true)
  // ... rest of function
}, [])
```

## 📚 **Next Steps**

1. **Replace Fallback Context Helpers**: Update `lib/ai/triage.ts` with your real context functions
2. **Customise Categories**: Add/remove categories relevant to your business
3. **Enhance Attachment Handling**: Implement document resolution from Supabase
4. **Add Email Templates**: Create industry-specific reply templates
5. **Integrate with Workflow**: Connect triage results to your task management system

## 🤝 **Support**

For questions or issues:
1. Check the browser console for error messages
2. Verify all API endpoints are responding
3. Test with simple email content first
4. Check the triage schema matches your requirements

---

**Note**: This system is designed to work alongside your existing email infrastructure. It enhances rather than replaces your current functionality.
