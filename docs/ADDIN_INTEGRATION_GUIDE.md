# 🚀 BlocIQ Add-in Integration Guide

## Overview
This guide explains how to integrate the cleaned-up BlocIQ add-in components into your main Outlook interface. The add-in now has a clean, focused design with separate components for different functionalities.

## 🎯 **What's Been Created**

### **1. Clean Sidebar (`taskpane.html` + `taskpane.js`)**
- **Purpose**: Pure chat interface like Ask BlocIQ
- **Features**: 
  - Clean, modern design
  - Full database access
  - Contextual responses
  - Email context awareness
- **Location**: `public/addin/taskpane.html`

### **2. AI Reply Buttons (`ai-reply-buttons.html`)**
- **Purpose**: Generate AI replies in compose mode
- **Features**:
  - Reply, Reply All, Forward buttons
  - Only shows when composing emails
  - Integrates with Ask BlocIQ API
- **Location**: `public/addin/ai-reply-buttons.html`

### **3. AI Triage Modal (`ai-triage-modal.html`)**
- **Purpose**: Batch email triage functionality
- **Features**:
  - Analyze multiple emails
  - Categorize by priority
  - Generate response drafts
- **Location**: `public/addin/ai-triage-modal.html`

## 🔧 **Integration Steps**

### **Step 1: Main Sidebar (Already Done)**
The main sidebar is now clean and focused. Users can:
- Ask questions about property management
- Get contextual responses with building data
- Access industry knowledge automatically

### **Step 2: Integrate AI Reply Buttons**
The AI Reply buttons need to be injected into the main Outlook compose interface.

#### **Option A: Taskpane Integration**
Add this to your main Outlook compose taskpane:

```html
<!-- In your main compose interface -->
<div id="aiReplySection" style="display: none;">
  <iframe 
    src="https://www.blociq.co.uk/addin/ai-reply-buttons.html"
    width="100%" 
    height="80" 
    frameborder="0"
    scrolling="no">
  </iframe>
</div>
```

#### **Option B: Direct HTML Injection**
Copy the AI Reply buttons HTML directly into your compose interface:

```html
<div class="ai-reply-container">
  <span class="ai-reply-label">🤖 AI Reply</span>
  
  <button class="ai-reply-button primary" onclick="generateAIReply('reply')">
    📧 Reply
  </button>
  
  <button class="ai-reply-button primary" onclick="generateAIReply('replyAll')">
    📬 Reply All
  </button>
  
  <button class="ai-reply-button" onclick="generateAIReply('forward')">
    📤 Forward
  </button>
  
  <span class="ai-reply-status">Ready</span>
</div>
```

### **Step 3: Integrate AI Triage Modal**
The AI Triage modal can be integrated into your main inbox interface.

#### **Option A: Inbox Button**
Add a button to your main inbox that opens the triage modal:

```html
<button onclick="openTriageModal()" class="triage-button">
  🤖 AI Triage Inbox
</button>

<!-- Include the modal HTML -->
<div id="triageModalContainer"></div>
```

#### **Option B: Inbox Integration**
Copy the triage modal HTML directly into your inbox interface.

## 📱 **How It Works**

### **Main Sidebar (Clean Chat)**
1. User opens add-in
2. Sees clean chat interface
3. Types property management questions
4. Gets contextual responses with building data
5. Full access to BlocIQ database

### **AI Reply Buttons (Compose Mode)**
1. User starts composing email (reply/forward)
2. AI Reply buttons appear automatically
3. User clicks button (Reply, Reply All, Forward)
4. System generates professional response
5. Response inserted into email body

### **AI Triage Modal (Inbox)**
1. User clicks "AI Triage Inbox" button
2. Modal opens with triage options
3. System analyzes all unread emails
4. Categorizes by priority and type
5. Generates response drafts
6. Results displayed in organized format

## 🎨 **Styling Integration**

### **CSS Variables**
The components use BlocIQ brand colors:

```css
:root {
  --blociq-primary: #667eea;
  --blociq-secondary: #764ba2;
  --blociq-accent: #f093fb;
  --blociq-success: #4facfe;
  --blociq-warning: #43e97b;
  --blociq-error: #fa709a;
}
```

