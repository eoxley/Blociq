# Section 20 Consultation Threshold Calculator

## Overview

The Section 20 Consultation Threshold Calculator is a utility that helps property managers determine when formal consultation is required under Section 20 of the Landlord and Tenant Act 1985. It calculates spending thresholds based on leaseholder apportionments for both residential-only and mixed-use buildings.

## Features

### 🧮 **UI Calculator** (`/tools/section-20-threshold`)

#### **Single Calculation Mode**
- **Inputs**: 
  - Highest residential apportionment percentage
  - Commercial elements toggle (Yes/No)
  - Commercial percentage (if applicable)
- **Real-time Results**: Live calculation with visual feedback
- **Copy Functionality**: One-click copying of results

#### **Bulk Calculation Mode (Excel Upload)**
- **File Upload**: Accept `.xlsx` and `.xls` files
- **Template Download**: Pre-formatted Excel template
- **Bulk Processing**: Analyze multiple leaseholders at once
- **Results Export**: Download analysis as Excel file

### 📊 **Excel Upload Features**

#### **Required Format**
The Excel file should have the following columns:
| Unit | Leaseholder Name | Apportionment % |
|------|------------------|-----------------|
| Flat 1 | John Smith | 15.5 |
| Flat 2 | Jane Doe | 12.3 |
| Flat 3 | Bob Wilson | 18.7 |

#### **Processing Capabilities**
- **Automatic Parsing**: Reads Excel files and extracts leaseholder data
- **Validation**: Checks for required fields and valid percentages
- **Individual Analysis**: Calculates threshold for each leaseholder
- **Consultation Triggers**: Identifies which units require consultation
- **Summary Statistics**: Building-wide analysis and recommendations

#### **Output Features**
- **Summary Dashboard**: Key metrics at a glance
- **Detailed Table**: Individual leaseholder analysis
- **Risk Assessment**: Low/Medium/High risk classification
- **Recommendations**: Actionable advice based on results
- **Export Options**: Download results as Excel file

### 🤖 **AI Integration**

#### **Natural Language Queries**
The AI assistant can handle questions like:
- "What's the S20 threshold for these apportionments?"
- "Do I need to consult for £10K works?"
- "Calculate the Section 20 threshold for a building with 15% highest apportionment"
- "Analyze this Excel file with leaseholder data"

#### **AI Processing**
1. **Detects Section 20 queries** using keyword matching
2. **Parses apportionment data** from text or uploaded spreadsheets
3. **Applies correct formula** (residential-only vs mixed-use)
4. **Provides guidance** on consultation requirements
5. **Suggests next steps** if consultation is needed
6. **Recommends bulk upload** for multiple leaseholders

#### **Excel Upload Support**
- Accepts `.xlsx` files with apportionment data
- Calculates thresholds for all leaseholders
- Shows which leaseholders trigger the threshold
- Suggests appropriate letters if Section 20 is required
- Provides bulk analysis recommendations

## API Endpoints

### **Calculate Section 20 Threshold (Single)**
**POST** `/api/calculate-section20`

**Request Body:**
```json
{
  "highestApportionment": 15.5,
  "hasCommercial": true,
  "commercialPercentage": 40,
  "worksValue": 5000
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "threshold": 1666.67,
    "isResidentialOnly": false,
    "residentialPercentage": 60,
    "commercialPercentage": 40,
    "highestApportionment": 15.5,
    "requiresConsultation": true,
    "description": "This means any qualifying works above this value will require formal consultation under Section 20.\n\n🔴 CONSULTATION REQUIRED: The proposed works value of £5,000 exceeds the threshold of £1,667. You must follow the Section 20 consultation process.",
    "calculation": "(£250 ÷ (15.5% ÷ 100)) × (60% ÷ 100) = £1,666.67"
  }
}
```

### **Calculate Section 20 Threshold (Bulk)**
**POST** `/api/calculate-section20-bulk`

**Request Body:**
```json
{
  "leaseholderData": [
    {
      "unit": "Flat 1",
      "name": "John Smith",
      "apportionment": 15.5
    },
    {
      "unit": "Flat 2", 
      "name": "Jane Doe",
      "apportionment": 12.3
    }
  ],
  "hasCommercial": false,
  "worksValue": 5000
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "buildingThreshold": 1612.90,
    "leaseholders": [
      {
        "unit": "Flat 1",
        "name": "John Smith",
        "apportionment": 15.5,
        "threshold": 1612.90,
        "triggersConsultation": false,
        "consultationRequired": true
      }
    ],
    "totalUnits": 2,
    "unitsTriggeringConsultation": 0,
    "highestApportionment": 15.5,
    "hasCommercial": false,
    "residentialPercentage": 100,
    "summary": {
      "buildingType": "Residential-only",
      "consultationRequired": true,
      "riskLevel": "medium",
      "recommendations": [
        "Monitor works costs closely",
        "Prepare Section 20 notices for major works",
        "Communicate clearly with leaseholders"
      ]
    }
  }
}
```

