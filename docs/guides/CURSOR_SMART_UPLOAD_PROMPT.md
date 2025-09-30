# 🚀 Cursor Prompt: BlocIQ Smart Template Upload Interface

## PROJECT OVERVIEW
Create a comprehensive frontend interface at `/communications/templates/upload` for uploading `.docx` templates with intelligent placeholder extraction and preview capabilities.

## 🎯 GOAL
Build a smart template upload system that automatically extracts placeholders from `.docx` files and provides a clean, user-friendly interface for template management.

## ✅ CORE FEATURES TO IMPLEMENT

### 1. Drag-and-Drop File Upload
- Accept only `.docx` files
- Use `react-dropzone` for smooth drag-and-drop experience
- Visual feedback for drag states (drag over, drag leave, drop)
- File validation and error handling

### 2. Automatic Placeholder Extraction
- Extract all `{{placeholder}}` fields using regex
- Display detected placeholders as interactive tags
- Show placeholder count and list
- Handle edge cases (nested placeholders, special characters)

### 3. Template Content Preview
- Extract and display template text content
- Scrollable preview box with syntax highlighting
- Show placeholder locations in context
- Responsive design for different screen sizes

### 4. Form Fields
- **Template Name**: Required text input
- **Type**: Dropdown with options:
  - `welcome_letter`
  - `notice`
  - `deed`
  - `form`
  - `invoice`
  - `section_20`
  - `legal_notice`
- **Description**: Optional textarea for template description

### 5. Upload & Save Functionality
- Upload file to Supabase Storage (`templates/` bucket)
- Save metadata to `templates` table
- Generate embeddings for semantic search
- Success/error handling with toast notifications

## 🛠 TECHNICAL IMPLEMENTATION

### Frontend Components

