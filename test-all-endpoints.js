const questions = [
  "What are the key changes in the Leasehold and Freehold Reform Act 2024?",
  "How will the Housing Reform Act affect managing agents?",
  "What is the impact of abolishing marriage value for enfranchisement?",
  "Do the new reforms allow leaseholders to extend leases to 990 years?",
  "What are the statutory consultation requirements under Section 20?",
  "When is a Section 20B notice required and what happens if it's missed?",
  "How does the Building Safety Act affect non-HRB buildings?",
  "What are my obligations under the new Fire Safety (England) Regulations?",
  "What does \"demised premises\" mean in a lease context?",
  "How should we handle a complaint about a neighbour's noise under block management law?",
  "What is a Right to Manage (RTM) company and how does it affect the agent?",
  "Who is responsible for communal pipework under leasehold law?",
  "When can a leaseholder sublet their property without consent?",
  "What are the requirements for serving a Notice of Intention under Section 20?",
  "How do we calculate an individual Section 20 threshold?",
  "What are the requirements for EWS1 forms under current guidance?",
  "What's the difference between a managing agent and a landlord in law?",
  "What are the requirements for asbestos management in residential blocks?",
  "Who pays for roof repairs if it's not clear in the lease?",
  "What are our obligations under the Landlord and Tenant Act 1985?",
  "When must service charge demands include a Summary of Rights?",
  "What is the limitation period for recovering unpaid service charges?",
  "How should major works be funded: reserve fund or ad-hoc charges?",
  "What is the role of the Building Safety Regulator in 2025?",
  "Can we evict a resident for breach of lease as a managing agent?",
  "What's the legal process for varying a lease?",
  "When is a Section 166 ground rent notice required?",
  "How does the new Right to Request a Management Audit work?",
  "What makes a property a \"High-Risk Building\" under BSA definitions?",
  "Are building safety costs capped under the 2024 reforms?",
  "Who is responsible for window repairs in a converted block?",
  "When can a leaseholder challenge service charges at tribunal?",
  "What insurance must a freeholder carry for a leasehold block?",
  "Can we recharge legal fees to leaseholders?",
  "What are the rules for energy efficiency upgrades in leasehold blocks?",
  "How does the Commonhold model differ from leasehold?",
  "What are the data protection obligations of a managing agent?",
  "Do we need to consult leaseholders before changing managing agents?",
  "What are the risks of not registering a RTM company correctly?",
  "How should leasehold buildings prepare for Net Zero requirements?"
];

const endpoints = [
  {
    name: "Pro Ask AI",
    url: "http://localhost:3001/api/ask-ai",
    payload: (question) => ({ message: question, is_public: false })
  },
  {
    name: "Public Outlook",
    url: "http://localhost:3001/api/ask-ai-outlook-public",
    payload: (question) => ({
      emailSubject: "Property Management Question",
      emailBody: question,
      requestType: "chat"
    })
  },
  {
    name: "Addin Chat",
    url: "http://localhost:3001/api/addin/chat",
    payload: (question) => ({ message: question, source: "test" })
  }
];

async function testEndpoint(endpoint, question) {
  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(endpoint.payload(question))
    });

    const data = await response.json();

    if (data.success) {
      const responseText = data.result || data.response || 'No response';
      const industryKnowledge = data.metadata?.searchMetadata?.industryKnowledge ||
                               data.metadata?.industryKnowledgeUsed || 0;

      return {
        success: true,
        response: responseText.substring(0, 300) + '...',
        industryKnowledgeUsed: industryKnowledge,
        wordCount: responseText.split(' ').length
      };
    } else {
      return { success: false, error: data.error || 'Unknown error' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testAllQuestions() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE ASK BLOCIQ ENDPOINT TEST');
  console.log('='.repeat(80));

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    console.log(`\nQ${i+1}: ${question}`);
    console.log('-'.repeat(60));

    for (const endpoint of endpoints) {
      console.log(`\n${endpoint.name}:`);
      const result = await testEndpoint(endpoint, question);

      if (result.success) {
        console.log(`✅ Success (${result.wordCount} words, ${result.industryKnowledgeUsed} industry chunks)`);
        console.log(`Response: ${result.response}`);
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    }

    console.log('\n' + '='.repeat(80));
  }
}

testAllQuestions().catch(console.error);