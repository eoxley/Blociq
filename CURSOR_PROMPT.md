# 🚀 BlocIQ AI-Powered Template System - Complete Cursor Prompt

## Project Overview
Build a comprehensive AI-powered document template system for BlocIQ, a UK leasehold block management platform. The system should enable users to upload .docx templates, generate documents with dynamic data, and leverage AI for template rewriting, searching, and creation.

## Tech Stack
- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with clean, modern UI
- **Backend**: Supabase (PostgreSQL + Storage)
- **AI**: OpenAI GPT-4 + Embeddings
- **Document Processing**: PizZip + Docxtemplater

## Core Features to Implement

### 1. Database Schema (Supabase)
```sql
-- Enhanced templates table with AI features
CREATE TABLE templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('welcome_letter', 'notice', 'form', 'invoice', 'legal_notice', 'section_20')),
    description TEXT,
    storage_path VARCHAR(500) NOT NULL,
    content_text TEXT, -- Extracted text for AI processing
    placeholders TEXT[], -- Available placeholders
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template embeddings for semantic search
CREATE TABLE template_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    embedding VECTOR(1536), -- OpenAI embedding vector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced generated documents
CREATE TABLE generated_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    filled_by VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    placeholder_data JSONB, -- Store the data used
    ai_generated BOOLEAN DEFAULT FALSE, -- Track if AI was used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. API Endpoints

#### `/api/generate-doc` - Document Generation
```typescript
// POST endpoint for generating documents from templates
// Features: placeholder replacement, file storage, AI tracking
```

#### `/api/ask-ai` - AI Assistant
```typescript
// POST endpoint for AI-powered template assistance
// Actions: rewrite, search, create_new
// Context: building data, template content, placeholders
```

#### `/api/generate-embeddings` - Semantic Search
```typescript
// POST/GET endpoints for generating and managing embeddings
// Uses OpenAI text-embedding-3-small model
```

#### `/api/search-templates` - Template Search
```typescript
// POST/GET endpoints for semantic and text-based search
// Vector similarity search with fallback to text search
```

### 3. Frontend Routes & Components

#### `/communications/templates` - Template Listing
**Requirements:**
- Clean, modern UI with Tailwind CSS
- Search by name, description, or content
- Filter by template type with visual badges
- Template content preview (expandable)
- Placeholder visualization with badges
- AI assistant integration
- Responsive grid layout

**Styling Guidelines:**
```typescript
// Use consistent color scheme
const colors = {
  primary: 'bg-blue-600 hover:bg-blue-700',
  secondary: 'bg-gray-100 hover:bg-gray-200',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800'
};

// Card styling
const cardStyle = "bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200";

// Form styling
const inputStyle = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";
```

#### `/communications/templates/[id]` - Template Generation
**Requirements:**
- Split-pane layout: template info + form + AI panel
- Dynamic form based on template placeholders
- Building selection with auto-fill
- AI assistant panel with three modes:
  - Rewrite: Modify existing template
  - Search: Find relevant templates
  - Create: Generate new template
- Real-time AI responses
- Document generation and download
- Clean, professional form layout

**Form Layout Example:**
```typescript
// Clean form structure
<div className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Field Label
      </label>
      <input className={inputStyle} />
    </div>
  </div>
</div>
```

#### `/communications/log` - Document History
**Requirements:**
- Advanced filtering (building, type, AI-generated)
- Statistics dashboard
- Document preview with placeholder data
- Download and delete actions
- Clean table/card layout

### 4. AI Integration Features

#### Template Rewriting
```typescript
// AI prompt structure
const systemPrompt = `You are a professional block manager drafting legally compliant letters and notices for UK leasehold properties.`;

