import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getSystemPrompt } from '../../../lib/ai/systemPrompt';
import { fetchUserContext, formatContextMessages } from '../../../lib/ai/userContext';
import { logAIInteraction } from '../../../lib/ai/logInteraction';
import { searchFounderKnowledge } from '../../../lib/ai/embed';
import { Database } from '../../../lib/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Function to extract building names from user query
function extractBuildingNames(query: string): string[] {
  // Common building name patterns
  const buildingPatterns = [
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:House|Building|Court|Gardens|Mews|Place|Square|Terrace|Lodge|Manor|Hall|Residence|Apartments?)\b/gi,
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/gi, // General capitalized words
  ];

  const foundBuildings = new Set<string>();
  
  buildingPatterns.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Filter out common words that aren't building names
        const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'about', 'this', 'that', 'these', 'those'];
        if (!commonWords.includes(match.toLowerCase()) && match.length > 2) {
          foundBuildings.add(match);
        }
      });
    }
  });

  return Array.from(foundBuildings);
}

// Function to fetch building context from Supabase
async function fetchBuildingContext(buildingNames: string[]): Promise<Array<{ role: 'system'; content: string }>> {
  if (buildingNames.length === 0) return [];

  const buildingContextMessages: Array<{ role: 'system'; content: string }> = [];

  for (const buildingName of buildingNames) {
    try {
      // Search for building by name using ILIKE
      const { data: buildings, error: buildingError } = await supabase
        .from('buildings')
        .select(`
          id,
          name,
          address
        `)
        .ilike('name', `%${buildingName}%`)
        .limit(1);

      if (buildingError) {
        console.error('Error fetching building:', buildingError);
        continue;
      }

      if (buildings && buildings.length > 0) {
        const building = buildings[0];
        
        // Fetch units count for this building
        const { data: units, error: unitsError } = await supabase
          .from('units')
          .select('id')
          .eq('building_id', building.id);

        if (unitsError) {
          console.error('Error fetching units:', unitsError);
          continue;
        }

        const unitCount = units?.length || 0;
        
        // Fetch units with their details
        const { data: unitsWithDetails, error: unitsDetailsError } = await supabase
          .from('units')
          .select(`
            id,
            unit_number,
            type,
            floor
          `)
          .eq('building_id', building.id)
          .order('unit_number');

        if (unitsDetailsError) {
          console.error('Error fetching units with details:', unitsDetailsError);
          continue;
        }

        // Fetch leaseholders for this building's units
        const { data: leaseholders, error: leaseholdersError } = await supabase
          .from('leaseholders')
          .select(`
            id,
            name,
            email,
            unit_id
          `)
          .in('unit_id', units?.map(u => u.id) || []);

        if (leaseholdersError) {
          console.error('Error fetching leaseholders:', leaseholdersError);
          continue;
        }

        // Create a map of unit_id to leaseholder
        const leaseholderMap = new Map();
        leaseholders?.forEach(leaseholder => {
          leaseholderMap.set(leaseholder.unit_id, leaseholder);
        });

        // Fetch leases for this building
        const { data: leases, error: leasesError } = await supabase
          .from('leases')
          .select(`
            id,
            unit_id,
            expiry_date
          `)
          .eq('building_id', building.id);

        if (leasesError) {
          console.error('Error fetching leases:', leasesError);
          continue;
        }

        // Create a map of unit_id to lease data
        const leaseMap = new Map();
        leases?.forEach(lease => {
          leaseMap.set(lease.unit_id, lease);
        });

        // Fetch 2 most recent emails for this building
        const { data: recentEmails, error: emailsError } = await supabase
          .from('incoming_emails')
          .select(`
            id,
            subject,
            from_email,
            body_preview,
            received_at
          `)
          .eq('building_id', building.id)
          .order('received_at', { ascending: false })
          .limit(2);

        if (emailsError) {
          console.error('Error fetching recent emails:', emailsError);
          // Continue without emails if there's an error
        }

        // Build context message
        let contextMessage = `${building.name} has ${unitCount} units.`;
        
        // Add unit and leaseholder information with lease end dates
        if (unitsWithDetails && unitsWithDetails.length > 0) {
          const unitDetails = unitsWithDetails.map(unit => {
            const leaseholder = leaseholderMap.get(unit.id);
            const lease = leaseMap.get(unit.id);
            
            if (leaseholder && lease?.expiry_date) {
              const endDate = new Date(lease.expiry_date).toLocaleDateString();
              return `${unit.unit_number} is leased to ${leaseholder.name} until ${endDate}`;
            } else if (leaseholder) {
              return `${unit.unit_number} is leased to ${leaseholder.name}`;
            } else {
              return `${unit.unit_number}`;
            }
          });
          contextMessage += ' ' + unitDetails.join(', ') + '.';
        }

        // Add recent emails information
        if (recentEmails && recentEmails.length > 0) {
          contextMessage += ' Recent messages: ';
          const emailDetails = recentEmails.map(email => {
            const sender = email.from_email || 'Unknown';
            const subject = email.subject || 'No subject';
            return `from ${sender}: "${subject}"`;
          });
          contextMessage += emailDetails.join(', ') + '.';
        }

        buildingContextMessages.push({
          role: 'system',
          content: contextMessage
        });

        console.log(`Found building context for: ${building.name}`);
      } else {
        console.log(`No building found for: ${buildingName}`);
      }
    } catch (error) {
      console.error(`Error processing building ${buildingName}:`, error);
      // Continue with other buildings even if one fails
    }
  }

  return buildingContextMessages;
}

