# Section 20 Consultation Threshold Calculator

## Overview

The Section 20 Consultation Threshold Calculator is a utility that helps property managers determine when formal consultation is required under Section 20 of the Landlord and Tenant Act 1985. It calculates spending thresholds based on leaseholder apportionments for both residential-only and mixed-use buildings.

## Features

### 🧮 **UI Calculator** (`/tools/section-20-threshold`)

#### **Inputs**
- **Highest Residential Apportionment %** (required)
  - The highest percentage of service charge costs that any single residential leaseholder is responsible for
  - Range: 0.1% to 100%
- **Commercial Elements Toggle** (Yes/No)
  - Whether the building contains commercial units
- **Total Commercial %** (if commercial elements exist)
  - The percentage of service charge costs attributable to commercial units
  - Range: 0% to 100%

#### **Calculation Logic**

**Residential-Only Buildings:**
```
threshold = 250 / (highest_apportionment / 100)
```

**Mixed-Use Buildings:**
```
residential_pct = 100 - commercial_pct
threshold = (250 / (highest_apportionment / 100)) × (residential_pct / 100)
```

#### **Output**
- **Threshold Amount**: Formatted as currency (e.g., £1,666.67)
- **Threshold Status**: Low/Standard threshold badge
- **Description**: Contextual advice based on threshold value
- **Calculation Details**: Step-by-step formula breakdown
- **Copy Result**: One-click copying to clipboard

### 🤖 **AI Integration**

#### **Natural Language Queries**
The AI assistant can handle questions like:
- "What's the S20 threshold for these apportionments?"
- "Do I need to consult for £10K works?"
- "Calculate the Section 20 threshold for a building with 15% highest apportionment"

#### **AI Processing**
1. **Detects Section 20 queries** using keyword matching
2. **Parses apportionment data** from text or uploaded spreadsheets
3. **Applies correct formula** (residential-only vs mixed-use)
4. **Provides guidance** on consultation requirements
5. **Suggests next steps** if consultation is needed

#### **Excel Upload Support**
- Accepts `.xlsx` files with apportionment data
- Calculates thresholds for all leaseholders
- Shows which leaseholders trigger the threshold
- Suggests appropriate letters if Section 20 is required

## API Endpoints

### **Calculate Section 20 Threshold**
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

## Legal Context

### **Section 20 Requirements**
- **Threshold**: £250 per leaseholder (not per building)
- **Scope**: Qualifying works that cost any leaseholder more than £250
- **Process**: Three-stage consultation process required
- **Mixed-use**: Only residential leaseholders are considered

### **When Consultation is Required**
- Major works or improvements
- Works exceeding the calculated threshold
- Service charge costs above threshold per leaseholder
- Qualifying long-term agreements

### **When Consultation is NOT Required**
- Routine maintenance below threshold
- Emergency works
- Works below the calculated threshold
- Non-qualifying works

## Usage Examples

### **Example 1: Residential-Only Building**
```
Input:
- Highest apportionment: 10%
- Commercial elements: No

Calculation:
threshold = 250 / (10 / 100) = £2,500

Result:
✅ No consultation required for works under £2,500
```

### **Example 2: Mixed-Use Building**
```
Input:
- Highest apportionment: 15%
- Commercial elements: Yes
- Commercial percentage: 40%

Calculation:
residential_pct = 100 - 40 = 60%
threshold = (250 / (15 / 100)) × (60 / 100) = £1,000

Result:
✅ No consultation required for works under £1,000
```

### **Example 3: Low Threshold Warning**
```
Input:
- Highest apportionment: 50%
- Commercial elements: No

Calculation:
threshold = 250 / (50 / 100) = £500

Result:
⚠️ Low threshold - consider reviewing lease terms
```

## UI Features

### **Interactive Calculator**
- **Real-time calculation** as inputs change
- **Input validation** with helpful error messages
- **Tooltips** explaining each field
- **Responsive design** for mobile and desktop

### **Visual Feedback**
- **Color-coded thresholds** (red for low, green for standard)
- **Currency formatting** with proper UK formatting
- **Copy to clipboard** functionality
- **Calculation breakdown** showing the formula used

### **Information Section**
- **Legal context** about Section 20 requirements
- **Key points** about consultation process
- **Usage scenarios** for different situations
- **Best practices** for property managers

## AI Integration Features

### **Natural Language Processing**
- **Keyword detection** for Section 20 queries
- **Context awareness** from building data
- **Multi-format input** (text, numbers, spreadsheets)
- **Intelligent suggestions** based on threshold results

### **Excel Processing**
- **Upload .xlsx files** with apportionment data
- **Parse multiple leaseholders** from spreadsheets
- **Calculate thresholds** for all units
- **Identify trigger points** for consultation

### **Smart Recommendations**
- **Consultation requirements** based on works value
- **Template suggestions** for Section 20 notices
- **Next steps guidance** for compliance
- **Legal considerations** and best practices

## Benefits

### **For Property Managers**
1. **Quick Calculations**: Instant threshold determination
2. **Compliance Assurance**: Clear guidance on consultation requirements
3. **Time Savings**: No manual spreadsheet calculations
4. **Risk Reduction**: Avoid missing consultation requirements
5. **Professional Tool**: Impress clients with accurate calculations

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

## Technical Implementation

### **Frontend**
- **React/Next.js** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components for accessibility
- **Real-time validation** and calculation

### **Backend**
- **API Routes** for calculations
- **TypeScript** for type safety
- **Error handling** and validation
- **Integration** with AI assistant

### **AI Integration**
- **OpenAI GPT-4** for natural language processing
- **Excel parsing** for spreadsheet uploads
- **Context awareness** from building data
- **Smart recommendations** and guidance

## Future Enhancements

### **Planned Features**
1. **Bulk Calculations**: Process multiple buildings at once
2. **Historical Tracking**: Log calculations and decisions
3. **Template Integration**: Direct link to Section 20 templates
4. **Mobile App**: Native mobile calculator
5. **API Access**: Public API for third-party integrations

### **Advanced AI Features**
1. **Document Analysis**: Extract apportionments from lease documents
2. **Predictive Modeling**: Estimate consultation likelihood
3. **Compliance Monitoring**: Track consultation deadlines
4. **Legal Updates**: Automatic updates for regulation changes

## Conclusion

The Section 20 Consultation Threshold Calculator transforms complex legal calculations into simple, accessible tools. Property managers can now quickly determine consultation requirements, ensure compliance, and provide transparent service to leaseholders.

The combination of a user-friendly calculator and intelligent AI integration makes this an essential tool for modern property management, reducing risk and improving efficiency in leasehold administration. 