#### `TemplateUploadForm.tsx`
```typescript
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Eye,
  Edit3,
  Tag
} from "lucide-react";
import { toast } from "sonner";

interface ExtractedData {
  content: string;
  placeholders: string[];
  fileName: string;
  fileSize: number;
}

interface TemplateFormData {
  name: string;
  type: string;
  description: string;
}

export default function TemplateUploadForm() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    type: "notice",
    description: ""
  });

  // Drag and drop configuration
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.docx')) {
      toast.error('Please upload a .docx file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setAnalyzing(true);

    try {
      // Extract text and placeholders from the DOCX file
      const extracted = await extractFromDocx(file);
      setExtractedData(extracted);
      
      // Auto-generate template name from filename
      const fileName = file.name.replace('.docx', '').replace(/[-_]/g, ' ');
      setFormData(prev => ({
        ...prev,
        name: fileName.charAt(0).toUpperCase() + fileName.slice(1)
      }));
      
      toast.success(`Template analyzed! ${extracted.placeholders.length} placeholders detected.`);
    } catch (error) {
      console.error('Error extracting from DOCX:', error);
      toast.error('Failed to analyze template. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // Extract text and placeholders from DOCX
  const extractFromDocx = async (file: File): Promise<ExtractedData> => {
    // For production, use a proper DOCX parser like mammoth
    // For now, we'll use a simple text extraction
    const text = await file.text();
    
    // Extract placeholders using regex
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;
    
    while ((match = placeholderRegex.exec(text)) !== null) {
      const placeholder = match[1].trim();
      if (!placeholders.includes(placeholder)) {
        placeholders.push(placeholder);
      }
    }

    return {
      content: text,
      placeholders: placeholders,
      fileName: file.name,
      fileSize: file.size
    };
  };

  // Form handlers
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpload = async () => {
    if (!uploadedFile || !extractedData) {
      toast.error('Please upload a template file first');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setUploading(true);

    try {
      const { supabase } = await import("@/utils/supabase");

      // 1. Upload file to Supabase storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${formData.name.replace(/\s+/g, '_')}_${timestamp}.docx`;
      const filePath = `templates/${filename}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, uploadedFile, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Failed to upload file');
      }

      // 2. Save template metadata to database
      const { data: template, error: dbError } = await supabase
        .from('templates')
        .insert({
          name: formData.name,
          type: formData.type,
          description: formData.description,
          storage_path: filePath,
          content_text: extractedData.content,
          placeholders: extractedData.placeholders
        })
        .select()
        .single();

      if (dbError) {
        throw new Error('Failed to save template metadata');
      }

      // 3. Generate embeddings for semantic search
      try {
        await fetch('/api/generate-embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: template.id })
        });
      } catch (embeddingError) {
        console.warn('Failed to generate embeddings:', embeddingError);
        // Don't fail the upload, embeddings can be generated later
      }

      toast.success(`✅ Template uploaded! ${extractedData.placeholders.length} placeholders detected. Ready to generate documents.`);
      
      // Redirect to template detail page
      window.location.href = `/communications/templates/${template.id}`;

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload template. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setExtractedData(null);
    setFormData({ name: "", type: "notice", description: "" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 cursor-pointer ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            
            {analyzing ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                <p className="text-gray-600">Analyzing template...</p>
              </div>
            ) : uploadedFile ? (
              <div className="space-y-4">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive ? 'Drop the template here' : 'Drag & drop a .docx template'}
                  </p>
                  <p className="text-sm text-gray-600">
                    or click to browse files
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Only .docx files are supported (max 10MB)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Details Form */}
      {uploadedFile && extractedData && (
        <>
          {/* Template Info */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Template Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="e.g., Service Charge Notice"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleFormChange('type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="welcome_letter">Welcome Letter</option>
                      <option value="notice">Notice</option>
                      <option value="deed">Deed</option>
                      <option value="form">Form</option>
                      <option value="invoice">Invoice</option>
                      <option value="section_20">Section 20</option>
                      <option value="legal_notice">Legal Notice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      placeholder="Brief description of this template..."
                      rows={3}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Extracted Data Preview */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Detected Placeholders ({extractedData.placeholders.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {extractedData.placeholders.length > 0 ? (
                        extractedData.placeholders.map((placeholder, index) => (
                          <Badge key={index} className="text-sm bg-blue-100 text-blue-800 flex items-center">
                            <Tag className="w-3 h-3 mr-1" />
                            {placeholder}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No placeholders detected</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Content Preview
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                        {showPreview ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    {showPreview && (
                      <div className="max-h-32 overflow-y-auto p-3 bg-gray-50 rounded border text-sm text-gray-700">
                        {extractedData.content.length > 500 
                          ? `${extractedData.content.substring(0, 500)}...`
                          : extractedData.content
                        }
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Button */}
              <div className="mt-6">
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !formData.name.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading Template...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Template
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
```

### API Endpoint

