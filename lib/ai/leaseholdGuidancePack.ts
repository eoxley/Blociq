/**
 * Leasehold Guidance Pack
 * Core knowledge always injected into BlocIQ responses
 */

export const LEASEHOLD_GUIDANCE_PACK = `
REFERENCE PACK – ALWAYS APPLY (UK Leasehold Block Management):

1. **Section 21 LTA 1985**: Leaseholders can request a written summary of costs behind service charges. The landlord must provide this within one month of the request, or within six months of the end of the accounting period, whichever is later.

2. **Section 22 LTA 1985**: Leaseholders have the right to inspect invoices, receipts, and supporting documents relating to service charges. This inspection must be permitted within one month of request.

3. **Section 20 LTA 1985**: Major works or long-term agreements requiring consultation if costs exceed £250 per leaseholder, or £100 for long-term agreements.

4. **Service Charge Principles**: 
   - Must relate to actual expenditure
   - Must be reasonably incurred
   - Must relate to services or works of a reasonable standard
   - Must comply with lease terms

5. **Building Safety Act 2022**: 
   - Higher Risk Buildings (HRBs) have specific duties
   - Building Safety Manager requirements
   - Fire Safety compliance obligations
   - Resident engagement requirements

6. **RICS Service Charge Code (4th Edition)**:
   - Transparent accounting
   - Regular reporting
   - Consultation requirements
   - Dispute resolution procedures

7. **Common Compliance Assets**:
   - Fire Risk Assessment (FRA) - annual review
   - Electrical Installation Condition Report (EICR) - 5 yearly
   - Lifting Operations and Lifting Equipment Regulations (LOLER) - 6 monthly
   - Asbestos Management Survey - as required
   - Legionella Risk Assessment - 2 yearly

8. **Key Terminology**:
   - "Tenant" in block management context = "Leaseholder"
   - "Landlord" = Freeholder or Management Company
   - "Demised premises" = Property covered by lease
   - "Service charge" = Variable charge for services and maintenance

9. **Statutory Rights**:
   - Right to request service charge breakdown
   - Right to inspect supporting documentation
   - Right to challenge unreasonable charges
   - Right to consultation on major works

10. **Professional Standards**:
    - ARMA (Association of Residential Managing Agents) guidance
    - TPI (The Property Institute) best practice
    - UK Finance guidance for leasehold properties
`;

export const LEASEHOLD_CONTEXT_PREFIX = `
IMPORTANT: This document applies only to UK long leasehold block management. Do not confuse with residential tenancies (ASTs) or commercial leases. All references to "tenant" should be interpreted as "leaseholder" unless explicitly stated otherwise.

`;

/**
 * Get the full guidance pack for injection
 */
export function getLeaseholdGuidancePack(): string {
  return LEASEHOLD_CONTEXT_PREFIX + LEASEHOLD_GUIDANCE_PACK;
}

/**
 * Get specific guidance sections
 */
export function getGuidanceSection(section: keyof typeof guidanceSections): string {
  return guidanceSections[section];
}

const guidanceSections = {
  serviceCharges: `
Service Charges (LTA 1985 Sections 20, 21, 22):
- Section 21: Leaseholders can request written summary of costs
- Section 22: Right to inspect invoices and supporting documents  
- Section 20: Consultation requirements for major works
- Charges must be reasonably incurred and relate to actual expenditure
`,

  buildingSafety: `
Building Safety Act 2022:
- Higher Risk Buildings (7+ storeys or 18m+ height)
- Building Safety Manager appointment required
- Resident engagement requirements
- Fire Safety compliance obligations
- Regular inspection and reporting duties
`,

  compliance: `
Common Compliance Assets:
- Fire Risk Assessment: Annual review required
- EICR: Electrical safety check every 5 years
- LOLER: Lifting equipment inspection every 6 months
- Asbestos Survey: As required by risk assessment
- Legionella Assessment: Every 2 years minimum
`,

  terminology: `
Key Terminology for Block Management:
- "Tenant" = "Leaseholder" (unless clearly AST/commercial)
- "Landlord" = Freeholder or Management Company
- "Demised premises" = Property covered by lease
- "Service charge" = Variable charge for services/maintenance
- "Ground rent" = Fixed annual rent payment
`
};
