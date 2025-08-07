import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { subject, location, description } = await req.json();

    if (!subject && !location) {
      return NextResponse.json({ 
        match: 'Unknown', 
        confidence: 0, 
        reasoning: 'No event details provided' 
      });
    }

    // Get all buildings for matching
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name, address');

    if (error || !buildings) {
      console.error('Error fetching buildings:', error);
      return NextResponse.json({ 
        match: 'Unknown', 
        confidence: 0, 
        reasoning: 'Failed to fetch buildings' 
      });
    }

    // Combine all text for analysis
    const eventText = `${subject || ''} ${location || ''} ${description || ''}`.toLowerCase();
    
    // AI-like matching logic
    const matches = buildings.map(building => {
      const buildingName = building.name ? building.name.toLowerCase() : '';
      const buildingAddress = building.address ? building.address.toLowerCase() : '';
      
      let score = 0;
      let reasoning = '';

      // Exact name match (highest score)
      if (buildingName && eventText.includes(buildingName)) {
        score += 0.9;
        reasoning += `Exact building name match: "${building.name}". `;
      }

      // Partial name match
      if (buildingName) {
        const buildingWords = buildingName.split(/\s+/);
        const eventWords = eventText.split(/\s+/);
        
        const matchingWords = buildingWords.filter((word: string) => 
          eventWords.some((eventWord: string) => 
            eventWord.includes(word) || word.includes(eventWord)
          )
        );

        if (matchingWords.length > 0) {
          const partialScore = (matchingWords.length / buildingWords.length) * 0.7;
          score += partialScore;
          reasoning += `Partial name match: "${matchingWords.join(', ')}". `;
        }
      }

      // Address match
      if (buildingAddress && eventText.includes(buildingAddress)) {
        score += 0.8;
        reasoning += `Address match: "${building.address}". `;
      }

      // Partial address match
      if (buildingAddress) {
        const addressWords = buildingAddress.split(/\s+/);
        const addressMatches = addressWords.filter((word: string) => 
          eventWords.some((eventWord: string) => 
            eventWord.includes(word) || word.includes(eventWord)
          )
        );

        if (addressMatches.length > 0) {
          const addressScore = (addressMatches.length / addressWords.length) * 0.6;
          score += addressScore;
          reasoning += `Partial address match: "${addressMatches.join(', ')}". `;
        }
      }

      // Common property terms that might indicate building relevance
      const propertyTerms = ['inspection', 'maintenance', 'repair', 'service', 'visit', 'meeting', 'review'];
      const hasPropertyTerms = propertyTerms.some(term => eventText.includes(term));
      
      if (hasPropertyTerms) {
        score += 0.1;
        reasoning += 'Contains property-related terms. ';
      }

      // Location-specific terms
      if (location && buildingAddress && location.toLowerCase().includes(buildingAddress.split(',')[0])) {
        score += 0.3;
        reasoning += 'Location matches building area. ';
      }

      return {
        building,
        score,
        reasoning: reasoning.trim() || 'General analysis of event details'
      };
    });

    // Sort by score and get the best match
    matches.sort((a, b) => b.score - a.score);
    const bestMatch = matches[0];

    if (bestMatch && bestMatch.score > 0.3) {
      return NextResponse.json({
        match: bestMatch.building.name,
        confidence: Math.min(bestMatch.score, 1),
        reasoning: bestMatch.reasoning,
        alternatives: matches.slice(1, 3).map(m => ({
          name: m.building.name,
          score: m.score
        }))
      });
    } else {
      return NextResponse.json({
        match: 'Unknown',
        confidence: 0,
        reasoning: 'No confident building match found based on event details'
      });
    }

  } catch (error) {
    console.error('Error in building matching:', error);
    return NextResponse.json({
      match: 'Unknown',
      confidence: 0,
      reasoning: 'Error processing building match request'
    }, { status: 500 });
  }
} 