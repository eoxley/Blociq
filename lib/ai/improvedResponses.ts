// Improved AI Assistant Responses for BlocIQ
// Following property manager tone, British English, and UK leasehold law

export interface ImprovedResponse {
  id: number;
  topic: string;
  response: string;
  legalContext?: string;
  nextSteps?: string[];
  keyPoints?: string[];
}

export const improvedResponses: ImprovedResponse[] = [
  {
    id: 2,
    topic: "C2 Remedial Works (EICR)",
    response: `As the managing agent, you have a **statutory obligation** to address C2 remedial works identified in the EICR (Electrical Installation Condition Report) within 28 days of receiving the report.

**Legal Framework:**
- Electrical Safety Standards in the Private Rented Sector (England) Regulations 2020
- Building Safety Act 2022 requirements
- Landlord and Tenant Act 1985 Section 11 repair obligations

**Immediate Actions Required:**
1. **Notify the freeholder** within 7 days of receiving the EICR
2. **Obtain quotes** from NICEIC-registered electricians for remedial works
3. **Schedule works** within the 28-day compliance window
4. **Document all communications** with leaseholders regarding access arrangements

**Service Charge Implications:**
- C2 works are typically recoverable through service charges
- Consider whether works fall under the lease's definition of "repairs"
- If disputed, prepare for potential First-tier Tribunal (Property Chamber) proceedings

**Next Steps:**
- Contact your approved electrical contractor immediately
- Issue formal notice to leaseholders about access requirements
- Consider whether a Section 20 consultation is required (if works exceed £250 per leaseholder)
- Update your compliance register with completion dates

**Risk Management:**
Failure to complete C2 works within 28 days constitutes a criminal offence under the Electrical Safety Regulations, with potential fines of up to £30,000.`,
    legalContext: "Electrical Safety Standards in the Private Rented Sector (England) Regulations 2020, Building Safety Act 2022",
    nextSteps: [
      "Notify freeholder within 7 days",
      "Obtain quotes from NICEIC-registered electricians", 
      "Schedule works within 28-day window",
      "Issue access notices to leaseholders",
      "Update compliance register"
    ],
    keyPoints: [
      "28-day statutory compliance window",
      "Criminal offence if not completed",
      "Service charge recovery likely",
      "Document all communications"
    ]
  },
  {
    id: 3,
    topic: "Section 20 Threshold",
    response: `The Section 20 consultation threshold for Ashwood House is calculated based on the **total number of leaseholders** and the **cost per leaseholder**.

**Calculation Method:**
- **Threshold:** £250 per leaseholder
- **Total cost ÷ Number of leaseholders = Cost per leaseholder**
- If this exceeds £250, Section 20 consultation is mandatory

**For Ashwood House:**
- **Total units:** [Insert actual number from database]
- **Threshold calculation:** £250 × [number of units] = £[total threshold]

**Legal Requirements (Landlord and Tenant Act 1985):**
1. **Stage 1:** Notice of intention to carry out works
2. **Stage 2:** Notice of estimates (minimum 2 estimates)
3. **Stage 3:** Notice of award of contract
4. **Consultation period:** 30 days for each stage

**Exemptions:**
- Emergency works (but must notify within 21 days)
- Works costing less than £250 per leaseholder
- Works covered by existing long-term agreements

**Best Practice:**
- Always consult even if below threshold (good practice)
- Keep detailed records of all communications
- Consider leaseholder feedback seriously
- Document reasons for rejecting alternative proposals

**Next Steps:**
- Calculate exact threshold for your specific works
- Prepare consultation documents if required
- Consider engaging a specialist surveyor for complex projects
- Review lease terms for any specific consultation requirements`,
    legalContext: "Landlord and Tenant Act 1985 Section 20, Consultation (England) Regulations 2003",
    nextSteps: [
      "Calculate exact threshold for your works",
      "Prepare consultation documents if required",
      "Engage specialist surveyor if complex",
      "Review lease terms"
    ],
    keyPoints: [
      "£250 per leaseholder threshold",
      "30-day consultation periods",
      "Three-stage process required",
      "Document all communications"
    ]
  },
  {
    id: 4,
    topic: "Fire Door Maintenance – Tripartite",
    response: `In a **tripartite lease structure**, fire door maintenance responsibilities are typically allocated as follows:

**Standard Tripartite Structure:**
- **Freeholder:** Owns the building and common parts
- **Management Company:** Holds the head lease and manages communal areas
- **Leaseholders:** Hold individual flat leases

**Fire Door Responsibilities:**
1. **Communal fire doors** (corridors, stairwells): Management company responsibility
2. **Flat entrance doors:** Usually leaseholder responsibility (check individual leases)
3. **Fire doors to plant rooms:** Management company responsibility

**Legal Framework:**
- **Building Safety Act 2022:** Requires fire safety information
- **Fire Safety Order 2005:** Responsible person obligations
- **Building Regulations Approved Document B:** Fire door standards
- **Lease terms:** Define specific responsibilities

**Management Company Duties:**
- Maintain communal fire doors to BS 476 or BS EN 1634 standards
- Annual fire door inspections by competent person
- Keep fire door log books updated
- Ensure self-closing devices function correctly
- Maintain fire door signage and vision panels

**Leaseholder Duties:**
- Maintain flat entrance fire doors (if specified in lease)
- Allow access for inspections and maintenance
- Not modify fire doors without consent
- Report damage or defects immediately

**Next Steps:**
- Review lease documentation for specific fire door clauses
- Conduct fire door condition survey
- Establish maintenance schedule
- Update fire risk assessment
- Consider fire door upgrade programme if needed`,
    legalContext: "Building Safety Act 2022, Fire Safety Order 2005, Building Regulations Approved Document B",
    nextSteps: [
      "Review lease documentation",
      "Conduct fire door survey",
      "Establish maintenance schedule", 
      "Update fire risk assessment",
      "Consider upgrade programme"
    ],
    keyPoints: [
      "Communal doors: Management company",
      "Flat doors: Usually leaseholder",
      "Annual inspections required",
      "BS 476/BS EN 1634 standards"
    ]
  },
  {
    id: 5,
    topic: "Service Charge Dispute – Fire Alarm",
    response: `The fire alarm upgrade is **legitimate service charge expenditure** and should be defended robustly. Here's your position:

**Legal Basis for Recovery:**
- **Landlord and Tenant Act 1985 Section 19:** Service charges must be "reasonably incurred"
- **Building Safety Act 2022:** Enhanced fire safety requirements
- **Fire Safety Order 2005:** Responsible person obligations
- **Lease terms:** Usually include fire safety systems in service charge definition

**Why This is Recoverable:**
1. **Statutory compliance:** Fire alarm systems are legally required
2. **Building safety:** Essential for leaseholder safety
3. **Insurance requirement:** Most building insurance requires adequate fire detection
4. **Lease terms:** Fire safety typically included in service charge provisions

**Response Strategy:**
1. **Provide detailed breakdown** of costs and necessity
2. **Reference statutory requirements** and building regulations
3. **Explain safety implications** of inadequate fire detection
4. **Offer to discuss payment arrangements** if financial hardship
5. **Document all communications** for potential tribunal proceedings

**If Dispute Continues:**
- **First-tier Tribunal (Property Chamber):** Leaseholder can challenge reasonableness
- **Burden of proof:** You must demonstrate costs were reasonably incurred
- **Evidence required:** Quotes, specifications, compliance certificates
- **Alternative dispute resolution:** Consider mediation before tribunal

**Next Steps:**
- Provide detailed cost breakdown to Flat 3B
- Offer meeting to discuss concerns
- Prepare tribunal defence if necessary
- Consider payment plan options`,
    legalContext: "Landlord and Tenant Act 1985 Section 19, Building Safety Act 2022, Fire Safety Order 2005",
    nextSteps: [
      "Provide detailed cost breakdown",
      "Offer meeting to discuss concerns", 
      "Prepare tribunal defence if needed",
      "Consider payment plan options"
    ],
    keyPoints: [
      "Statutory compliance required",
      "Reasonable cost test applies",
      "Tribunal defence possible",
      "Document all communications"
    ]
  },
  {
    id: 6,
    topic: "Contractor Risk Assessments",
    response: `**Yes, you are responsible** for ensuring contractors have adequate risk assessments for communal area works. This is a **health and safety legal requirement**.

**Your Legal Obligations:**
- **Health and Safety at Work etc. Act 1974:** Duty of care to contractors and visitors
- **Construction (Design and Management) Regulations 2015:** Principal contractor duties
- **Management of Health and Safety at Work Regulations 1999:** Risk assessment requirements
- **Building Safety Act 2022:** Enhanced safety responsibilities

**Required Documentation:**
1. **Method statements** for all works
2. **Risk assessments** for specific activities
3. **COSHH assessments** if hazardous materials involved
4. **Permit to work** systems for high-risk activities
5. **Insurance certificates** (minimum £5 million public liability)

**Pre-Work Requirements:**
- **Contractor vetting:** Check health and safety records
- **Site-specific risk assessments** for your building
- **Leaseholder notifications** about works and safety measures
- **Access arrangements** and security considerations
- **Emergency procedures** during works

**Ongoing Monitoring:**
- **Regular site inspections** during works
- **Safety briefings** for all workers
- **Incident reporting** procedures
- **Leaseholder communication** about progress and safety

**Next Steps:**
- Review contractor health and safety documentation
- Ensure site-specific risk assessments are completed
- Establish monitoring procedures
- Update leaseholders about safety measures`,
    legalContext: "Health and Safety at Work etc. Act 1974, Construction (Design and Management) Regulations 2015, Building Safety Act 2022",
    nextSteps: [
      "Review contractor H&S documentation",
      "Ensure site-specific risk assessments",
      "Establish monitoring procedures",
      "Update leaseholders about safety"
    ],
    keyPoints: [
      "Legal duty of care applies",
      "CDM Regulations apply",
      "Documentation required",
      "Ongoing monitoring needed"
    ]
  },
  {
    id: 7,
    topic: "Major Works Project Preparation",
    response: `Preparing for major works at Ashwood House requires **comprehensive planning** and **legal compliance**. Here's your essential checklist:

**Pre-Project Planning (3-6 months ahead):**
1. **Feasibility study** with specialist surveyor
2. **Budget preparation** with 10-15% contingency
3. **Lease review** for consultation requirements
4. **Planning permission** checks if required
5. **Building regulations** compliance review

**Section 20 Consultation (if applicable):**
- **Stage 1:** Notice of intention (30-day consultation)
- **Stage 2:** Notice of estimates (30-day consultation)  
- **Stage 3:** Notice of award (30-day consultation)
- **Total minimum time:** 90 days plus procurement

**Legal Compliance:**
- **Building Safety Act 2022:** Safety case requirements
- **Construction (Design and Management) Regulations 2015:** CDM compliance
- **Party Wall etc. Act 1996:** Party wall notices if required
- **Planning permission:** Check if works require consent

**Financial Planning:**
- **Service charge implications** and leaseholder impact
- **Reserve fund** availability and requirements
- **Insurance considerations** during works
- **Contingency funding** for unforeseen issues

**Contractor Selection:**
- **Competitive tendering** (minimum 3 quotes)
- **Contractor vetting** and references
- **Insurance requirements** (minimum £5 million public liability)
- **Performance bonds** for large projects

**Leaseholder Communication:**
- **Regular updates** throughout the process
- **Access arrangements** and disruption minimisation
- **Temporary accommodation** considerations if needed
- **Complaints procedure** during works

**Next Steps:**
- Engage specialist surveyor for feasibility study
- Review lease terms for consultation requirements
- Prepare initial budget and timeline
- Establish project team and responsibilities`,
    legalContext: "Landlord and Tenant Act 1985 Section 20, Building Safety Act 2022, Construction (Design and Management) Regulations 2015",
    nextSteps: [
      "Engage specialist surveyor",
      "Review lease consultation requirements",
      "Prepare budget and timeline",
      "Establish project team"
    ],
    keyPoints: [
      "90-day minimum consultation",
      "CDM compliance required",
      "Budget with 10-15% contingency",
      "Regular leaseholder communication"
    ]
  }
];