## Usage Examples

### **Example 1: Single Calculation**
```
Input:
- Highest apportionment: 10%
- Commercial elements: No

Calculation:
threshold = 250 / (10 / 100) = £2,500

Result:
✅ No consultation required for works under £2,500
```

### **Example 2: Bulk Excel Upload**
```
Excel File:
| Unit | Leaseholder | Apportionment % |
|------|-------------|-----------------|
| Flat 1 | John Smith | 15.5 |
| Flat 2 | Jane Doe | 12.3 |
| Flat 3 | Bob Wilson | 18.7 |

Results:
- Building Threshold: £1,337.97
- Total Units: 3
- Units Requiring Consultation: 0
- Risk Level: Medium
- Recommendations: Monitor works costs, prepare Section 20 notices
```

### **Example 3: AI Analysis**
```
User Query: "What's the S20 threshold for a building with 20% highest apportionment?"

AI Response:
"Based on a 20% highest apportionment for a residential-only building:
- Section 20 Threshold: £1,250
- Risk Level: Medium
- Consultation required for works above £1,250
- Recommendation: Monitor costs and prepare Section 20 notices for major works"
```

## UI Features

### **Interactive Calculator**
- **Real-time calculation** as inputs change
- **Input validation** with helpful error messages
- **Tooltips** explaining each field
- **Responsive design** for mobile and desktop

### **Excel Upload Interface**
- **Drag & Drop**: Easy file upload
- **Template Download**: Pre-formatted Excel template
- **Progress Indicators**: Upload and processing status
- **Error Handling**: Clear error messages for invalid files
- **Results Display**: Comprehensive analysis table

### **Visual Feedback**
- **Color-coded thresholds** (red for low, green for standard)
- **Currency formatting** with proper UK formatting
- **Copy to clipboard** functionality
- **Calculation breakdown** showing the formula used
- **Risk level indicators** with appropriate colors

### **Export Features**
- **Excel Export**: Download results with multiple sheets
- **Summary Sheet**: Key metrics and recommendations
- **Detailed Sheet**: Individual leaseholder analysis
- **Professional Formatting**: Ready for reports and presentations

## Benefits

### **For Property Managers**
1. **Quick Calculations**: Instant threshold determination
2. **Bulk Processing**: Handle multiple properties efficiently
3. **Compliance Assurance**: Clear guidance on consultation requirements
4. **Time Savings**: No manual spreadsheet calculations
5. **Risk Reduction**: Avoid missing consultation requirements
6. **Professional Reports**: Export-ready analysis

### **For Leaseholders**
1. **Transparency**: Clear understanding of consultation triggers
2. **Fair Process**: Ensures proper consultation when required
3. **Cost Control**: Understand spending limits
4. **Legal Protection**: Proper Section 20 compliance

### **For Operations**
1. **Standardized Process**: Consistent calculation methodology
2. **Audit Trail**: Documented calculations and decisions
3. **Efficiency**: Faster decision-making on works
4. **Compliance**: Reduced risk of legal challenges
5. **Scalability**: Handle multiple properties and leaseholders

## Technical Implementation

### **Frontend**
- **React/Next.js** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components for accessibility
- **XLSX Library** for Excel processing
- **Real-time validation** and calculation

### **Backend**
- **API Routes** for calculations
- **TypeScript** for type safety
- **Error handling** and validation
- **Excel processing** with XLSX
- **Integration** with AI assistant

### **AI Integration**
- **OpenAI GPT-4** for natural language processing
- **Excel parsing** for spreadsheet uploads
- **Context awareness** from building data
- **Smart recommendations** and guidance
- **Bulk analysis** suggestions

## Future Enhancements

### **Planned Features**
1. **Advanced Excel Processing**: Support for multiple sheets and formats
2. **Historical Tracking**: Log calculations and decisions over time
3. **Template Integration**: Direct link to Section 20 templates
4. **Mobile App**: Native mobile calculator
5. **API Access**: Public API for third-party integrations
6. **Batch Processing**: Process multiple Excel files at once

### **Advanced AI Features**
1. **Document Analysis**: Extract apportionments from lease documents
2. **Predictive Modeling**: Estimate consultation likelihood
3. **Compliance Monitoring**: Track consultation deadlines
4. **Legal Updates**: Automatic updates for regulation changes
5. **Smart Templates**: Generate Section 20 notices automatically

## Conclusion

The Section 20 Consultation Threshold Calculator with Excel upload functionality transforms complex legal calculations into simple, accessible tools. Property managers can now quickly determine consultation requirements for individual properties or entire portfolios, ensure compliance, and provide transparent service to leaseholders.

The combination of a user-friendly calculator, bulk Excel processing, and intelligent AI integration makes this an essential tool for modern property management, reducing risk and improving efficiency in leasehold administration. 