### **Responsive Design**
All components are responsive and work on:
- Desktop Outlook
- Outlook Web
- Mobile Outlook
- Different screen sizes

## 🔌 **API Integration**

### **Ask BlocIQ API**
All components use your existing `/api/ask-ai` endpoint:

```javascript
const response = await fetch('https://www.blociq.co.uk/api/ask-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: userQuestion,
    building_id: buildingContext?.id,
    contextType: 'email_reply',
    emailContext: emailData,
    is_outlook_addin: true,
    includeIndustryKnowledge: true,
  }),
});
```

### **Required Endpoints**
- `/api/ask-ai` - Main AI responses
- `/api/inbox/emails` - Get inbox emails
- `/api/ai-extract-building` - Extract building context

## 🚀 **Deployment**

### **1. Update Add-in Files**
Replace your current add-in files with the new ones:
- `public/addin/taskpane.html` ✅ (Clean chat)
- `public/addin/taskpane.js` ✅ (Clean functionality)
- `public/addin/ai-reply-buttons.html` ✅ (AI Reply buttons)
- `public/addin/ai-triage-modal.html` ✅ (AI Triage modal)

### **2. Deploy to Vercel**
```bash
git add .
git commit -m "Clean up BlocIQ add-in - focused chat interface"
git push
```

### **3. Test in Outlook**
1. Open Outlook
2. Go to Get Add-ins → My Add-ins
3. Update your add-in
4. Test the clean chat interface
5. Test AI Reply in compose mode
6. Test AI Triage in inbox

## 🎯 **User Experience**

### **Before (Cluttered)**
- Sidebar full of buttons
- Confusing interface
- AI Reply buttons always visible
- Triage functionality in sidebar

### **After (Clean)**
- **Sidebar**: Pure chat interface
- **Compose Mode**: AI Reply buttons appear automatically
- **Inbox**: AI Triage available via button/modal
- **Focus**: Each component has a clear purpose

## 🔧 **Customization Options**

### **Colors and Branding**
Update CSS variables in each component to match your brand:

```css
:root {
  --blociq-primary: #your-primary-color;
  --blociq-secondary: #your-secondary-color;
  /* ... other colors */
}
```

### **Button Placement**
- AI Reply buttons can be placed anywhere in compose interface
- AI Triage button can be placed in inbox toolbar, email actions, etc.
- Main sidebar remains clean and focused

### **Functionality**
- Add more AI Reply types (e.g., "AI Summary", "AI Action Items")
- Customize triage categories and priorities
- Add more context types for better AI responses

## 📋 **Testing Checklist**

### **Main Sidebar**
- [ ] Clean chat interface loads
- [ ] User can type questions
- [ ] Responses include building context
- [ ] Industry knowledge is used
- [ ] No extra buttons visible

### **AI Reply Buttons**
- [ ] Buttons appear in compose mode
- [ ] Reply generation works
- [ ] Response inserted into email
- [ ] Loading states work
- [ ] Error handling works

### **AI Triage Modal**
- [ ] Modal opens from inbox
- [ ] Email analysis works
- [ ] Results displayed properly
- [ ] Progress tracking works
- [ ] Previous results load

## 🆘 **Troubleshooting**

### **Common Issues**

**AI Reply buttons not showing**
- Check if in compose mode
- Verify HTML injection location
- Check console for errors

**Triage modal not working**
- Verify inbox API endpoint
- Check authentication
- Review console errors

**Chat not responding**
- Verify Ask BlocIQ API
- Check network requests
- Review authentication

### **Debug Commands**
```javascript
// Test API connectivity
fetch('https://www.blociq.co.uk/api/ask-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'test' })
}).then(r => console.log('API Status:', r.status));

// Check Office context
console.log('Office Context:', Office.context.mailbox.item);
```

## 🎉 **Benefits**

### **For Users**
- **Clean Interface**: No more cluttered sidebar
- **Contextual Help**: AI understands email context
- **Professional Replies**: AI-generated responses
- **Efficient Triage**: Batch email processing

### **For Developers**
- **Modular Design**: Easy to maintain and update
- **Clear Separation**: Each component has a purpose
- **API Consistency**: Uses existing endpoints
- **Easy Integration**: Simple HTML injection

The add-in is now clean, focused, and professional while maintaining all the powerful AI functionality your users need!