export async function POST(req: NextRequest) {
  const { prompt, userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
  }

  try {
    // 1. Extract building context from user query
    const buildingNames = extractBuildingNames(prompt);
    const buildingContextMessages = await fetchBuildingContext(buildingNames);

    // 2. Per-Agency Prompt Logic
    const userContext = await fetchUserContext(userId, supabase);
    
    // Build agency-specific context
    const agencyContext = userContext.agency 
      ? `This user works for ${userContext.agency.name}. ${userContext.agency.tone ? `Use their internal tone: ${userContext.agency.tone}.` : ''} ${userContext.agency.policies ? `Follow their internal policies: ${userContext.agency.policies}.` : ''}`
      : '';
    
    // Get system prompt with agency context
    const systemPrompt = getSystemPrompt(agencyContext);
    
    // 3. Inject Supabase Context
    const contextMessages = formatContextMessages(userContext);
    
    // 4. Search Founder Knowledge and inject into context
    let founderKnowledgeMessages: Array<{ role: 'system'; content: string }> = [];
    try {
      const knowledgeResult = await searchFounderKnowledge(prompt);
      if (knowledgeResult.success && knowledgeResult.results.length > 0) {
        founderKnowledgeMessages = knowledgeResult.results.map(chunk => ({
          role: 'system' as const,
          content: `Reference: ${chunk}`
        }));
        console.log(`Found ${knowledgeResult.results.length} relevant founder knowledge chunks`);
      } else {
        console.log('No relevant founder knowledge found for query');
      }
    } catch (error) {
      console.error('Error searching founder knowledge:', error);
      // Continue without founder knowledge if search fails
    }
    
    // 5. Build the complete message array with building context
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...contextMessages,
      ...buildingContextMessages,
      ...founderKnowledgeMessages,
      { role: 'user' as const, content: prompt }
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.3,
      max_tokens: 1000
    });

    const answer = completion.choices[0].message.content;
    
    if (!answer) {
      throw new Error('No response from OpenAI');
    }
    
    // 6. Log the Interaction (suppress errors)
    try {
      await logAIInteraction({
        user_id: userId,
        agency_id: userContext.agency?.id,
        question: prompt,
        response: answer,
        timestamp: new Date().toISOString(),
      }, supabase);
    } catch (logError) {
      // Suppress logging errors so they don't break the main flow
      console.error('Failed to log AI interaction:', logError);
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('BlocIQ AI error:', err);
    return NextResponse.json({ 
      error: 'AI failed to respond',
      details: process.env.NODE_ENV === 'development' ? err instanceof Error ? err.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}

