// ✅ COMPREHENSIVE PROPERTY MANAGEMENT AI SYSTEM
// Legacy AI functions restoration - all property management assistant capabilities

export interface PropertyManagementContext {
  type: 'notice_generation' | 'letter_drafting' | 'compliance_document' | 'calculation' | 'email_response' | 'general' | 'leak_triage';
  subtype?: string;
  buildingData?: any;
  leaseholderData?: any;
  tone?: 'formal' | 'professional' | 'friendly';
}

// ================================
// COMPREHENSIVE SYSTEM PROMPTS
// ================================

export const PROPERTY_MANAGEMENT_SYSTEM_PROMPT = `You are BlocIQ, the UK's most comprehensive AI property management assistant. You are an expert in all aspects of UK leasehold property management, compliance, and building administration.

**YOUR CAPABILITIES:**
✅ Notice generation (window cleaning, maintenance, contractor access, emergency, annual meetings, Section 20, RTM, insurance)
✅ Letter drafting (rent arrears, service charges, lease breaches, maintenance responses, insurance claims, debt recovery, legal notices)
✅ Compliance documents (fire safety, building safety, EPC, gas safety, electrical, asbestos management)
✅ Calculations (Section 20 thresholds, service charge apportionments, ground rent, insurance splits, major works costs)
✅ Email responses (leaseholder inquiries, maintenance requests, complaint handling, information requests, payment queries)
✅ UK Property Law guidance (Leasehold Reform Act, Building Safety Act, service charge regulations, RTM, enfranchisement, tribunal procedures)

**UK LEGISLATION EXPERTISE:**
- Landlord and Tenant Act 1985 (Section 20 consultations, repair obligations, service charge demands)
- Landlord and Tenant Act 1987 (variations, First-tier Tribunal rights)
- Building Safety Act 2022 (safety cases, accountable persons, building safety managers)
- Leasehold Reform, Housing and Urban Development Act 1993 (collective enfranchisement)
- Commonhold and Leasehold Reform Act 2002 (Right to Manage)
- Housing Act 2004 (HMO licensing, housing health and safety rating system)
- Regulatory Reform (Fire Safety) Order 2005
- Gas Safety (Installation and Use) Regulations 1998
- Electricity at Work Regulations 1989

**TONE GUIDELINES:**
- Professional: Clear, authoritative, legally appropriate
- Formal: Traditional business language with proper legal disclaimers
- Friendly: Approachable but still professional for leaseholder communications

**CRITICAL REQUIREMENTS:**
1. Always use British English spelling and terminology
2. Include appropriate legal disclaimers for legal documents
3. Use current UK property law (2024/2025)
4. Generate professionally formatted documents
5. Include contact information placeholders: [MANAGING AGENT], [EMAIL], [PHONE], [ADDRESS]
6. Reference specific legislation where appropriate
7. Include dates in DD/MM/YYYY format
8. Never use tenancy language inappropriately (these are leaseholders, not tenants)

**DOCUMENT FORMATTING:**
- Use proper business letter format for formal documents
- Include appropriate headers and footers
- Use bullet points for lists where appropriate
- Include legal references in a professional manner
- Ensure documents are ready for letterhead printing

Remember: You are a complete property management assistant. Provide detailed, accurate, and legally appropriate responses based on current UK law and best practices.`;

// ================================
// NOTICE GENERATION PROMPTS
// ================================

export const NOTICE_GENERATION_PROMPTS = {
  window_cleaning: `Generate a professional window cleaning notice for leaseholders including:
- Date and time of cleaning
- Access requirements and arrangements
- Health and safety considerations
- Contact information for queries
- Professional tone suitable for posting in communal areas`,

  maintenance: `Generate a maintenance notification including:
- Type of maintenance work (lift, heating, water, electrical)
- Scheduled dates and times
- Expected disruption to services
- Emergency contact information
- Health and safety precautions
- Access arrangements where required`,

  contractor_access: `Generate a contractor access notice including:
- Purpose of works and contractor details
- Specific dates and access times
- Which areas/units will be affected
- Resident cooperation requirements
- Emergency contact information
- Health and safety information`,

  emergency: `Generate an emergency building notification including:
- Nature of emergency and current status
- Immediate safety instructions for residents
- Alternative arrangements (if applicable)
- Emergency contact information
- Expected resolution timeframe
- Regular update schedule`,

  annual_meeting: `Generate an Annual General Meeting notice including:
- Meeting date, time, and venue (with virtual options if applicable)
- Statutory requirements compliance (21 days notice minimum)
- Agenda items and voting matters
- Right to appoint proxies
- How to submit questions in advance
- Legal references to lease requirements`,

  section20: `Generate a Section 20 consultation notice including:
- Description of proposed works
- Estimated costs and contractor details
- 30-day consultation period (or appropriate timeline)
- Leaseholders' rights to make observations
- How to nominate alternative contractors
- Legal requirements under LTA 1985 Section 20`,

  right_to_manage: `Generate a Right to Manage notification including:
- RTM Company formation details
- Transfer of management responsibilities
- New contact information and procedures
- Leaseholder rights and obligations
- Transition timeline and key dates
- Legal references to CLRA 2002`,

  insurance_renewal: `Generate a building insurance renewal notice including:
- Policy renewal date and new premium
- Coverage details and any changes
- Service charge implications
- How premiums are apportioned
- Claims procedure and excess information
- Leaseholders' rights regarding insurance`
};

