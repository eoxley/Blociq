// Cache for industry knowledge facts
let industryFactsCache: string[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Fetch industry knowledge facts from API
async function fetchIndustryFacts(): Promise<string[]> {
  const now = Date.now();

  // Return cached facts if still valid
  if (industryFactsCache.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
    return industryFactsCache;
  }

  try {
    const response = await fetch('/api/industry-knowledge/facts');
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.facts) && data.facts.length > 0) {
        industryFactsCache = data.facts;
        lastFetchTime = now;
        return industryFactsCache;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch industry knowledge facts, using fallback:', error);
  }

  // Return fallback facts if API fails
  return getFallbackIndustryFacts();
}

function getFallbackIndustryFacts(): string[] {
  return [
    "Industry fact: 63% of UK property managers report insufficient time for compliance tasks.",
    "Industry fact: The average property manager oversees 150-300 units across multiple buildings.",
    "Industry fact: Section 20 consultation periods can reduce project costs by 15-25% through competition.",
    "Industry fact: Buildings over 11m require Golden Thread compliance under the Building Safety Act.",
    "Industry fact: The average service charge tribunal case costs £5,000+ in management time alone.",
    "Industry fact: EWS1 forms are required for buildings over 18m with external cladding systems.",
    "Industry fact: 40% of leaseholder disputes stem from unclear service charge breakdowns.",
    "Industry fact: The Right to Manage can be exercised by just 50% of qualifying leaseholders.",
    "Industry fact: Building insurance claims take an average of 6-18 months to resolve fully.",
    "Industry fact: RICS standards require annual service charge budgets to be 'realistic and achievable'.",
    "Industry fact: The First-tier Tribunal (Property Chamber) handles 4,000+ leasehold cases annually.",
    "Industry fact: Major works reserves should typically be 1-2% of replacement cost annually.",
    "Industry fact: Building Risk Assessors must hold PAS 79 or equivalent qualifications.",
    "Industry fact: The average block insurance premium increased 45% between 2020-2023.",
    "Industry fact: Planned Preventative Maintenance can reduce emergency repairs by up to 70%.",
    "Industry fact: The Leasehold Reform Act 2002 requires management companies to be ARMA regulated.",
    "Industry fact: Heat networks in blocks must comply with separate regulatory frameworks from 2024.",
    "Industry fact: The average leaseholder turnover in blocks is 8-12% annually.",
    "Industry fact: Building Safety Managers must hold Level 6 qualifications for HRBs.",
    "Industry fact: Service charge demands must be issued within 18 months of costs being incurred."
  ];
}