// Helper function to improve existing responses
export function improveResponse({
  id,
  topic,
  oldResponse,
  style = "property manager tone",
  language = "British English",
  goals = [
    "Be legally accurate",
    "Be actionable and brief where possible", 
    "Include next steps or options",
    "Include law or best practice if relevant"
  ]
}: {
  id: number;
  topic: string;
  oldResponse: string;
  style?: string;
  language?: string;
  goals?: string[];
}): ImprovedResponse {
  // Find the improved response for this topic
  const improved = improvedResponses.find(r => r.id === id);
  
  if (improved) {
    return improved;
  }
  
  // Fallback for topics not in our improved list
  return {
    id,
    topic,
    response: `As the managing agent, you should address this matter professionally and in accordance with UK leasehold law and best practice.

**Key Considerations:**
- Review relevant lease terms and statutory requirements
- Consider service charge implications and consultation requirements
- Document all communications and decisions
- Ensure compliance with building regulations and safety standards

**Next Steps:**
- Gather all relevant documentation
- Consult with specialist advisors if needed
- Communicate clearly with leaseholders
- Maintain detailed records of all actions taken

**Legal Framework:**
Reference relevant UK legislation including the Landlord and Tenant Act 1985, Building Safety Act 2022, and applicable building regulations.`,
    legalContext: "UK leasehold law and building regulations",
    nextSteps: [
      "Gather relevant documentation",
      "Consult specialist advisors if needed", 
      "Communicate with leaseholders",
      "Maintain detailed records"
    ],
    keyPoints: [
      "Review lease terms",
      "Consider statutory requirements",
      "Document communications",
      "Ensure compliance"
    ]
  };
}

// Export the improved responses for use in the AI system
export default improvedResponses; 