// ================================
// LETTER DRAFTING PROMPTS
// ================================

export const LETTER_DRAFTING_PROMPTS = {
  rent_arrears: `Draft a professional rent arrears letter including:
- Clear statement of arrears amount and period
- Payment history and calculation
- Immediate payment requirement
- Consequences of non-payment (including forfeiture)
- Payment options and contact information
- Legal references and formal language
- Standard legal disclaimers`,

  service_charge: `Draft a service charge demand letter including:
- Detailed breakdown of charges
- Legal basis for charges (lease clauses)
- Payment due date and methods
- Consequences of non-payment
- Right to challenge charges at tribunal
- Contact information for queries
- Compliance with LTA 1985 Section 47 & 48`,

  lease_breach: `Draft a lease breach notification including:
- Specific breach identification with lease clause references
- Evidence of breach and timeline
- Required remedial action
- Deadline for compliance
- Consequences of continued breach
- Legal advice to seek professional help
- Formal legal language and proper notices`,

  maintenance_response: `Draft a maintenance request response including:
- Acknowledgment of reported issue
- Assessment of responsibility (demised vs communal)
- Proposed action plan and timeline
- Cost implications and authorization
- Health and safety considerations
- Contact information for updates`,

  insurance_claim: `Draft an insurance claim letter including:
- Incident description and date
- Policy details and claim number
- Supporting documentation required
- Leaseholder cooperation requirements
- Expected timeline for resolution
- Contact information for claim queries
- Interim arrangements if applicable`,

  debt_recovery: `Draft a debt recovery communication including:
- Full debt statement with breakdown
- Previous attempts at recovery
- Final demand notice
- Legal action consequences
- Payment plan options
- Statutory demands and county court procedures
- Strong but professional language`,

  legal_notice: `Draft a legal notice template including:
- Proper legal formatting and language
- Statutory requirements compliance
- Clear statement of legal position
- Required actions and deadlines
- Consequences of non-compliance
- Legal references and authorities
- Professional disclaimers`
};

// ================================
// COMPLIANCE DOCUMENT PROMPTS
// ================================

export const COMPLIANCE_PROMPTS = {
  fire_safety: `Generate a fire safety notice including:
- Fire risk assessment findings
- Mandatory fire safety measures
- Evacuation procedures and assembly points
- Fire door and escape route requirements
- Resident responsibilities
- Emergency contact information
- Legal compliance with RRO 2005`,

  building_safety: `Generate a building safety compliance update including:
- Building Safety Act 2022 requirements
- Accountable Person responsibilities
- Safety case summary (if applicable)
- Building safety manager contact details
- Reporting procedures for safety concerns
- Compliance certificates and inspections
- Legal obligations and deadlines`,

  epc: `Generate an EPC certificate notification including:
- Energy Performance Certificate details
- EPC rating and recommendations
- Legal requirements for display
- Improvement opportunities
- Cost implications for improvements
- Leaseholder information rights
- Compliance deadlines`,

  gas_safety: `Generate a gas safety record notice including:
- Annual gas safety check requirements
- Qualified engineer details and certificates
- Access requirements for inspections
- Safety procedures and emergency contacts
- Legal obligations under Gas Safety Regulations 1998
- Consequences of non-compliance
- Resident cooperation requirements`,

  electrical: `Generate an electrical inspection reminder including:
- EICR (Electrical Installation Condition Report) requirements
- 5-year inspection cycle compliance
- Qualified electrician requirements
- Access arrangements for inspections
- Safety implications and emergency procedures
- Legal obligations and deadlines
- Cost implications and apportionment`,

  asbestos: `Generate an asbestos management update including:
- Asbestos survey findings summary
- Management plan requirements
- Work notification procedures
- Contractor selection criteria (licensed/non-licensed work)
- Health and safety precautions
- Legal obligations under Control of Asbestos Regulations 2012
- Emergency procedures and contact information`
};

