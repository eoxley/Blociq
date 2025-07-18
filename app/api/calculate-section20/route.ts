import { NextRequest, NextResponse } from 'next/server';

interface Section20Calculation {
  threshold: number;
  isResidentialOnly: boolean;
  residentialPercentage?: number;
  commercialPercentage?: number;
  highestApportionment: number;
  requiresConsultation: boolean;
  description: string;
  calculation: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      highestApportionment, 
      hasCommercial = false, 
      commercialPercentage = 0,
      worksValue = null 
    } = body;

    // Validate inputs
    if (!highestApportionment || highestApportionment <= 0 || highestApportionment > 100) {
      return NextResponse.json({ 
        error: 'Highest residential apportionment must be between 0 and 100' 
      }, { status: 400 });
    }

    if (hasCommercial && (commercialPercentage < 0 || commercialPercentage > 100)) {
      return NextResponse.json({ 
        error: 'Commercial percentage must be between 0 and 100' 
      }, { status: 400 });
    }

    // Calculate threshold
    let threshold: number;
    let calculation: string;
    let isResidentialOnly = !hasCommercial;

    if (!hasCommercial) {
      // Residential-only building
      threshold = 250 / (highestApportionment / 100);
      calculation = `£250 ÷ (${highestApportionment}% ÷ 100) = £${threshold.toFixed(2)}`;
    } else {
      // Mixed-use building
      const residentialPct = 100 - commercialPercentage;
      threshold = (250 / (highestApportionment / 100)) * (residentialPct / 100);
      calculation = `(£250 ÷ (${highestApportionment}% ÷ 100)) × (${residentialPct}% ÷ 100) = £${threshold.toFixed(2)}`;
    }

    // Determine if consultation is required
    const requiresConsultation = worksValue ? worksValue > threshold : null;

    // Generate description
    let description = '';
    if (threshold <= 250) {
      description = '⚠️ This threshold is very low. Consider reviewing lease terms or consulting with legal advisors.';
    } else if (threshold <= 1000) {
      description = 'This means any qualifying works above this value will require formal consultation under Section 20.';
    } else {
      description = 'This threshold provides good flexibility for routine maintenance and minor works without requiring consultation.';
    }

    if (requiresConsultation !== null) {
      if (requiresConsultation) {
        description += `\n\n🔴 CONSULTATION REQUIRED: The proposed works value of £${worksValue.toLocaleString()} exceeds the threshold of £${threshold.toLocaleString()}. You must follow the Section 20 consultation process.`;
      } else {
        description += `\n\n🟢 NO CONSULTATION REQUIRED: The proposed works value of £${worksValue.toLocaleString()} is below the threshold of £${threshold.toLocaleString()}.`;
      }
    }

    const result: Section20Calculation = {
      threshold,
      isResidentialOnly,
      residentialPercentage: hasCommercial ? 100 - commercialPercentage : undefined,
      commercialPercentage: hasCommercial ? commercialPercentage : undefined,
      highestApportionment,
      requiresConsultation,
      description,
      calculation
    };

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Section 20 calculation error:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate Section 20 threshold',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 