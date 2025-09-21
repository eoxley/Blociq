import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
  };

  try {
    const supabase = await createClient();

    // Get a random selection of industry knowledge facts from the database
    const { data: facts, error } = await supabase
      .from('industry_knowledge_chunks')
      .select(`
        chunk_text,
        industry_knowledge_documents!inner(
          title,
          category,
          subcategory
        )
      `)
      .limit(50) // Get more than we need for randomization
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching industry knowledge facts:', error);
      // Return fallback facts if database fails
      return NextResponse.json({
        success: true,
        facts: getFallbackIndustryFacts()
      }, { headers });
    }

    // Process the facts into readable format
    const processedFacts = facts
      .filter(fact => fact.chunk_text && fact.chunk_text.length > 50 && fact.chunk_text.length < 300)
      .map(fact => ({
        text: `Industry fact: ${fact.chunk_text.trim()}`,
        category: fact.industry_knowledge_documents.category,
        source: fact.industry_knowledge_documents.title
      }))
      .slice(0, 25); // Limit to 25 facts

    // If no facts from database, return fallback
    if (processedFacts.length === 0) {
      return NextResponse.json({
        success: true,
        facts: getFallbackIndustryFacts()
      }, { headers });
    }

    return NextResponse.json({
      success: true,
      facts: processedFacts.map(f => f.text),
      count: processedFacts.length
    }, { headers });

  } catch (error) {
    console.error('Industry knowledge facts API error:', error);
    // Return fallback facts on any error
    return NextResponse.json({
      success: true,
      facts: getFallbackIndustryFacts()
    }, { headers });
  }
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
    "Industry fact: Service charge demands must be issued within 18 months of costs being incurred.",
    "Industry fact: The Commonhold and Leasehold Reform Act 2002 capped ground rent escalation clauses.",
    "Industry fact: Property managers handling client money must be CMP (Client Money Protection) covered.",
    "Industry fact: The Building Safety Regulator can issue fines up to £10M for serious breaches.",
    "Industry fact: Leaseholder consultation responses under 25% still constitute valid consultation.",
    "Industry fact: The average property management fee ranges from £180-£350 per unit annually."
  ];
}