// ================================
// CALCULATION FUNCTIONS
// ================================

export const CALCULATION_PROMPTS = {
  section20_threshold: `Calculate Section 20 consultation thresholds:
- Current thresholds: £250 per leaseholder OR £100 for long-term agreements
- Total building costs vs individual contributions
- Which leaseholders exceed thresholds
- Consultation requirements and procedures
- Timeline requirements (30 days minimum)
- Legal compliance checklist`,

  service_charge_apportionment: `Calculate service charge apportionments:
- Percentage splits according to lease terms
- Individual unit contributions
- Reserve fund contributions
- Variable vs fixed service charges
- Ground rent and insurance apportionments
- Year-end adjustments and balancing`,

  ground_rent: `Calculate ground rent obligations:
- Annual ground rent per unit
- Escalation clauses and review periods
- Historical increases and future projections
- Payment due dates and collection
- Arrears calculations with interest
- Legal implications of non-payment`,

  insurance_premium: `Calculate insurance premium splits:
- Total building insurance premium
- Apportionment method (rateable value/percentage)
- Individual leaseholder contributions
- Claims excess responsibilities
- Cover levels and policy details
- Year-on-year comparisons`,

  major_works: `Calculate major works cost allocations:
- Total project costs breakdown
- Individual leaseholder contributions
- Section 20 consultation implications
- Payment schedules and timing
- Reserve fund utilisation
- Loan/financing options analysis`
};

// ================================
// EMAIL RESPONSE TEMPLATES
// ================================

export const EMAIL_RESPONSE_PROMPTS = {
  leaseholder_inquiry: `Generate a professional response to leaseholder inquiries:
- Acknowledgment of inquiry and timeline for response
- Specific information requested or clarification needed
- Reference to lease obligations and rights
- Contact information for further queries
- Professional but friendly tone
- Follow-up actions and deadlines`,

  maintenance_acknowledgment: `Generate maintenance request acknowledgment:
- Confirmation of issue received and logged
- Initial assessment of responsibility
- Expected investigation timeline
- Access requirements if applicable
- Emergency contact information
- Professional and reassuring tone`,

  complaint_handling: `Generate complaint handling response:
- Professional acknowledgment of complaint
- Investigation process and timeline
- Interim measures if required
- Resolution options and procedures
- Escalation process to tribunal if applicable
- Empathetic but professional tone`,

  information_request: `Generate information request response:
- Professional acknowledgment of request
- Information provision or timeline for provision
- Legal basis for information sharing
- Fees applicable (if any) under regulations
- Format and delivery method
- Data protection compliance`,

  payment_query: `Generate payment query response:
- Account status and payment history
- Outstanding amounts and due dates
- Payment methods and options
- Direct debit and standing order setup
- Payment plan options if applicable
- Contact information for payment issues`
};

// ================================
// CONTEXT DETECTION FUNCTION
// ================================

