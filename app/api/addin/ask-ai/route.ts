import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { prompt, contextType = 'general', building_id, emailContext } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Get user from cookies (they're already authenticated if they can access the add-in)
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If no user found, return error (this shouldn't happen for add-in users)
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please ensure you are logged into BlocIQ.',
        action: 'login_required'
      }, { status: 401 });
    }

    // Now that we have a user, we can access the full database
    // For building-specific questions, we can query the database
    let buildingContext = null;
    if (building_id) {
      const { data: building } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', building_id)
        .single();
      
      if (building) {
        buildingContext = building;
      }
    }

    // For leaseholder questions, we can search the database
    let leaseholderContext = null;
    if (prompt.toLowerCase().includes('leaseholder') || prompt.toLowerCase().includes('tenant')) {
      // Extract potential names/emails from the prompt
      const emailMatch = prompt.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatch) {
        const { data: leaseholder } = await supabase
          .from('leaseholders')
          .select('*')
          .eq('email', emailMatch[0])
          .single();
        
        if (leaseholder) {
          leaseholderContext = leaseholder;
        }
      }
    }

    // For compliance questions, we can access compliance data
    let complianceContext = null;
    if (prompt.toLowerCase().includes('compliance') || prompt.toLowerCase().includes('section 20')) {
      if (building_id) {
        const { data: compliance } = await supabase
          .from('compliance_assets')
          .select('*')
          .eq('building_id', building_id)
          .limit(5);
        
        if (compliance && compliance.length > 0) {
          complianceContext = compliance;
        }
      }
    }

    // Generate contextual response based on available data
    let response = '';
    let category = 'General';

    if (prompt.toLowerCase().includes('section 20') || prompt.toLowerCase().includes('section20')) {
      category = 'Compliance';
      response = `Section 20 is a legal requirement under the Landlord and Tenant Act 1985 that applies to residential leasehold properties in England and Wales. It requires landlords to consult with leaseholders before carrying out major works that will cost any one leaseholder more than £250 in a 12-month period.

Key points:
• Applies to works costing over £250 per leaseholder
• Requires formal consultation process
• Leaseholders can challenge costs through First-tier Tribunal
• Covers major repairs, improvements, and maintenance
• Must provide estimates and allow objections

The consultation process typically involves:
1. Notice of intention to do works
2. Estimates from contractors
3. Observations from leaseholders
4. Response to observations
5. Final decision and notification

This ensures transparency and gives leaseholders a voice in major expenditure decisions affecting their building.`;
    } else if (prompt.toLowerCase().includes('leaseholder') || prompt.toLowerCase().includes('tenant')) {
      category = 'Leaseholder Management';
      if (leaseholderContext) {
        response = `Based on your database, I found information about leaseholder ${leaseholderContext.name || leaseholderContext.email}:

**Leaseholder Details:**
• Name: ${leaseholderContext.name || 'Not specified'}
• Email: ${leaseholderContext.email || 'Not specified'}
• Unit: ${leaseholderContext.unit_number || 'Not specified'}
• Building: ${leaseholderContext.building_name || 'Not specified'}

**General Leaseholder Information:**
Leaseholders are individuals who own a long-term lease (typically 99+ years) on a property within a building or development. They have both rights and responsibilities:

Rights:
• Exclusive possession of their unit
• Right to sell or sublet (subject to lease terms)
• Right to challenge unreasonable service charges
• Right to information about building management

Responsibilities:
• Pay ground rent and service charges
• Maintain their unit in good condition
• Comply with building rules and regulations
• Allow access for necessary repairs/maintenance

Service charges typically cover:
• Building insurance
• Cleaning and maintenance
• Repairs and improvements
• Management fees
• Utilities for common areas

Leaseholders can request detailed breakdowns of service charges and challenge them if they believe they're unreasonable.`;
      } else {
        response = `Leaseholders are individuals who own a long-term lease (typically 99+ years) on a property within a building or development. They have both rights and responsibilities:

Rights:
• Exclusive possession of their unit
• Right to sell or sublet (subject to lease terms)
• Right to challenge unreasonable service charges
• Right to information about building management

Responsibilities:
• Pay ground rent and service charges
• Maintain their unit in good condition
• Comply with building rules and regulations
• Allow access for necessary repairs/maintenance

Service charges typically cover:
• Building insurance
• Cleaning and maintenance
• Repairs and improvements
• Management fees
• Utilities for common areas

Leaseholders can request detailed breakdowns of service charges and challenge them if they believe they're unreasonable.`;
      }
    } else if (prompt.toLowerCase().includes('ashwood') || prompt.toLowerCase().includes('5 ashwood')) {
      category = 'Building Specific';
      if (buildingContext) {
        response = `I found information about ${buildingContext.name || '5 Ashwood'} in your database:

**Building Details:**
• Name: ${buildingContext.name || '5 Ashwood'}
• Address: ${buildingContext.address || 'Not specified'}
• Type: ${buildingContext.building_type || 'Not specified'}
• Units: ${buildingContext.total_units || 'Not specified'}

**For specific leaseholder information:**
You can check your buildings list in the main BlocIQ application or look up the property address in your portfolio. I can also help you with general property management questions or guide you on how to find specific information in your system.

Would you like me to help you with a different property management question, or would you prefer to check the main BlocIQ application for more detailed building information?`;
      } else {
        response = `I can see you're asking about 5 Ashwood. To provide specific information about leaseholders, building details, or compliance status, I would need access to your BlocIQ database.

However, I can help you with general property management questions or guide you on how to find this information in your system.

To get specific details about 5 Ashwood, you could:
• Check your buildings list in the main BlocIQ application
• Look up the property address in your portfolio
• Review any recent compliance reports or inspections
• Check the leaseholder database for current occupants

Would you like me to help you with a different property management question, or would you prefer to check the main BlocIQ application for specific building details?`;
      }
    } else if (prompt.toLowerCase().includes('compliance') || prompt.toLowerCase().includes('regulation')) {
      category = 'Compliance';
      if (complianceContext) {
        response = `Based on your database, I found compliance information for this building:

**Recent Compliance Items:**
${complianceContext.map(item => `• ${item.asset_name || 'Unnamed asset'} - ${item.status || 'Unknown status'}`).join('\n')}

**General Property Compliance Requirements:**
Property compliance covers various legal and safety requirements that landlords and property managers must meet:

Key Areas:
• Fire Safety (Fire Safety Order 2005)
• Gas Safety (Gas Safety Regulations 1998)
• Electrical Safety (Electrical Safety Standards 2020)
• Energy Performance (EPC requirements)
• Asbestos Management (Control of Asbestos Regulations 2012)
• Legionella Control (Health and Safety at Work Act 1974)

Regular Inspections Required:
• Gas safety certificate - annually
• Electrical installation condition report - every 5 years
• Fire risk assessment - annually
• Asbestos survey - when required
• Legionella risk assessment - annually

Non-compliance can result in:
• Fines and penalties
• Legal action
• Insurance invalidation
• Risk to tenant safety

It's essential to maintain compliance records and schedule regular inspections to ensure all properties meet current standards.`;
      } else {
        response = `Property compliance covers various legal and safety requirements that landlords and property managers must meet:

Key Areas:
• Fire Safety (Fire Safety Order 2005)
• Gas Safety (Gas Safety Regulations 1998)
• Electrical Safety (Electrical Safety Standards 2020)
• Energy Performance (EPC requirements)
• Asbestos Management (Control of Asbestos Regulations 2012)
• Legionella Control (Health and Safety at Work Act 1974)

Regular Inspections Required:
• Gas safety certificate - annually
• Electrical installation condition report - every 5 years
• Fire risk assessment - annually
• Asbestos survey - when required
• Legionella risk assessment - annually

Non-compliance can result in:
• Fines and penalties
• Legal action
• Insurance invalidation
• Risk to tenant safety

It's essential to maintain compliance records and schedule regular inspections to ensure all properties meet current standards.`;
      }
    } else {
      category = 'General';
      response = `I'm your BlocIQ Assistant, designed to help with property management questions. I can assist with:

• Compliance and regulations
• Leaseholder management
• Building maintenance
• Section 20 processes
• Service charge explanations
• Property law basics

For specific information about your buildings, leaseholders, or detailed compliance status, I can now access your full BlocIQ database to provide contextual responses.

What specific property management question can I help you with today?`;
    }

    // Return the response with full database context
    return NextResponse.json({
      response: response,
      category: category,
      contextType: contextType,
      building_id: building_id || null,
      building_context: buildingContext,
      leaseholder_context: leaseholderContext,
      compliance_context: complianceContext,
      timestamp: new Date().toISOString(),
      source: 'outlook_addin',
      user_id: user.id,
      database_access: 'full'
    });

  } catch (error) {
    console.error('Add-in Ask AI failed:', error);
    
    return NextResponse.json({ 
      error: 'Failed to generate response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  // Handle preflight request for CORS
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://outlook.office.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
