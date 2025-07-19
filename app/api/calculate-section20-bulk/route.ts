import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

interface LeaseholderData {
  unit: string;
  name: string;
  apportionment: number;
  threshold: number;
  triggersConsultation: boolean;
  consultationRequired: boolean;
}

interface BulkCalculationResult {
  buildingThreshold: number;
  leaseholders: LeaseholderData[];
  totalUnits: number;
  unitsTriggeringConsultation: number;
  highestApportionment: number;
  hasCommercial: boolean;
  commercialPercentage?: number;
  residentialPercentage?: number;
  summary: {
    buildingType: string;
    consultationRequired: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      leaseholderData, 
      hasCommercial = false, 
      commercialPercentage = 0,
      worksValue = null 
    } = body;

    if (!leaseholderData || !Array.isArray(leaseholderData) || leaseholderData.length === 0) {
      return NextResponse.json({ 
        error: 'Leaseholder data is required and must be an array' 
      }, { status: 400 });
    }

    // Validate leaseholder data
    const validatedData = leaseholderData.map((item, index) => {
      if (!item.unit || !item.name || !item.apportionment) {
        throw new Error(`Invalid data at row ${index + 1}: missing unit, name, or apportionment`);
      }
      
      const apportionment = parseFloat(item.apportionment);
      if (isNaN(apportionment) || apportionment <= 0 || apportionment > 100) {
        throw new Error(`Invalid apportionment at row ${index + 1}: must be between 0 and 100`);
      }
      
      return {
        unit: item.unit.toString(),
        name: item.name.toString(),
        apportionment
      };
    });

    // Find highest apportionment
    const highestApportionment = Math.max(...validatedData.map(item => item.apportionment));
    
    // Calculate building threshold
    let buildingThreshold: number;
    let residentialPct: number;
    
    if (!hasCommercial) {
      // Residential-only building
      buildingThreshold = 250 / (highestApportionment / 100);
      residentialPct = 100;
    } else {
      // Mixed-use building
      const commercialPct = parseFloat(commercialPercentage) || 0;
      if (commercialPct < 0 || commercialPct > 100) {
        return NextResponse.json({ 
          error: 'Commercial percentage must be between 0 and 100' 
        }, { status: 400 });
      }
      
      residentialPct = 100 - commercialPct;
      buildingThreshold = (250 / (highestApportionment / 100)) * (residentialPct / 100);
    }
    
    // Calculate individual thresholds and check consultation triggers
    const processedLeaseholders: LeaseholderData[] = validatedData.map(item => {
      const individualThreshold = 250 / (item.apportionment / 100);
      const triggersConsultation = individualThreshold <= 250;
      const consultationRequired = worksValue ? worksValue > individualThreshold : false;
      
      return {
        unit: item.unit,
        name: item.name,
        apportionment: item.apportionment,
        threshold: individualThreshold,
        triggersConsultation,
        consultationRequired
      };
    });
    
    const unitsTriggeringConsultation = processedLeaseholders.filter(item => item.triggersConsultation).length;
    const unitsRequiringConsultation = processedLeaseholders.filter(item => item.consultationRequired).length;
    
    // Generate summary and recommendations
    const riskLevel = buildingThreshold <= 250 ? 'high' : buildingThreshold <= 1000 ? 'medium' : 'low';
    
    const recommendations: string[] = [];
    if (riskLevel === 'high') {
      recommendations.push('Review lease terms - threshold is very low');
      recommendations.push('Consider legal advice on consultation requirements');
      recommendations.push('Document all decisions carefully');
    } else if (riskLevel === 'medium') {
      recommendations.push('Monitor works costs closely');
      recommendations.push('Prepare Section 20 notices for major works');
      recommendations.push('Communicate clearly with leaseholders');
    } else {
      recommendations.push('Good flexibility for routine maintenance');
      recommendations.push('Standard consultation process for major works');
      recommendations.push('Maintain good communication practices');
    }
    
    if (unitsTriggeringConsultation > 0) {
      recommendations.push(`${unitsTriggeringConsultation} units have low individual thresholds - monitor closely`);
    }
    
    if (worksValue && unitsRequiringConsultation > 0) {
      recommendations.push(`Section 20 consultation required for ${unitsRequiringConsultation} units`);
    }

    const result: BulkCalculationResult = {
      buildingThreshold,
      leaseholders: processedLeaseholders,
      totalUnits: processedLeaseholders.length,
      unitsTriggeringConsultation,
      highestApportionment,
      hasCommercial,
      commercialPercentage: hasCommercial ? parseFloat(commercialPercentage) : undefined,
      residentialPercentage: residentialPct,
      summary: {
        buildingType: hasCommercial ? 'Mixed-use' : 'Residential-only',
        consultationRequired: worksValue ? worksValue > buildingThreshold : false,
        riskLevel,
        recommendations
      }
    };

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Bulk Section 20 calculation error:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate bulk Section 20 thresholds',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 