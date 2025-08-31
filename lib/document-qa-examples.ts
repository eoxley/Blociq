// Examples of how the AI should handle specific lease questions
// These serve as reference patterns for the Q&A system

export const documentQAExamples = {
  windowRepairResponse: {
    question: "Who is responsible for window repairs?",
    answer: `Based on the lease document:

**TENANT RESPONSIBILITY:**
- Internal window cleaning: Tenant must "clean the inside and outside glass of the windows of the Property as often as is reasonably necessary and in any event at least once every two months" (Schedule 6, paragraph 14)
- Window frame cleaning: Tenant must "clean the external surfaces of the window frames of the Property as often as is reasonably necessary" (Schedule 6, paragraph 14)

**LANDLORD RESPONSIBILITY:**  
- Structural window repairs: The windows and frames are part of the Property description in Schedule 1, paragraph 1.6: "the doors and windows of the Property and their frames, fittings and glass"
- The tenant is responsible for keeping the Property "in good repair and condition" (Schedule 5, paragraph 10.1)

**CONCLUSION:** The tenant is responsible for both internal repairs and regular cleaning of windows, while major structural repairs may fall under general Property maintenance obligations.`,
    
    relevantSections: [
      {
        section: "window_cleaning_obligations", 
        text: "To clean the external surfaces of the window frames of the Property as often as is reasonably necessary and to clean the inside and outside glass of the windows of the Property as often as is reasonably necessary and in any event at least once every two months"
      },
      {
        section: "property_definition",
        text: "the doors and windows of the Property and their frames, fittings and glass but not the external decorative surfaces of the entrance door to the Property"
      }
    ],
    confidence: 0.85
  },

  alterationResponse: {
    question: "What are the restrictions on alterations?",
    answer: `The lease has strict alteration restrictions:

**PROHIBITED WITHOUT CONSENT:**
- External or structural alterations (Schedule 5, paragraph 8.1): "Not to make any external or structural alteration or addition to the Property"
- Internal non-structural alterations (Schedule 5, paragraph 8.3): Require "prior written consent of the Landlord, such consent not to be unreasonably withheld or delayed"
- Service Media alterations (Schedule 5, paragraph 8.4): Cannot "install, alter the route of, damage or remove any Service Media" without consent

**SPECIFICALLY PROHIBITED:**
- Cannot change "appearance, colour or method of decorative treatment" of external door surfaces or window frames (Schedule 5, paragraph 8.2)
- Cannot make openings in Property boundaries or "cut or maim any structural parts"

**END OF LEASE:**
- Must remove alterations: "before the end of the Term to remove any alterations or additions made to the Property during the Term and to restore the Property to the layout and design existing at the date of this lease" (Schedule 5, paragraph 18.1)

**CONCLUSION:** Very restrictive - almost all alterations require landlord consent, and structural changes are prohibited entirely.`,
    
    relevantSections: [
      {
        section: "alteration_prohibitions",
        text: "Not to make any external or structural alteration or addition to the Property or make any opening in any boundary of the Property or cut or maim any structural parts of the Building."
      },
      {
        section: "internal_alterations", 
        text: "Not to make any internal, non-structural alteration or addition to the Property, or alteration to the plan, design or elevation of the Property, without the prior written consent of the Landlord"
      }
    ],
    confidence: 0.95
  },

  rentResponse: {
    question: "What's the current rent and when will it increase?",
    answer: `**CURRENT RENT:**
- Initial Rent: £450 per annum (excluding VAT)
- Payment Dates: 25 March and 29 September each year (two equal instalments)

**RENT INCREASES:**
- First Review: 29 September 2025
- Subsequent Reviews: Every 10 years (2035, 2045, etc.)
- Method: Indexed to RPI (Retail Prices Index) - "upwards only" reviews
- Formula: Current rent × (New RPI / Base RPI from August 2015)

**CALCULATION:**
The rent will be the greater of:
1. The current rent amount, OR  
2. The indexed rent based on RPI inflation

**PAYMENT TERMS:**
- Paid in advance by standing order or landlord's preferred method
- Late payment incurs interest at 4% above HSBC base rate
- Cannot use set-off or deductions

**CONCLUSION:** Rent starts very low at £450/year but will increase significantly at first review in 2025 based on RPI inflation, then every 10 years thereafter.`,
    
    relevantSections: [
      {
        section: "rent_review_dates",
        text: "29 September 2025 and every tenth anniversary of that date during the Term"
      },
      {
        section: "initial_rent",
        text: "the yearly rent of £450 per annum, excluding VAT, and so in proportion for any period less than a year"
      }
    ],
    confidence: 0.92
  }
};

// Enhanced processing logic patterns
export const questionProcessingPatterns = {
  structure: {
    introduction: "Based on the lease document:",
    sections: [
      "**MAIN RESPONSIBILITY/OBLIGATION:**",
      "**SPECIFIC DETAILS:**", 
      "**EXCEPTIONS/CONDITIONS:**",
      "**CONCLUSION:**"
    ],
    citations: "Always include (Schedule X, paragraph Y.Z) references",
    quotes: "Use exact quotes with quotation marks for key clauses"
  },
  
  analysisSteps: [
    "1. **Keyword Detection**: Identify question type (repair, alteration, rent, etc.)",
    "2. **Document Search**: Find relevant clauses and schedules",  
    "3. **Context Assembly**: Gather all related sections",
    "4. **AI Analysis**: Process with legal document understanding",
    "5. **Citation**: Reference specific clauses and paragraphs", 
    "6. **Confidence Scoring**: Rate answer reliability based on document evidence",
    "7. **Response Formatting**: Structure with clear sections and conclusions"
  ],

  commonQuestions: {
    windows: ["window", "glass", "repair", "maintenance", "cleaning"],
    alterations: ["alteration", "modification", "change", "structural", "permission", "consent"],
    rent: ["rent", "payment", "review", "increase", "RPI", "inflation"],
    repairs: ["repair", "maintenance", "condition", "responsibility", "obligation"],
    assignment: ["assignment", "transfer", "subletting", "consent", "licence"],
    termination: ["termination", "end", "expire", "forfeiture", "break"],
    insurance: ["insurance", "cover", "policy", "risk", "indemnity"],
    serviceCharges: ["service charge", "proportion", "cost", "management"]
  }
};

export const responseQualityStandards = {
  structure: "Must use clear headings and bullet points",
  citations: "Always reference specific Schedule and paragraph numbers", 
  quotes: "Include exact quotes from document for key points",
  conclusion: "End with clear summary of obligations/rights",
  confidence: "Base confidence on specificity and number of relevant sections found",
  length: "Detailed enough to be actionable, concise enough to be readable"
};

export default documentQAExamples;