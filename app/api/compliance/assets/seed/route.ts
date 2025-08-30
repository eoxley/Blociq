import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  try {
    // Comprehensive list of 46 compliance assets
    const complianceAssets = [
      // Fire Safety (8 items)
      {
        title: "Fire Risk Assessment",
        category: "Fire Safety",
        description: "Annual fire safety assessment required by law",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Fire Alarm System Test",
        category: "Fire Safety", 
        description: "Weekly fire alarm system test and monthly full system test",
        frequency_months: 1,
        is_required: true
      },
      {
        title: "Fire Extinguisher Inspection",
        category: "Fire Safety",
        description: "Monthly visual inspection and annual service",
        frequency_months: 1,
        is_required: true
      },
      {
        title: "Emergency Lighting Test",
        category: "Fire Safety",
        description: "Monthly function test and annual full duration test",
        frequency_months: 1,
        is_required: true
      },
      {
        title: "Fire Door Inspection",
        category: "Fire Safety",
        description: "Quarterly inspection of fire doors and self-closing devices",
        frequency_months: 3,
        is_required: true
      },
      {
        title: "Fire Safety Training",
        category: "Fire Safety",
        description: "Annual fire safety training for staff and residents",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Fire Escape Routes",
        category: "Fire Safety",
        description: "Monthly inspection of fire escape routes and signage",
        frequency_months: 1,
        is_required: true
      },
      {
        title: "Fire Safety Policy Review",
        category: "Fire Safety",
        description: "Annual review and update of fire safety policy",
        frequency_months: 12,
        is_required: true
      },

      // Gas Safety (4 items)
      {
        title: "Gas Safety Certificate",
        category: "Gas Safety",
        description: "Annual gas safety inspection certificate",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Gas Appliance Service",
        category: "Gas Safety",
        description: "Annual service of gas appliances and flues",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Gas Emergency Procedures",
        category: "Gas Safety",
        description: "Annual review of gas emergency procedures",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Gas Safety Training",
        category: "Gas Safety",
        description: "Annual gas safety awareness training",
        frequency_months: 12,
        is_required: true
      },

      // Electrical Safety (6 items)
      {
        title: "Electrical Installation Certificate",
        category: "Electrical Safety",
        description: "EICR certificate every 5 years",
        frequency_months: 60,
        is_required: true
      },
      {
        title: "Portable Appliance Testing",
        category: "Electrical Safety",
        description: "Annual PAT testing of portable electrical equipment",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Electrical Safety Inspection",
        category: "Electrical Safety",
        description: "Annual inspection of electrical installations",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Emergency Lighting Test",
        category: "Electrical Safety",
        description: "Monthly function test and annual full duration test",
        frequency_months: 1,
        is_required: true
      },
      {
        title: "Electrical Safety Policy",
        category: "Electrical Safety",
        description: "Annual review of electrical safety policy",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Electrical Safety Training",
        category: "Electrical Safety",
        description: "Annual electrical safety awareness training",
        frequency_months: 12,
        is_required: true
      },

      // Building Structure (6 items)
      {
        title: "Building Condition Survey",
        category: "Building Structure",
        description: "Comprehensive building condition survey every 5 years",
        frequency_months: 60,
        is_required: false
      },
      {
        title: "Roof Inspection",
        category: "Building Structure",
        description: "Annual roof inspection and maintenance",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "External Wall Inspection",
        category: "Building Structure",
        description: "Annual inspection of external walls and cladding",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Drainage System Inspection",
        category: "Building Structure",
        description: "Annual inspection and cleaning of drainage systems",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Structural Survey",
        category: "Building Structure",
        description: "Structural survey every 10 years or as required",
        frequency_months: 120,
        is_required: false
      },
      {
        title: "Building Insurance Survey",
        category: "Building Structure",
        description: "Annual building insurance survey",
        frequency_months: 12,
        is_required: true
      },

      // Lifts & Equipment (4 items)
      {
        title: "Lift Inspection",
        category: "Lifts & Equipment",
        description: "Annual lift safety inspection and certification",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Lift Maintenance",
        category: "Lifts & Equipment",
        description: "Monthly lift maintenance and quarterly service",
        frequency_months: 1,
        is_required: true
      },
      {
        title: "Lift Emergency Procedures",
        category: "Lifts & Equipment",
        description: "Annual review of lift emergency procedures",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Equipment Maintenance",
        category: "Lifts & Equipment",
        description: "Annual maintenance of building equipment",
        frequency_months: 12,
        is_required: true
      },

      // Water Safety (4 items)
      {
        title: "Legionella Risk Assessment",
        category: "Water Safety",
        description: "Annual legionella risk assessment",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Water System Testing",
        category: "Water Safety",
        description: "Quarterly water system testing and monitoring",
        frequency_months: 3,
        is_required: true
      },
      {
        title: "Water Safety Policy",
        category: "Water Safety",
        description: "Annual review of water safety policy",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Water Safety Training",
        category: "Water Safety",
        description: "Annual water safety awareness training",
        frequency_months: 12,
        is_required: true
      },

      // Environmental & Energy (4 items)
      {
        title: "Energy Performance Certificate",
        category: "Environmental & Energy",
        description: "EPC certificate every 10 years",
        frequency_months: 120,
        is_required: true
      },
      {
        title: "Environmental Policy Review",
        category: "Environmental & Energy",
        description: "Annual review of environmental policy",
        frequency_months: 12,
        is_required: false
      },
      {
        title: "Waste Management Review",
        category: "Environmental & Energy",
        description: "Annual review of waste management procedures",
        frequency_months: 12,
        is_required: false
      },
      {
        title: "Carbon Footprint Assessment",
        category: "Environmental & Energy",
        description: "Annual carbon footprint assessment",
        frequency_months: 12,
        is_required: false
      },

      // Health & Safety (4 items)
      {
        title: "Health & Safety Policy",
        category: "Health & Safety",
        description: "Annual health and safety policy review",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Risk Assessment Review",
        category: "Health & Safety",
        description: "Annual review of health and safety risk assessments",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Health & Safety Training",
        category: "Health & Safety",
        description: "Annual health and safety training",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Accident Investigation",
        category: "Health & Safety",
        description: "Immediate investigation of accidents and incidents",
        frequency_months: 0,
        is_required: true
      },

      // Financial & Administrative (6 items)
      {
        title: "Service Charge Accounts",
        category: "Financial & Administrative",
        description: "Annual service charge accounts preparation",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Building Insurance",
        category: "Financial & Administrative",
        description: "Annual building insurance renewal",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Budget Review",
        category: "Financial & Administrative",
        description: "Annual budget review and planning",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Leaseholder Consultation",
        category: "Financial & Administrative",
        description: "Section 20 consultation for major works",
        frequency_months: 0,
        is_required: false
      },
      {
        title: "Reserve Fund Review",
        category: "Financial & Administrative",
        description: "Annual review of reserve fund and long-term maintenance plan",
        frequency_months: 12,
        is_required: true
      },
      {
        title: "Financial Audit",
        category: "Financial & Administrative",
        description: "Annual financial audit and review",
        frequency_months: 12,
        is_required: true
      }
    ];

    // Clear existing assets and insert new ones
    const { error: clearError } = await supabaseAdmin
      .from("compliance_assets")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all but keep structure

    if (clearError) {
      console.error("Error clearing existing assets:", clearError);
      return NextResponse.json({ error: "Failed to clear existing assets" }, { status: 500 });
    }

    // Insert new assets
    const { data, error: insertError } = await supabaseAdmin
      .from("compliance_assets")
      .insert(complianceAssets)
      .select();

    if (insertError) {
      console.error("Error inserting assets:", insertError);
      return NextResponse.json({ error: "Failed to insert compliance assets" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully seeded ${data.length} compliance assets`,
      count: data.length
    });

  } catch (error: any) {
    console.error("Error seeding compliance assets:", error);
    return NextResponse.json({ error: error.message || "Seeding failed" }, { status: 500 });
  }
}
