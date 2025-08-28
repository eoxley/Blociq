/**
 * Lease Document Analyzer for BlocIQ
 * Uses OpenAI API to extract structured lease data and compliance information
 */

import { LeaseAnalysis, LeaseComplianceItem, LEASE_COMPLIANCE_CHECKLIST } from '@/types/ai';

// Legacy interface for backward compatibility
export interface LeaseAnalysisLegacy {
  propertyDetails: {
    address?: string;
    propertyType?: string;
    leaseTerm?: string;
    startDate?: string;
    endDate?: string;
    premium?: string;
    groundRent?: string;
  };
  financialObligations: {
    rent?: string;
    rentReviewDate?: string;
    serviceCharge?: string;
    serviceChargeReviewDate?: string;
    insurance?: string;
    insuranceReviewDate?: string;
    reserveFund?: string;
    reserveFundReviewDate?: string;
  };
  rightsAndRestrictions: {
    parkingRights?: string;
    rightOfAccess?: string;
    tvLicence?: string;
    assignmentRights?: string;
    alterationRights?: string;
    subletRights?: string;
    petPermissions?: string;
    decorationRights?: string;
  };
  serviceProvisions: {
    windows?: string;
    pipes?: string;
    heating?: string;
    electrical?: string;
    plumbing?: string;
    structural?: string;
    exterior?: string;
    interior?: string;
  };
  complianceChecklist: {
    termConsentInFavourOfClient: boolean;
    reserveFund: boolean;
    windowsPipesHeatingProvisions: boolean;
    parkingRights: boolean;
    rightOfAccess: boolean;
    tvAssignmentAlterationsClauses: boolean;
    noticeRequirements: boolean;
    subletPetsPermissions: boolean;
    debtRecoveryInterestTerms: boolean;
    exteriorInteriorRedecorationObligations: boolean;
  };
  additionalInfo: {
    breakClause?: string;
    forfeitureClause?: string;
    disputeResolution?: string;
    legalCosts?: string;
    stampDuty?: string;
    registrationRequirements?: string;
  };
  metadata: {
    confidence: number;
    extractedDate: string;
    documentType: 'lease' | 'lease_variation' | 'lease_assignment' | 'other';
    analysisVersion: string;
    warnings?: string[];
    notes?: string[];
  };
}

export interface LeaseAnalysisOptions {
  includeComplianceChecklist?: boolean;
  extractFinancialDetails?: boolean;
  analyzeServiceProvisions?: boolean;
  customPrompt?: string;
}