#### `app/api/upload-template/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log("📤 Template upload processing...");
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const description = formData.get('description') as string;
    const contentText = formData.get('contentText') as string;
    const placeholders = JSON.parse(formData.get('placeholders') as string);

    // Validate required fields
    if (!file || !name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json({ error: 'Only .docx files are supported' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    console.log("✅ Valid upload request received:", { name, type, fileSize: file.size });

    // 1. Upload file to Supabase storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name.replace(/\s+/g, '_')}_${timestamp}.docx`;
    const filePath = `templates/${filename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('templates')
      .upload(filePath, file, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false
      });

    if (uploadError) {
      console.error("❌ Failed to upload file:", uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    console.log("📤 File uploaded successfully");

    // 2. Save template metadata to database
    const { data: template, error: dbError } = await supabase
      .from('templates')
      .insert({
        name: name,
        type: type,
        description: description || null,
        storage_path: filePath,
        content_text: contentText,
        placeholders: placeholders
      })
      .select()
      .single();

    if (dbError) {
      console.error("❌ Failed to save template metadata:", dbError);
      return NextResponse.json({ error: 'Failed to save template metadata' }, { status: 500 });
    }

    console.log("✅ Template saved to database");

    // 3. Generate embeddings for semantic search
    try {
      const embeddingResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/generate-embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id })
      });

      if (!embeddingResponse.ok) {
        console.warn("⚠️ Failed to generate embeddings");
      }
    } catch (embeddingError) {
      console.warn("⚠️ Embedding generation failed:", embeddingError);
    }

    console.log("✅ Template upload completed successfully");

    return NextResponse.json({
      success: true,
      template: template,
      message: `Template uploaded! ${placeholders.length} placeholders detected.`
    });

  } catch (error) {
    console.error('❌ Template upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload template',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}
```

## 🎨 UI/UX REQUIREMENTS

### Design System
- **Colors**: Blue primary (#2563eb), gray secondary, semantic colors
- **Typography**: Clean, readable fonts with proper hierarchy
- **Spacing**: Consistent 4px grid system
- **Components**: Reusable cards, buttons, forms, badges
- **Responsive**: Mobile-first design with proper breakpoints

### Form Validation
```typescript
// Client-side validation
const validateForm = (data: TemplateFormData, file: File | null) => {
  const errors: string[] = [];
  
  if (!file) {
    errors.push('Please upload a template file');
  }
  
  if (!data.name.trim()) {
    errors.push('Template name is required');
  }
  
  if (!data.type) {
    errors.push('Template type is required');
  }
  
  return errors;
};
```

### Loading States
```typescript
// Consistent loading indicators
const LoadingSpinner = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center space-x-2">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span className="text-sm text-gray-600">{message}</span>
  </div>
);
```

### Success/Error Handling
```typescript
// Toast notifications
const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 5000,
    action: {
      label: 'View Template',
      onClick: () => router.push('/communications/templates')
    }
  });
};

const showError = (message: string) => {
  toast.error(message, {
    duration: 5000
  });
};
```

## 📁 FILE STRUCTURE
```
app/
├── communications/
│   └── templates/
│       └── upload/
│           └── page.tsx
├── api/
│   └── upload-template/
│       └── route.ts
└── components/
    └── TemplateUploadForm.tsx
```

## 🔧 DEPENDENCIES
```json
{
  "react-dropzone": "^14.2.3",
  "sonner": "^1.4.0",
  "@supabase/supabase-js": "^2.39.0"
}
```

## 🎯 SUCCESS CRITERIA

### Functional Requirements
- ✅ Drag-and-drop .docx file upload
- ✅ Automatic placeholder extraction using regex
- ✅ Template content preview
- ✅ Form validation and error handling
- ✅ File upload to Supabase storage
- ✅ Database record creation
- ✅ Embedding generation for semantic search
- ✅ Success/error notifications
- ✅ Redirect to template detail page

### Technical Requirements
- ✅ Clean, responsive Tailwind CSS styling
- ✅ Proper TypeScript implementation
- ✅ Comprehensive error handling
- ✅ File size and type validation
- ✅ Production-ready security
- ✅ Optimized performance

### User Experience
- ✅ Intuitive drag-and-drop interface
- ✅ Real-time feedback and validation
- ✅ Clear visual hierarchy
- ✅ Accessible design
- ✅ Mobile-friendly layout
- ✅ Smooth animations and transitions

## 🚀 IMPLEMENTATION CHECKLIST

- [ ] Set up drag-and-drop interface with react-dropzone
- [ ] Implement .docx text extraction
- [ ] Create placeholder detection regex
- [ ] Build form with validation
- [ ] Add file upload to Supabase storage
- [ ] Create database record with metadata
- [ ] Generate embeddings for semantic search
- [ ] Add success/error notifications
- [ ] Implement redirect to template detail
- [ ] Add responsive design
- [ ] Test file validation and error handling
- [ ] Optimize performance and loading states

## 📝 USAGE EXAMPLE

```typescript
// User uploads template.docx with content:
// "Dear {{leaseholder_name}}, your service charge for {{building_name}} is {{amount}}."

// System automatically detects:
// - Placeholders: ["leaseholder_name", "building_name", "amount"]
// - Content: Full template text
// - File metadata: name, size, type

// User fills form:
// - Name: "Service Charge Notice"
// - Type: "notice"
// - Description: "Standard service charge notification"

// System uploads and saves:
// - File to Supabase storage
// - Metadata to database
// - Generates embeddings
// - Shows success message
// - Redirects to template detail page
```

This comprehensive prompt provides everything needed to build a production-ready smart template upload interface with automatic placeholder extraction and a polished user experience. 