export function detectPropertyManagementContext(query: string): PropertyManagementContext {
  const lowerQuery = query.toLowerCase();

  // Notice generation detection
  if (lowerQuery.includes('notice') || lowerQuery.includes('notification')) {
    if (lowerQuery.includes('window cleaning')) return { type: 'notice_generation', subtype: 'window_cleaning' };
    if (lowerQuery.includes('maintenance') || lowerQuery.includes('repair')) return { type: 'notice_generation', subtype: 'maintenance' };
    if (lowerQuery.includes('contractor') || lowerQuery.includes('access')) return { type: 'notice_generation', subtype: 'contractor_access' };
    if (lowerQuery.includes('emergency')) return { type: 'notice_generation', subtype: 'emergency' };
    if (lowerQuery.includes('annual') || lowerQuery.includes('agm') || lowerQuery.includes('meeting')) return { type: 'notice_generation', subtype: 'annual_meeting' };
    if (lowerQuery.includes('section 20') || lowerQuery.includes('consultation')) return { type: 'notice_generation', subtype: 'section20' };
    if (lowerQuery.includes('right to manage') || lowerQuery.includes('rtm')) return { type: 'notice_generation', subtype: 'right_to_manage' };
    if (lowerQuery.includes('insurance')) return { type: 'notice_generation', subtype: 'insurance_renewal' };
    return { type: 'notice_generation' };
  }

  // Letter drafting detection
  if (lowerQuery.includes('letter') || lowerQuery.includes('draft')) {
    if (lowerQuery.includes('arrears') || lowerQuery.includes('rent')) return { type: 'letter_drafting', subtype: 'rent_arrears' };
    if (lowerQuery.includes('service charge')) return { type: 'letter_drafting', subtype: 'service_charge' };
    if (lowerQuery.includes('breach') || lowerQuery.includes('violation')) return { type: 'letter_drafting', subtype: 'lease_breach' };
    if (lowerQuery.includes('maintenance')) return { type: 'letter_drafting', subtype: 'maintenance_response' };
    if (lowerQuery.includes('insurance claim')) return { type: 'letter_drafting', subtype: 'insurance_claim' };
    if (lowerQuery.includes('debt') || lowerQuery.includes('recovery')) return { type: 'letter_drafting', subtype: 'debt_recovery' };
    if (lowerQuery.includes('legal')) return { type: 'letter_drafting', subtype: 'legal_notice' };
    return { type: 'letter_drafting' };
  }

  // Calculation detection
  if (lowerQuery.includes('calculate') || lowerQuery.includes('work out') || lowerQuery.includes('how much')) {
    if (lowerQuery.includes('section 20') || lowerQuery.includes('threshold')) return { type: 'calculation', subtype: 'section20_threshold' };
    if (lowerQuery.includes('service charge') || lowerQuery.includes('apportionment')) return { type: 'calculation', subtype: 'service_charge_apportionment' };
    if (lowerQuery.includes('ground rent')) return { type: 'calculation', subtype: 'ground_rent' };
    if (lowerQuery.includes('insurance')) return { type: 'calculation', subtype: 'insurance_premium' };
    if (lowerQuery.includes('major works') || lowerQuery.includes('works cost')) return { type: 'calculation', subtype: 'major_works' };
    return { type: 'calculation' };
  }

  // Compliance detection
  if (lowerQuery.includes('fire safety') || lowerQuery.includes('fire')) return { type: 'compliance_document', subtype: 'fire_safety' };
  if (lowerQuery.includes('building safety') || lowerQuery.includes('bsa')) return { type: 'compliance_document', subtype: 'building_safety' };
  if (lowerQuery.includes('epc') || lowerQuery.includes('energy')) return { type: 'compliance_document', subtype: 'epc' };
  if (lowerQuery.includes('gas safety') || lowerQuery.includes('gas')) return { type: 'compliance_document', subtype: 'gas_safety' };
  if (lowerQuery.includes('electrical') || lowerQuery.includes('eicr')) return { type: 'compliance_document', subtype: 'electrical' };
  if (lowerQuery.includes('asbestos')) return { type: 'compliance_document', subtype: 'asbestos' };

  // Email response detection
  if (lowerQuery.includes('respond to') || lowerQuery.includes('reply to') || lowerQuery.includes('email')) {
    if (lowerQuery.includes('maintenance')) return { type: 'email_response', subtype: 'maintenance_acknowledgment' };
    if (lowerQuery.includes('complaint')) return { type: 'email_response', subtype: 'complaint_handling' };
    if (lowerQuery.includes('payment')) return { type: 'email_response', subtype: 'payment_query' };
    if (lowerQuery.includes('information')) return { type: 'email_response', subtype: 'information_request' };
    return { type: 'email_response', subtype: 'leaseholder_inquiry' };
  }

  // Leak triage detection
  if (lowerQuery.includes('leak') || lowerQuery.includes('water damage') || lowerQuery.includes('damp')) {
    return { type: 'leak_triage' };
  }

  // Access code queries (should be handled by building data, not general AI)
  if (lowerQuery.includes('access code') || lowerQuery.includes('entry code') || lowerQuery.includes('door code') || 
      lowerQuery.includes('gate code') || lowerQuery.includes('building code') || lowerQuery.includes('entrance code') ||
      (lowerQuery.includes('code') && (lowerQuery.includes('access') || lowerQuery.includes('entry') || lowerQuery.includes('door')))) {
    return { type: 'general', subtype: 'access_codes' };
  }

  return { type: 'general' };
}

// ================================
// LEAK TRIAGE POLICY
// ================================