// Helper function to extract information from filename
function extractInfoFromFilename(filename: string) {
  const info: any = {};
  
  // Extract date from filename (e.g., "17.02.2017")
  const dateMatch = filename.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dateMatch) {
    info.startDate = `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
    info.startDateFormatted = `${dateMatch[1]}${getOrdinalSuffix(parseInt(dateMatch[1]))} ${getMonthName(parseInt(dateMatch[2]))} ${dateMatch[3]}`;
  }
  
  // Extract building number (e.g., "260")
  const buildingMatch = filename.match(/(\d+)/);
  if (buildingMatch) {
    info.buildingNumber = buildingMatch[1];
  }
  
  return info;
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || '';
}

// CRITICAL: Function to parse actual lease text and extract real data
function parseLeaseText(ocrText: string, filenameInfo: any) {
  const text = ocrText.toLowerCase();
  const parsed: any = {};
  
  console.log('🔍 ===== PARSING OCR TEXT =====');
  console.log('🔍 OCR text length:', ocrText.length);
  console.log('🔍 First 500 chars of OCR:', ocrText.substring(0, 500));
  console.log('🔍 Last 500 chars of OCR:', ocrText.substring(Math.max(0, ocrText.length - 500)));
  console.log('🔍 Does text contain "landlord"?', ocrText.toLowerCase().includes('landlord'));
  console.log('🔍 Does text contain "tenant"?', ocrText.toLowerCase().includes('tenant'));
  console.log('🔍 Does text contain "rent"?', ocrText.toLowerCase().includes('rent'));
  console.log('🔍 Does text contain "£"?', ocrText.includes('£'));
  console.log('🔍 Does text contain "lease"?', ocrText.toLowerCase().includes('lease'));
  console.log('🔍 Does text contain "property"?', ocrText.toLowerCase().includes('property'));
  console.log('🔍 Does text contain "address"?', ocrText.toLowerCase().includes('address'));
  console.log('🔍 Does text contain "premium"?', ocrText.toLowerCase().includes('premium'));
  console.log('🔍 Does text contain "service charge"?', ocrText.toLowerCase().includes('service charge'));
  console.log('🔍 Does text contain "deposit"?', ocrText.toLowerCase().includes('deposit'));
  console.log('🔍 Filename info:', filenameInfo);
  console.log('🔍 ===== END OCR TEXT ANALYSIS =====');
  
  // CRITICAL: Check if we're getting real text or placeholder
  if (ocrText.includes('[[Fallback extractor]]') || ocrText.includes('[[OCR Fallback]]') || ocrText.includes('[[PDF Extraction Failed]]')) {
    console.error('❌ CRITICAL: OCR text contains fallback placeholders instead of real content!');
    console.error('❌ This means text extraction failed and we need to fix the OCR pipeline');
    throw new Error('OCR text extraction failed - received placeholder text instead of real content');
  }
  
  // Extract address patterns - MORE AGGRESSIVE
  if (filenameInfo.buildingNumber) {
    // Look for address patterns starting with the building number
    const addressPattern = new RegExp(`${filenameInfo.buildingNumber}\\s+([a-z\\s]+?)(?:\\s*,\\s*([a-z\\s]+?))?(?:\\s*,\\s*([a-z\\s]+?))?`, 'gi');
    const addressMatches = [...ocrText.matchAll(addressPattern)];
    if (addressMatches.length > 0) {
      const match = addressMatches[0];
      parsed.propertyAddress = `${filenameInfo.buildingNumber} ${match[1]}${match[2] ? ', ' + match[2] : ''}${match[3] ? ', ' + match[3] : ''}`;
      console.log('🔍 Found address:', parsed.propertyAddress);
    } else {
      // Fallback: look for any address-like pattern
      const fallbackAddress = ocrText.match(/\d+\s+[A-Za-z\s]+(?:,\s*[A-Za-z\s]+)*/);
      if (fallbackAddress) {
        parsed.propertyAddress = fallbackAddress[0];
        console.log('🔍 Found fallback address:', parsed.propertyAddress);
      }
    }
  }
  
  // Extract financial amounts (£ followed by numbers) - MORE AGGRESSIVE
  const rentPattern = /£[\d,]+(?:\.\d{2})?/g;
  const rentMatches = ocrText.match(rentPattern);
  if (rentMatches) {
    parsed.financialAmounts = rentMatches;
    console.log('🔍 Found financial amounts:', rentMatches);
    
    // Look for specific financial terms with more aggressive patterns
    if (text.includes('premium')) {
      const premiumMatch = text.match(/premium[:\s]*£[\d,]+(?:\.\d{2})?/i);
      if (premiumMatch) parsed.premium = premiumMatch[0];
    }
    
    if (text.includes('rent')) {
      const rentMatch = text.match(/rent[:\s]*£[\d,]+(?:\.\d{2})?/i);
      if (rentMatch) parsed.initialRent = rentMatch[0];
    }
    
    if (text.includes('service charge')) {
      const serviceMatch = text.match(/service charge[:\s]*£[\d,]+(?:\.\d{2})?/i);
      if (serviceMatch) parsed.serviceCharge = serviceMatch[0];
    }
    
    if (text.includes('deposit')) {
      const depositMatch = text.match(/deposit[:\s]*£[\d,]+(?:\.\d{2})?/i);
      if (depositMatch) parsed.deposit = depositMatch[0];
    }
    
    // If we found amounts but no specific labels, assign them
    if (rentMatches.length > 0 && !parsed.initialRent) {
      parsed.initialRent = rentMatches[0];
      console.log('🔍 Assigned first amount as initial rent:', parsed.initialRent);
    }
  }
  
  // Extract dates - MORE AGGRESSIVE
  if (filenameInfo.startDateFormatted) {
    parsed.leaseStartDate = filenameInfo.startDateFormatted;
  }
  
  // Look for end dates in text with multiple patterns
  const endDatePatterns = [
    /(?:expires|until|end|term)[:\s]*(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi,
    /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi
  ];
  
  for (const pattern of endDatePatterns) {
    const endDateMatches = [...text.matchAll(pattern)];
    if (endDateMatches.length > 0) {
      const match = endDateMatches[0];
      parsed.leaseEndDate = `${match[1]}${getOrdinalSuffix(parseInt(match[1]))} ${match[2]} ${match[3]}`;
      console.log('🔍 Found end date:', parsed.leaseEndDate);
      break;
    }
  }
  
  // Extract lease term - MORE AGGRESSIVE
  const termPatterns = [
    /(?:term|duration|length)[:\s]*(\d+)\s+(?:years?|months?)/gi,
    /(\d+)\s+(?:years?|months?)/gi
  ];
  
  for (const pattern of termPatterns) {
    const termMatches = [...text.matchAll(pattern)];
    if (termMatches.length > 0) {
      parsed.leaseTerm = termMatches[0][0];
      console.log('🔍 Found lease term:', parsed.leaseTerm);
      break;
    }
  }
  
  // Extract names - MORE AGGRESSIVE
  const landlordPatterns = [
    /(?:landlord|lessor)[:\s]*([a-z\s]+?)(?:\s|$|,)/gi,
    /landlord[:\s]*([a-z\s]+?)(?:\s|$|,)/gi
  ];
  
  for (const pattern of landlordPatterns) {
    const landlordMatches = [...text.matchAll(pattern)];
    if (landlordMatches.length > 0) {
      parsed.landlord = landlordMatches[0][1].trim();
      console.log('🔍 Found landlord:', parsed.landlord);
      break;
    }
  }
  
  const tenantPatterns = [
    /(?:tenant|lessee)[:\s]*([a-z\s]+?)(?:\s|$|,)/gi,
    /tenant[:\s]*([a-z\s]+?)(?:\s|$|,)/gi
  ];
  
  for (const pattern of tenantPatterns) {
    const tenantMatches = [...text.matchAll(pattern)];
    if (tenantMatches.length > 0) {
      parsed.tenant = tenantMatches[0][1].trim();
      console.log('🔍 Found tenant:', parsed.tenant);
      break;
    }
  }
  
  // Extract property type - MORE AGGRESSIVE
  const propertyTypePattern = /(?:flat|apartment|house|commercial|residential|office|shop)/gi;
  const propertyMatches = ocrText.match(propertyTypePattern);
  if (propertyMatches) {
    parsed.buildingType = propertyMatches[0];
    console.log('🔍 Found property type:', parsed.buildingType);
  }
  
  // If we still don't have enough data, try to extract ANY meaningful information
  if (!parsed.propertyAddress && ocrText.length > 100) {
    // Look for any text that looks like an address
    const anyAddressMatch = ocrText.match(/\d+\s+[A-Za-z\s]+(?:,\s*[A-Za-z\s]+)*/);
    if (anyAddressMatch) {
      parsed.propertyAddress = anyAddressMatch[0];
      console.log('🔍 Found generic address:', parsed.propertyAddress);
    }
  }
  
  console.log('🔍 Final parsed data:', parsed);
  return parsed;
}

/**
 * Legacy analyzeLease function for backward compatibility
 */
export async function analyzeLease(
  extractedText: string,
  options: LeaseAnalysisOptions = {}
): Promise<LeaseAnalysisLegacy> {
  try {
    // Use the new analyzeLeaseDocument function
    const newAnalysis = await analyzeLeaseDocument(extractedText, 'lease_document', undefined);
    
    // Transform to legacy format
    return {
      propertyDetails: {
        address: newAnalysis.leaseDetails?.propertyAddress || '',
        propertyType: newAnalysis.leaseDetails?.buildingType || '',
        leaseTerm: newAnalysis.leaseDetails?.leaseTerm || '',
        startDate: newAnalysis.leaseDetails?.leaseStartDate || '',
        endDate: newAnalysis.leaseDetails?.leaseEndDate || '',
        premium: newAnalysis.leaseDetails?.premium || '',
        groundRent: ''
      },
      financialObligations: {
        rent: newAnalysis.leaseDetails?.initialRent || '',
        rentReviewDate: '',
        serviceCharge: newAnalysis.leaseDetails?.serviceChargePercentage || '',
        serviceChargeReviewDate: '',
        insurance: '',
        insuranceReviewDate: '',
        reserveFund: '',
        reserveFundReviewDate: ''
      },
      rightsAndRestrictions: {
        parkingRights: '',
        rightOfAccess: '',
        tvLicence: '',
        assignmentRights: '',
        alterationRights: '',
        subletRights: '',
        petPermissions: '',
        decorationRights: ''
      },
      serviceProvisions: {
        windows: '',
        pipes: '',
        heating: '',
        electrical: '',
        plumbing: '',
        structural: '',
        exterior: '',
        interior: ''
      },
      complianceChecklist: {
        termConsentInFavourOfClient: (newAnalysis.complianceChecklist || []).some(item => 
          item.item.toLowerCase().includes('term consent') && item.status === 'Y'
        ),
        reserveFund: (newAnalysis.complianceChecklist || []).some(item => 
          item.item.toLowerCase().includes('reserve fund') && item.status === 'Y'
        ),
        windowsPipesHeatingProvisions: (newAnalysis.complianceChecklist || []).some(item => 
          (item.item.toLowerCase().includes('windows') || 
           item.item.toLowerCase().includes('pipes') || 
           item.item.toLowerCase().includes('heating')) && item.status === 'Y'
        ),
        parkingRights: (newAnalysis.complianceChecklist || []).some(item => 
          item.item.toLowerCase().includes('parking') && item.status === 'Y'
        ),
        rightOfAccess: (newAnalysis.complianceChecklist || []).some(item => 
          item.item.toLowerCase().includes('right of access') && item.status === 'Y'
        ),
        tvAssignmentAlterationsClauses: (newAnalysis.complianceChecklist || []).some(item => 
          (item.item.toLowerCase().includes('tv') || 
           item.item.toLowerCase().includes('assignment') || 
           item.item.toLowerCase().includes('alterations')) && item.status === 'Y'
        ),
        noticeRequirements: (newAnalysis.complianceChecklist || []).some(item => 
          item.item.toLowerCase().includes('notice') && item.status === 'Y'
        ),
        subletPetsPermissions: (newAnalysis.complianceChecklist || []).some(item => 
          (item.item.toLowerCase().includes('sublet') || 
           item.item.toLowerCase().includes('pets')) && item.status === 'Y'
        ),
        debtRecoveryInterestTerms: (newAnalysis.complianceChecklist || []).some(item => 
          (item.item.toLowerCase().includes('debt recovery') || 
           item.item.toLowerCase().includes('interest')) && item.status === 'Y'
        ),
        exteriorInteriorRedecorationObligations: (newAnalysis.complianceChecklist || []).some(item => 
          (item.item.toLowerCase().includes('exterior') || 
           item.item.toLowerCase().includes('interior') || 
           item.item.toLowerCase().includes('redecoration')) && item.status === 'Y'
        )
      },
      additionalInfo: {
        breakClause: '',
        forfeitureClause: '',
        disputeResolution: '',
        legalCosts: '',
        stampDuty: '',
        registrationRequirements: ''
      },
      metadata: {
        confidence: newAnalysis.confidence || 0.8,
        extractedDate: new Date().toISOString(),
        documentType: 'lease',
        analysisVersion: '2.0.0',
        warnings: [],
        notes: []
      }
    };
  } catch (error) {
    console.error('Legacy lease analysis error:', error);
    throw error;
  }
}

export async function analyzeLeaseDocument(
  extractedText: string,
  filename: string,
  buildingId?: string
): Promise<LeaseAnalysis> {
  console.log('🔍 ===== ANALYZE LEASE DOCUMENT CALLED =====');
  console.log('🔍 extractedText parameter:', extractedText ? `"${extractedText.substring(0, 200)}..."` : 'NULL/UNDEFINED');
  console.log('🔍 extractedText length:', extractedText?.length || 0);
  console.log('🔍 filename parameter:', filename);
  console.log('🔍 buildingId parameter:', buildingId);
  console.log('🔍 ===== END PARAMETER LOGGING =====');
  
  if (!extractedText || extractedText.trim().length === 0) {
    console.error('❌ CRITICAL ERROR: extractedText is empty or null!');
    throw new Error('No text content provided for lease analysis');
  }
  
  // CRITICAL: Check if we're getting real text or placeholder
  if (extractedText.includes('[[Fallback extractor]]') || 
      extractedText.includes('[[OCR Fallback]]') || 
      extractedText.includes('[[PDF Extraction Failed]]') ||
      extractedText.includes('Unable to extract text') ||
      extractedText.includes('document may be image-based or corrupted')) {
    console.error('❌ CRITICAL ERROR: extractedText contains fallback placeholders instead of real content!');
    console.error('❌ This means text extraction failed and we need to fix the OCR pipeline');
    console.error('❌ Text content:', extractedText.substring(0, 500));
    throw new Error('OCR text extraction failed - received placeholder text instead of real content. Please check the text extraction pipeline.');
  }
  
  console.log('🔍 Starting lease analysis for:', filename);
  console.log('🔍 Text length:', extractedText.length);
  console.log('🔍 Building ID:', buildingId);
  
  // CRITICAL: Debug the actual OCR text content
  console.log("=== OCR EXTRACTED TEXT ===");
  console.log("Raw OCR text (first 1000 chars):", extractedText.substring(0, 1000));
  console.log("========================");
  
  // Extract key information from filename first
  const filenameInfo = extractInfoFromFilename(filename);
  console.log('🔍 Filename extracted info:', filenameInfo);
  
  // CRITICAL: Parse the actual OCR text for real data before sending to AI
  const parsedData = parseLeaseText(extractedText, filenameInfo);
  console.log('🔍 Parsed data from OCR text:', parsedData);
  
  // Enhanced prompt that works with or without building context
  const leasePrompt = `
You are analyzing a lease document for UK property management. Extract ALL available information and provide a comprehensive analysis.

DOCUMENT TEXT TO ANALYZE:
${extractedText}

PARSED DATA FOUND:
${JSON.stringify(parsedData, null, 2)}

IMPORTANT: Use the PARSED DATA above as your primary source. The PARSED DATA contains REAL extracted information from the document. 

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:
1. **NEVER use "Not specified" if PARSED DATA has a value**
2. **ALWAYS use the PARSED DATA values first**
3. **If PARSED DATA shows "260 High Street" → use "260 High Street" (NOT "Not specified")**
4. **If PARSED DATA shows "£500" → use "£500" (NOT "Not specified")**
5. **If PARSED DATA shows "17th February 2017" → use "17th February 2017" (NOT "Not specified")**

EXAMPLE:
- If PARSED DATA has propertyAddress: "260 High Street, London" → use "260 High Street, London"
- If PARSED DATA has initialRent: "£2,000" → use "£2,000"
- If PARSED DATA has leaseStartDate: "17th February 2017" → use "17th February 2017"

ONLY use "Not specified" if the PARSED DATA field is completely empty/null/undefined.

Please provide a JSON response with this EXACT structure:

{
  "leaseSummary": "Detailed narrative summary of the lease using the PARSED DATA",
  "structuredData": {
    "propertyAddress": "Use PARSED DATA propertyAddress if available, otherwise extract from lease text",
    "landlord": "Use PARSED DATA landlord if available, otherwise extract from lease text",
    "tenant": "Use PARSED DATA tenant if available, otherwise extract from lease text", 
    "leaseStartDate": "Use PARSED DATA leaseStartDate if available, otherwise extract from lease text",
    "leaseEndDate": "Use PARSED DATA leaseEndDate if available, otherwise extract from lease text",
    "leaseTerm": "Use PARSED DATA leaseTerm if available, otherwise extract from lease text",
    "premium": "Use PARSED DATA premium if available, otherwise extract from lease text",
    "initialRent": "Use PARSED DATA initialRent if available, otherwise extract from lease text",
    "monthlyRent": "Calculate from annual rent if available",
    "annualRent": "Use PARSED DATA initialRent if available, otherwise extract from lease text",
    "serviceCharge": "Use PARSED DATA serviceCharge if available, otherwise extract from lease text",
    "deposit": "Use PARSED DATA deposit if available, otherwise extract from lease text",
    "buildingType": "Use PARSED DATA buildingType if available, otherwise extract from lease text",
    "propertyDescription": "Extract from lease text",
    "floorArea": "Extract from lease text if available"
  },
  "complianceChecklist": [
    {
      "item": "Term consent in favour of client",
      "status": "Y/N/Unknown",
      "details": "Specific details found in lease"
    }
  ],
  "financialObligations": [
    "List all financial responsibilities found in lease"
  ],
  "keyRights": [
    "List all tenant rights found in lease"
  ],
  "restrictions": [
    "List all restrictions and prohibitions found in lease"
  ],
  "suggestedActions": [
    "Add new building to portfolio if not found",
    "Update building records with lease details",
    "Review compliance requirements"
  ]
}

CRITICAL: Extract EVERY detail you can find. If the lease mentions "260 [Street Name]", extract that. If it mentions rent amounts, extract them. If it mentions dates, extract them. Be thorough and extract ALL information available.
  `;

  try {
    console.log('🔍 Sending request to OpenAI...');
    
    // Use OpenAI directly since we're in a server-side context
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: 'user', content: leasePrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const aiResult = completion.choices[0].message.content;
    if (!aiResult) {
      throw new Error('No response from OpenAI');
    }

    console.log('🔍 Raw AI response:', aiResult);

    const analysis = JSON.parse(aiResult);
    
    console.log('🔍 Parsed analysis:', {
      leaseSummary: analysis.leaseSummary,
      structuredData: analysis.structuredData,
      complianceChecklist: analysis.complianceChecklist,
      financialObligations: analysis.financialObligations,
      keyRights: analysis.keyRights,
      restrictions: analysis.restrictions
    });

    // Determine if we have building context
    const hasBuildingContext = buildingId && buildingId !== 'unknown';
    const buildingStatus: 'matched' | 'not_found' | 'unknown' = hasBuildingContext ? 'matched' : 'not_found';

    // Transform into LeaseAnalysis format with proper data mapping
    // CRITICAL: Force the use of parsed data if AI didn't use it
    const result = {
      filename,
      summary: analysis.leaseSummary || analysis.summary || 'Lease document analyzed successfully',
      documentType: 'lease',
      leaseDetails: {
        propertyAddress: analysis.structuredData?.propertyAddress || parsedData.propertyAddress || null,
        landlord: analysis.structuredData?.landlord || parsedData.landlord || null,
        tenant: analysis.structuredData?.tenant || parsedData.tenant || null,
        leaseStartDate: analysis.structuredData?.leaseStartDate || parsedData.leaseStartDate || null,
        leaseEndDate: analysis.structuredData?.leaseEndDate || parsedData.leaseEndDate || null,
        leaseTerm: analysis.structuredData?.leaseTerm || parsedData.leaseTerm || null,
        premium: analysis.structuredData?.premium || parsedData.premium || null,
        initialRent: analysis.structuredData?.initialRent || parsedData.initialRent || null,
        monthlyRent: analysis.structuredData?.monthlyRent || parsedData.monthlyRent || null,
        annualRent: analysis.structuredData?.annualRent || parsedData.annualRent || null,
        serviceCharge: analysis.structuredData?.serviceCharge || parsedData.serviceCharge || null,
        deposit: analysis.structuredData?.deposit || parsedData.deposit || null,
        buildingType: analysis.structuredData?.buildingType || parsedData.buildingType || null,
        propertyDescription: analysis.structuredData?.propertyDescription || null,
        floorArea: analysis.structuredData?.floorArea || null
      },
      complianceChecklist: analysis.complianceChecklist?.map((item: any) => ({
        item: item.name || item.item,
        status: item.status,
        details: item.details
      })) || [],
      financialObligations: analysis.financialObligations || [],
      keyRights: analysis.keyRights || [],
      restrictions: analysis.restrictions || [],
      suggestedActions: analysis.suggestedActions?.map((action: any, index: number) => ({
        key: `lease_action_${index}`,
        label: action.title || action.label || action,
        icon: 'FileText',
        action: action.action || 'review'
      })) || [],
      extractionMethod: 'ai_lease_analysis',
      confidence: 0.9,
      buildingContext: {
        buildingId: buildingId || null,
        buildingStatus,
        extractedAddress: analysis.structuredData?.propertyAddress || null,
        extractedBuildingType: analysis.structuredData?.buildingType || null
      }
    };

    console.log('🔍 Final result structure:', {
      leaseDetails: result.leaseDetails,
      complianceChecklist: result.complianceChecklist,
      financialObligations: result.financialObligations,
      keyRights: result.keyRights,
      restrictions: result.restrictions
    });

    return result;

  } catch (error) {
    console.error('❌ Lease analysis error:', error);
    
    // Fallback to basic analysis
    return {
      filename,
      summary: `Lease document analysis failed. Document contains ${extractedText.length} characters of text.`,
      documentType: 'lease',
      leaseDetails: {},
      complianceChecklist: LEASE_COMPLIANCE_CHECKLIST.map(item => ({
        item,
        status: 'Unknown' as const
      })),
      suggestedActions: [{
        key: 'manual_review',
        label: 'Manual lease review required',
        icon: 'AlertTriangle',
        action: 'review'
      }],
      extractionMethod: 'fallback',
      confidence: 0.1,
      buildingContext: {
        buildingId: buildingId || null,
        buildingStatus: 'unknown',
        extractedAddress: null,
        extractedBuildingType: null
      }
    };
  }
}
