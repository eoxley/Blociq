# Industry Knowledge Bulk Import - Developer Guide

This guide explains how to bulk import industry knowledge documents and content using the developer tools.

## 🚀 **Quick Start**

### **1. CLI Script (Recommended)**

```bash
# Import from JSON file
node scripts/bulk-import-industry-knowledge.js --type=json --file=your-knowledge-data.json

# Import from CSV file  
node scripts/bulk-import-industry-knowledge.js --type=csv --file=your-documents.csv

# Import predefined knowledge for specific category
node scripts/bulk-import-industry-knowledge.js --type=api --category="Fire & Life Safety"
```

### **2. API Endpoint**

```bash
curl -X POST /api/industry/bulk-import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "all",
    "data": { ... },
    "overwrite": false
  }'
```

## 📁 **Data Formats**

### **JSON Structure**

```json
{
  "documents": [
    {
      "title": "Document Title",
      "category": "Fire & Life Safety",
      "source": "HSE",
      "version": "2024",
      "file_url": "https://example.com/doc.pdf",
      "extracted_content": "Full text content...",
      "tags": ["fire safety", "guidance"]
    }
  ],
  "standards": [
    {
      "name": "BS 9999:2017",
      "category": "Fire & Life Safety",
      "description": "Standard description",
      "requirements": ["Requirement 1", "Requirement 2"],
      "frequency": "Annual",
      "legal_basis": "Building Regulations",
      "guidance_notes": "Additional guidance"
    }
  ],
  "guidance": [
    {
      "category": "Fire & Life Safety",
      "title": "Guidance Title",
      "description": "Brief description",
      "content": "Full guidance content...",
      "source": "HSE",
      "version": "2024",
      "relevance_score": 95,
      "tags": ["fire safety", "best practice"]
    }
  ]
}
```

### **CSV Structure**

```csv
title,category,source,version,file_url,extracted_content,tags
"Fire Safety Guide","Fire & Life Safety","HSE","2024","https://example.com/doc.pdf","Content here...","fire safety,guidance"
"Electrical Standards","Electrical & Mechanical","BSI","2024","https://example.com/electrical.pdf","Content here...","electrical,standards"
```

## 🛠️ **CLI Script Options**

| Option | Description | Example |
|--------|-------------|---------|
| `--type` | Import type: `json`, `csv`, or `api` | `--type=json` |
| `--file` | Path to data file | `--file=knowledge.json` |
| `--category` | Filter by category (for API type) | `--category="Fire & Life Safety"` |
| `--source` | Filter by source (for API type) | `--source="HSE"` |
| `--version` | Filter by version (for API type) | `--version="2024"` |

## 🔌 **API Endpoint Usage**

### **Import Types**

- **`documents`** - Import PDF documents with metadata
- **`standards`** - Import industry standards
- **`guidance`** - Import guidance documents
- **`all`** - Import all types from structured data

### **Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Import type |
| `data` | array/object | Yes | Data to import |
| `overwrite` | boolean | No | Overwrite existing records (default: false) |

### **Example API Calls**

```javascript
// Import standards only
fetch('/api/industry/bulk-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'standards',
    data: standardsArray,
    overwrite: false
  })
})

// Import everything
fetch('/api/industry/bulk-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'all',
    data: {
      documents: documentsArray,
      standards: standardsArray,
      guidance: guidanceArray
    }
  })
})
```

## 📊 **Data Categories**

Use these predefined categories for consistency:

- **Fire & Life Safety**
- **Electrical & Mechanical**
- **Water Hygiene & Drainage**
- **Structural, Access & Systems**
- **Insurance & Risk**
- **Leasehold / Governance**
- **Building Safety Act (BSA / HRB)**
- **Property Management**
- **Market Knowledge**
- **Other**

## 🔍 **Data Sources**

Common sources for industry knowledge:

- **HSE** - Health and Safety Executive
- **BSI** - British Standards Institution
- **Building Regulations** - Government guidance
- **RICS** - Royal Institution of Chartered Surveyors
- **TPI** - The Property Institute
- **Government** - Official government guidance
- **Industry Association** - Professional associations
- **Professional Body** - Regulatory bodies

## ⚠️ **Important Notes**

1. **Authentication Required** - You need admin/manager privileges
2. **File Size Limits** - PDFs max 50MB
3. **Content Extraction** - AI processing extracts text and creates knowledge extractions
4. **Duplicate Handling** - Use `overwrite: true` to update existing records
5. **Tags** - Use comma-separated values for better searchability

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Permission Denied**
   - Ensure user has admin/manager role
   - Check authentication token

2. **File Not Found**
   - Verify file path is correct
   - Check file permissions

3. **Import Errors**
   - Validate JSON/CSV format
   - Check required fields are present
   - Ensure category values match predefined list

### **Debug Mode**

Enable detailed logging by setting environment variable:
```bash
export DEBUG_INDUSTRY_IMPORT=true
```

## 📈 **Performance Tips**

1. **Batch Processing** - Import in chunks of 100-500 records
2. **Parallel Processing** - Use multiple API calls for large datasets
3. **Data Validation** - Validate data before import to avoid errors
4. **Incremental Updates** - Use `overwrite: true` for updates

## 🔗 **Related Files**

- `scripts/bulk-import-industry-knowledge.js` - CLI script
- `scripts/sample-industry-knowledge.json` - Sample data template
- `app/api/industry/bulk-import/route.ts` - API endpoint
- `supabase/migrations/20250116_add_industry_documents.sql` - Database schema

## 📞 **Support**

For issues or questions:
1. Check the troubleshooting section
2. Review database logs
3. Check API response errors
4. Validate data format against sample template
