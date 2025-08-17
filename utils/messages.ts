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
 * Get a random welcome message from the array
 * @returns A random welcome message or a default fallback
 */
export function getRandomWelcomeMessage(): string {
  const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
  return welcomeMessages[randomIndex] || "Making block management smarter, one step at a time.";
}