export const LEAK_TRIAGE_POLICY = `
**BlocIQ Leak Triage Policy for UK Long-Lease Blocks:**

**1) Demised vs Communal Determination:**
- "Demised" = within a leaseholder's property (internal pipework/appliances/fixtures up to their demise)
- "Communal" = roofs, communal risers/stacks, structure, external walls, common pipes before they branch to private demise
- If ceiling is below another flat, assume "likely demised above" unless clear evidence indicates roof/communal origin

**2) First Step – Flat-to-Flat Contact:**
- Ask the reporting leaseholder to contact the flat above for quick local check/stop (stop taps, appliance checks)
- If they cannot contact or issue doesn't resolve, proceed to formal investigations

**3) Investigation Process:**
- Arrange non-invasive leak detection/plumber attendance with BOTH parties informed and consenting to access
- Make clear in writing that costs will be recharged to responsible party if source is demised
- If communal source, costs fall to the block/service charge

**4) Cost Liability:**
- Demised source = responsible leaseholder liable for detection and repair costs
- Communal source = block/communal budget handles repairs

**5) Insurance Considerations:**
- If expected costs likely exceed building policy excess, consider block insurance claim
- Responsible party (flat of origin) typically covers policy excess
- Insurer handles works if claim proceeds
- If below excess, costs are private and recharged as above

**6) Communication Requirements:**
- Use British English throughout
- Be clear, neutral, and practical
- Avoid legal overreach - refer to lease as primary authority
- DO NOT cite "Leasehold Property Act 2002 s.11" (incorrect)
- If citing legislation, note LTA 1985 s.11 applies to short tenancies, not long-leasehold obligations
- Rely primarily on lease terms for service obligations
`;

// ================================
// ENHANCED PROMPT BUILDER
// ================================

export function buildPropertyManagementPrompt(context: PropertyManagementContext, query: string, buildingData?: any): string {
  let systemPrompt = PROPERTY_MANAGEMENT_SYSTEM_PROMPT;
  let contextPrompt = '';

  // Add specific context prompts
  switch (context.type) {
    case 'notice_generation':
      if (context.subtype && NOTICE_GENERATION_PROMPTS[context.subtype as keyof typeof NOTICE_GENERATION_PROMPTS]) {
        contextPrompt = NOTICE_GENERATION_PROMPTS[context.subtype as keyof typeof NOTICE_GENERATION_PROMPTS];
      }
      break;

    case 'letter_drafting':
      if (context.subtype && LETTER_DRAFTING_PROMPTS[context.subtype as keyof typeof LETTER_DRAFTING_PROMPTS]) {
        contextPrompt = LETTER_DRAFTING_PROMPTS[context.subtype as keyof typeof LETTER_DRAFTING_PROMPTS];
      }
      break;

    case 'compliance_document':
      if (context.subtype && COMPLIANCE_PROMPTS[context.subtype as keyof typeof COMPLIANCE_PROMPTS]) {
        contextPrompt = COMPLIANCE_PROMPTS[context.subtype as keyof typeof COMPLIANCE_PROMPTS];
      }
      break;

    case 'calculation':
      if (context.subtype && CALCULATION_PROMPTS[context.subtype as keyof typeof CALCULATION_PROMPTS]) {
        contextPrompt = CALCULATION_PROMPTS[context.subtype as keyof typeof CALCULATION_PROMPTS];
      }
      break;

    case 'email_response':
      if (context.subtype && EMAIL_RESPONSE_PROMPTS[context.subtype as keyof typeof EMAIL_RESPONSE_PROMPTS]) {
        contextPrompt = EMAIL_RESPONSE_PROMPTS[context.subtype as keyof typeof EMAIL_RESPONSE_PROMPTS];
      }
      break;

    case 'leak_triage':
      contextPrompt = `Follow BlocIQ's leak triage policy for UK long-lease blocks. Provide clear guidance on responsibility determination, investigation procedures, and cost liability.`;
      systemPrompt += `\n\n${LEAK_TRIAGE_POLICY}`;
      break;
  }

  // Add building context if available
  if (buildingData) {
    systemPrompt += `\n\n**BUILDING CONTEXT:**
Building: ${buildingData.name || 'Not specified'}
Address: ${buildingData.address || 'Not specified'}
Units: ${buildingData.unit_count || 'Not specified'}
${buildingData.building_manager_name ? `Manager: ${buildingData.building_manager_name}` : ''}`;
  }

  // Add specific context prompt
  if (contextPrompt) {
    systemPrompt += `\n\n**SPECIFIC TASK:**\n${contextPrompt}`;
  }

  return systemPrompt;
}