# 🎯 Chat + LeaseClear Integration Example

## **How to Replace Your Current Ask AI Interface**

### **Current Ask AI Interface (Before):**
```jsx
// Your current basic chat interface
const AskAI = () => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  
  const handleSend = (message) => {
    setMessages(prev => [...prev, message])
  }
  
  return (
    <div className="chat-interface">
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <input 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask a question..."
      />
    </div>
  )
}
```

### **Enhanced Interface (After):**
```jsx
// Import the enhanced component
import AskAIWithLeaseAnalysis from '@/components/ask/AskAIWithLeaseAnalysis'

const EnhancedAskAI = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: "Hello! I can help you analyze lease documents and answer questions about them. Upload a PDF lease document to get started, or ask me any property management questions.",
      isBot: true,
      timestamp: new Date()
    }
  ])

  const handleSendMessage = (message) => {
    setMessages(prev => [...prev, message])
    
    // If it's a user message, you can add AI response logic here
    if (!message.isBot) {
      // Add your AI response logic
      setTimeout(() => {
        const aiResponse = {
          id: Date.now(),
          content: generateAIResponse(message.content),
          isBot: true,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiResponse])
      }, 1000)
    }
  }

  const generateAIResponse = (userMessage) => {
    // Your AI response logic here
    return `I understand you're asking about: "${userMessage}". Let me help you with that...`
  }

  return (
    <div className="h-screen">
      <AskAIWithLeaseAnalysis 
        messages={messages}
        onSendMessage={handleSendMessage}
      />
    </div>
  )
}
```

## **Complete Page Integration Example**

### **File: `app/ai-assistant/page.tsx`**
```jsx
"use client"

import React, { useState } from 'react'
import AskAIWithLeaseAnalysis from '@/components/ask/AskAIWithLeaseAnalysis'

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: "👋 Hello! I'm your AI assistant for property management and lease analysis.\n\n📋 **What I can help with:**\n• Analyze lease documents (upload PDF)\n• Answer questions about lease terms\n• Explain property management concepts\n• Help with compliance and legal queries\n\n🔄 **To get started:** Upload a lease document or ask me a question!",
      isBot: true,
      timestamp: new Date(),
      type: 'welcome'
    }
  ])

  const handleSendMessage = (message) => {
    console.log('📨 New message:', message)
    setMessages(prev => [...prev, message])
    
    // Handle different message types
    if (!message.isBot && message.type !== 'document_analysis') {
      // Generate AI response for regular text messages
      setTimeout(() => {
        const aiResponse = generateAIResponse(message.content)
        setMessages(prev => [...prev, aiResponse])
      }, 1000)
    }
  }

  const generateAIResponse = (userMessage) => {
    const responses = {
      // Lease-related keywords
      lease: "I can help you understand lease agreements! If you have a specific lease document, please upload it and I'll provide a detailed analysis. Otherwise, feel free to ask specific questions about lease terms, obligations, or rights.",
      
      rent: "Rent questions can vary widely. Are you asking about ground rent, service charges, rent reviews, or payment obligations? If you have a lease document, upload it and I can extract the specific rent terms for you.",
      
      service: "Service charges are fees paid to cover building maintenance and management. They typically include cleaning, repairs, insurance, and management fees. Upload your lease for specific details about your service charge obligations.",
      
      repair: "Repair responsibilities are usually divided between lessee (internal) and lessor/management company (structural and common areas). Upload your lease document to see the exact repair obligations.",
      
      // Default responses
      default: [
        "That's an interesting question about property management. Could you provide more specific details so I can give you a more targeted answer?",
        "I'd be happy to help with that! If you have a related document, feel free to upload it for more detailed analysis.",
        "Let me help you with that query. For the most accurate information, consider uploading any relevant lease or property documents."
      ]
    }

    // Find matching response
    const lowerMessage = userMessage.toLowerCase()
    for (const [keyword, response] of Object.entries(responses)) {
      if (keyword !== 'default' && lowerMessage.includes(keyword)) {
        return {
          id: Date.now(),
          content: response,
          isBot: true,
          timestamp: new Date()
        }
      }
    }

    // Return random default response
    const defaultResponses = responses.default
    const randomResponse = defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
    
    return {
      id: Date.now(),
      content: randomResponse,
      isBot: true,
      timestamp: new Date()
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
        <p className="text-gray-600">Lease analysis and property management support</p>
      </div>
      
      {/* Chat Interface */}
      <div className="flex-1">
        <AskAIWithLeaseAnalysis 
          messages={messages}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  )
}
```

## **Key Features of the Enhanced Interface**

### **✅ Document Upload in Chat:**
- Users can upload lease PDFs directly in the chat
- Automatic processing and LeaseClear format display
- Cache-busting to prevent document mix-ups

### **✅ Professional Lease Display:**
- Tabbed interface showing key lease details
- Property details, parties, financial terms
- Expandable sections for full analysis
- Confidence scores and metadata

### **✅ Q&A Session Integration:**
- "Start Q&A Session" button sets up questioning
- Context-aware responses about uploaded documents
- Maintains document context throughout conversation

### **✅ Enhanced UX:**
- Loading states during document processing
- Error handling for failed uploads
- Visual indicators for different message types
- File upload status indicators

## **Message Types Supported**

### **1. Regular Text Messages:**
```jsx
{
  id: 123,
  content: "What is ground rent?",
  isBot: false,
  timestamp: new Date()
}
```

### **2. Document Analysis Messages:**
```jsx
{
  id: 124,
  type: 'document_analysis',
  content: leaseAnalysisObject, // Full LeaseClear format
  isBot: true,
  timestamp: new Date()
}
```

### **3. Processing Messages:**
```jsx
{
  id: 125,
  type: 'processing',
  content: "🔄 Processing lease document: example.pdf...",
  isBot: true,
  timestamp: new Date()
}
```

### **4. Error Messages:**
```jsx
{
  id: 126,
  type: 'error',
  content: "Failed to process document: Invalid file format",
  isBot: true,
  timestamp: new Date()
}
```

## **Integration with Existing AI Backend**

If you have an existing AI API, you can enhance it:

```jsx
const callAIAPI = async (message, documentContext = null) => {
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
      context: documentContext, // Include lease analysis if available
      timestamp: new Date().toISOString()
    })
  })
  
  return await response.json()
}
```

This integration transforms your basic Ask AI chat into a sophisticated lease analysis and Q&A system! 🎉