export const welcomeMessages: string[] = [
  // Greetings
  "You turn building problems into solutions daily.",
  "Making block management smarter, one step at a time.",
  "Your AI co-pilot for leasehold management.",
  "Efficiency at your fingertips.",
  "Turning complex into simple.",
  "Helping you stay on top of every task.",
  "Your property portfolio, simplified.",
  "Clarity in service charges and compliance.",
  "Smart tools for busy property managers.",
  "The future of property management is here.",
  "BlocIQ has your back, 24/7.",
  "No more juggling spreadsheets — just clarity.",
  "Stronger communication, smoother management.",
  "Because every building deserves attention to detail.",
  "Every great building needs a great manager.",
  "Less admin, more impact.",
  "Simplify today, succeed tomorrow.",
  "Management made modern.",
  "Your workload, lightened.",

  // Pro Tips
  "Pro Tip: Keep digital copies of compliance docs so they're accessible during inspections.",
  "Pro Tip: Always log leaseholder correspondence — it builds trust and protects you later.",
  "Pro Tip: Service charge demands must align with lease terms — double-check before issuing.",
  "Pro Tip: Link Outlook calendar reminders to compliance deadlines to stay audit-ready.",
  "Pro Tip: Document leak investigations clearly — they often come back months later.",
  "Pro Tip: Store contractor insurance certs with expiry dates for easy renewal tracking.",
  "Pro Tip: Keep a record of keys and access codes — nothing slows down contractors like missing keys.",
  "Pro Tip: Summarise major works scopes for leaseholders in plain English — it avoids disputes.",
  "Pro Tip: Always note if costs might exceed £250 per leaseholder (Section 20 applies).",
  "Pro Tip: Fire risk assessments should be reviewed annually, even if no issues are found.",
  "Pro Tip: Upload meeting minutes as soon as they're approved — transparency matters.",
  "Pro Tip: Always confirm demised vs. communal when dealing with repairs — it saves arguments later.",
  "Pro Tip: Tie contractor reviews to your Outlook calendar every 6 months.",
  "Pro Tip: Ground rent terms should always be cross-checked when leases are uploaded.",
  "Pro Tip: Leaseholders love clear budgeting — one page summaries go a long way.",
  "Pro Tip: Track service charge arrears early — prevention is easier than recovery.",
  "Pro Tip: Pair budgets with last year's actuals for transparency.",
  "Pro Tip: Keep insurance schedules accessible — they're the most common leaseholder request.",
  "Pro Tip: Always check your RMC directors are copied on important communications.",
  "Pro Tip: Upload leases with searchable text — it saves hours of digging later.",
  "Pro Tip: Flag HRB buildings clearly so safety obligations are never missed.",
  "Pro Tip: Automate renewal reminders for lifts, EICRs, and FRAs — regulators won't chase you.",
  "Pro Tip: Always timestamp diary notes — tribunals value precise records.",
  "Pro Tip: Double-check contractor quotes for VAT — it's an easy one to miss.",

  // Fun Facts
  "Fun fact: The UK has over 4.6 million leasehold homes.",
  "Fun fact: The tallest residential building in the UK is Landmark Pinnacle in Canary Wharf.",
  "Fun fact: Fire doors should be checked every 6 months in residential blocks.",
  "Fun fact: A lift must be inspected at least every 6 months under LOLER.",
  "Fun fact: The Shard's maintenance team cleans 11,000 glass panels — from abseil ropes.",
  "Fun fact: The word 'mortgage' comes from Old French meaning 'death pledge.'",
  "Fun fact: The Barbican Estate is Grade II listed, protecting even its concrete walkways.",
  "Fun fact: Property management in the UK dates back to the Victorian era's tenement reforms.",
  "Fun fact: The Millennium Tower in San Francisco is sinking — and tilting!",
  "Fun fact: The Empire State Building has its own ZIP code: 10118.",
  "Fun fact: Most block lifts travel the equivalent of Mount Everest every year.",
  "Fun fact: Some old leases required tenants to pay a chicken as ground rent.",
  "Fun fact: The Barbican conservatory is the second largest in London — above a car park.",
  "Fun fact: The UK's shortest residential street is Ebenezer Place in Wick — 2.06m long.",
  "Fun fact: Some Victorian blocks still have original servant bells wired through the walls.",

  // Industry Knowledge Facts
  "Industry fact: 63% of UK property managers report insufficient time for compliance tasks.",
  "Industry fact: The average property manager oversees 150-300 units across multiple buildings.",
  "Industry fact: Section 20 consultation periods can reduce project costs by 15-25% through competition.",
  "Industry fact: Buildings over 11m require Golden Thread compliance under the Building Safety Act.",
  "Industry fact: The average service charge tribunal case costs £5,000+ in management time alone.",
  "Industry fact: EWS1 forms are required for buildings over 18m with external cladding systems.",
  "Industry fact: 40% of leaseholder disputes stem from unclear service charge breakdowns.",
  "Industry fact: The Right to Manage can be exercised by just 50% of qualifying leaseholders.",
  "Industry fact: Building insurance claims take an average of 6-18 months to resolve fully.",
  "Industry fact: RICS standards require annual service charge budgets to be 'realistic and achievable'.",
  "Industry fact: The First-tier Tribunal (Property Chamber) handles 4,000+ leasehold cases annually.",
  "Industry fact: Major works reserves should typically be 1-2% of replacement cost annually.",
  "Industry fact: Building Risk Assessors must hold PAS 79 or equivalent qualifications.",
  "Industry fact: The average block insurance premium increased 45% between 2020-2023.",
  "Industry fact: Planned Preventative Maintenance can reduce emergency repairs by up to 70%.",
  "Industry fact: The Leasehold Reform Act 2002 requires management companies to be ARMA regulated.",
  "Industry fact: Heat networks in blocks must comply with separate regulatory frameworks from 2024.",
  "Industry fact: The average leaseholder turnover in blocks is 8-12% annually.",
  "Industry fact: Building Safety Managers must hold Level 6 qualifications for HRBs.",
  "Industry fact: Service charge demands must be issued within 18 months of costs being incurred.",
  "Industry fact: The Commonhold and Leasehold Reform Act 2002 capped ground rent escalation clauses.",
  "Industry fact: Property managers handling client money must be CMP (Client Money Protection) covered.",
  "Industry fact: The Building Safety Regulator can issue fines up to £10M for serious breaches.",
  "Industry fact: Leaseholder consultation responses under 25% still constitute valid consultation.",
  "Industry fact: The average property management fee ranges from £180-£350 per unit annually.",

  // Motivational Messages (keeping some from original)
  "You've already survived worse than a passive-aggressive leaseholder. Keep going.",
  "Coffee in one hand, compliance in the other — classic BlocIQ move.",
  "You're the reason building meetings *almost* run on time.",
  "You've dodged Section 20 bullets all week — gold star ⭐",
  "Risk assessed. Stress suppressed.",
  "Your building doesn't need a hero. It has you.",
  "You know the alarm panel code. You *are* the alarm panel code.",
  "Property managers don't crack under pressure. They schedule it.",
  "There's calm in your chaos. BlocIQ just makes it prettier.",
  "That building doesn't run on vibes — it runs on your last 14 emails.",

  // Humorous Management Quotes (keeping some from original)
  "Today's forecast: 80% chance of leaseholder emails before lunch.",
  "Another invoice, another mystery charge to decode. You've trained for this.",
  "Your building's compliance status: 'It's complicated' (but you're handling it).",
  "You've mastered the art of explaining why the lift is 'temporarily' out of service.",
  "Your superpower: Making Section 20 notices sound exciting.",
  "You're the person who knows every resident's preferred complaint format.",
  "Your building runs on coffee, compliance, and your last nerve.",
  "You've learned to smile while reading passive-aggressive emails.",
  "Your building's maintenance schedule: 'When it breaks' (but you're on it).",
  "You're the reason the building hasn't descended into chaos (yet).",

  // Encouraging Messages (keeping some from original)
  "You're not just managing properties — you're managing communities.",
  "Every email you answer is one less crisis tomorrow.",
  "Your attention to detail keeps residents safe and compliant.",
  "You're the bridge between residents and regulations.",
  "Your work makes buildings better places to live.",
  "You're the unsung hero of property management.",
  "Your patience with leaseholders is legendary.",
  "You turn building problems into solutions daily.",
  "Your compliance knowledge is your superpower.",
  "You're making property management look easy (it's not)."
];

/**
 * Get a random welcome message from the array, including dynamic industry facts
 * @returns A random welcome message or a default fallback
 */
export async function getRandomWelcomeMessage(): Promise<string> {
  try {
    // Fetch fresh industry knowledge facts
    const industryFacts = await fetchIndustryFacts();

    // Combine static messages with dynamic industry facts
    const allMessages = [...welcomeMessages, ...industryFacts];

    const randomIndex = Math.floor(Math.random() * allMessages.length);
    return allMessages[randomIndex] || "Making block management smarter, one step at a time.";
  } catch (error) {
    console.warn('Error getting dynamic welcome message, using static fallback:', error);
    // Fallback to static messages only
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    return welcomeMessages[randomIndex] || "Making block management smarter, one step at a time.";
  }
}

/**
 * Synchronous version for backwards compatibility
 * @returns A random welcome message from static messages only
 */
export function getRandomWelcomeMessageSync(): string {
  const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
  return welcomeMessages[randomIndex] || "Making block management smarter, one step at a time.";
}