const userPrompt = `Please rewrite the following template content to address this specific request: "${prompt}"

Template Content: ${templateData.content_text}
Available Placeholders: ${templateData.placeholders?.join(', ')}
Building Context: ${JSON.stringify(contextData, null, 2)}

Please provide a rewritten version that:
1. Maintains the same structure and placeholders
2. Addresses the specific request
3. Remains legally compliant
4. Is professional and clear`;
```

#### Semantic Search
```typescript
// Generate embeddings for semantic search
const embeddingResponse = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: template.content_text,
  encoding_format: "float"
});
```

### 5. UI/UX Requirements

#### Design System
- **Colors**: Blue primary (#2563eb), gray secondary, semantic colors
- **Typography**: Clean, readable fonts with proper hierarchy
- **Spacing**: Consistent 4px grid system
- **Components**: Reusable cards, buttons, forms, badges
- **Responsive**: Mobile-first design with breakpoints

#### Form Design
```typescript
// Clean form component structure
const FormField = ({ label, children, required = false }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    <p className="text-xs text-gray-500">Help text here</p>
  </div>
);
```

#### Loading States
```typescript
// Consistent loading indicators
const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
);
```

### 6. Error Handling & Validation

#### Form Validation
```typescript
// Client-side validation with Tailwind styling
const [errors, setErrors] = useState({});

const validateForm = (data) => {
  const newErrors = {};
  if (!data.leaseholder_name) {
    newErrors.leaseholder_name = 'Leaseholder name is required';
  }
  return newErrors;
};
```

#### API Error Handling
```typescript
// Consistent error handling
try {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  
  return await response.json();
} catch (error) {
  console.error('API Error:', error);
  toast.error(error.message || 'Something went wrong');
}
```

### 7. File Structure
```
app/
├── api/
│   ├── generate-doc/
│   │   └── route.ts
│   ├── ask-ai/
│   │   └── route.ts
│   ├── generate-embeddings/
│   │   └── route.ts
│   └── search-templates/
│       └── route.ts
├── communications/
│   ├── templates/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   └── log/
│       └── page.tsx
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── badge.tsx
│   └── TemplateCard.tsx
└── lib/
    ├── supabase.ts
    ├── openai.ts
    └── utils.ts
```

### 8. Key Implementation Details

#### Document Processing
```typescript
// Placeholder replacement utility
export async function replacePlaceholdersInDocx(buffer: Blob, data: Record<string, string>): Promise<Blob> {
  const arrayBuffer = await buffer.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.setData(data);
  doc.render();
  const output = doc.getZip().generate({ type: 'uint8array' });
  return new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
```

#### AI Context Building
```typescript
// Rich context for AI
const buildAIContext = async (buildingId, templateId) => {
  const context = {};
  
  if (buildingId) {
    const building = await fetchBuilding(buildingId);
    context.building = building;
  }
  
  if (templateId) {
    const template = await fetchTemplate(templateId);
    context.template = template;
  }
  
  return context;
};
```

### 9. Production Considerations

#### Security
- Row Level Security (RLS) on all tables
- API key management
- File upload validation
- XSS protection

#### Performance
- Lazy loading for large lists
- Debounced search
- Optimistic updates
- Error boundaries

#### Monitoring
- Error tracking
- Performance monitoring
- Usage analytics
- AI cost tracking

## Implementation Checklist

- [ ] Set up database schema with RLS
- [ ] Create API endpoints with proper error handling
- [ ] Build responsive UI components with Tailwind
- [ ] Implement AI integration with OpenAI
- [ ] Add form validation and error states
- [ ] Create loading states and optimistic updates
- [ ] Add file upload and storage functionality
- [ ] Implement semantic search with embeddings
- [ ] Add document generation and download
- [ ] Create comprehensive error handling
- [ ] Add responsive design for mobile
- [ ] Implement proper TypeScript types
- [ ] Add comprehensive testing
- [ ] Create documentation and examples

## Success Criteria

✅ **Functional Requirements**
- Users can upload .docx templates
- AI can rewrite existing templates
- Semantic search finds relevant templates
- Documents generate with placeholder replacement
- All forms have clean, professional layouts

✅ **Technical Requirements**
- Clean, responsive Tailwind CSS styling
- Proper TypeScript implementation
- Comprehensive error handling
- Production-ready security
- Optimized performance

✅ **User Experience**
- Intuitive, modern interface
- Fast, responsive interactions
- Clear feedback and loading states
- Accessible design
- Mobile-friendly layout

This prompt provides everything needed to build a complete, production-ready AI-powered template system for BlocIQ with clean Tailwind styling and professional form layouts. 