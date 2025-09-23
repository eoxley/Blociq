// Test script for Fire Risk Assessment compliance tracking
// Run with: node scripts/test-fire-risk-assessment.js

const fireRiskAssessmentData = {
  document_type: "Fire Risk Assessment",
  compliance_status: "Requires-Action",
  property_details: {
    address: "42 Ashwood Gardens, London, SW19 8JR",
    description: "Residential House (HMO)",
    client: "Ashwood Property Management Ltd"
  },
  inspection_details: {
    inspection_date: "2024-03-15",
    next_inspection_due: "2025-03-15",
    inspector: "Michael Thompson",
    company: "Fire Safety Consultants Ltd",
    certificate_number: "FRA-ASH-2024-003"
  },
  key_findings: [
    {
      priority: "High",
      urgency: "IMMEDIATE",
      description: "Smoke detector in hallway not functioning",
      location: "Ground Floor",
      action: "Replace faulty smoke detector immediately"
    },
    {
      priority: "Medium",
      urgency: "WITHIN 1 MONTH",
      description: "Emergency lighting unit requires battery replacement",
      location: "Stairwell",
      action: "Replace emergency lighting battery"
    },
    {
      priority: "Medium",
      urgency: "WITHIN 2 MONTHS",
      description: "Fire extinguisher requires annual service",
      location: "Kitchen",
      action: "Arrange professional service"
    },
    {
      priority: "Low",
      urgency: "WITHIN 3 MONTHS",
      description: "Fire door closer requires adjustment",
      location: "Bedroom 3",
      action: "Adjust door closer mechanism"
    },
    {
      priority: "Low",
      urgency: "N/A",
      description: "All escape route signage adequate and visible",
      location: "Escape Route",
      action: "No action required"
    }
  ],
  recommendations: [
    {
      description: "Replace faulty smoke detector in ground floor hallway",
      reason: "Faulty smoke detector poses immediate fire risk",
      timeframe: "Within 24 hours",
      reference: "Regulatory Reform (Fire Safety) Order 2005"
    },
    {
      description: "Replace emergency lighting battery in main stairwell",
      reason: "Non-functional emergency lighting poses risk in case of fire",
      timeframe: "Within 1 month",
      reference: "Regulatory Reform (Fire Safety) Order 2005"
    },
    {
      description: "Arrange annual service for all fire extinguishers",
      reason: "Regular service ensures fire extinguishers are operational",
      timeframe: "Within 3 months",
      reference: "Regulatory Reform (Fire Safety) Order 2005"
    },
    {
      description: "Adjust fire door closer in Bedroom 3",
      reason: "Properly functioning fire doors are crucial for fire containment",
      timeframe: "Within 3 months",
      reference: "Regulatory Reform (Fire Safety) Order 2005"
    }
  ],
  risk_assessment: {
    overall_risk: "MEDIUM",
    immediate_hazards: [
      "Faulty smoke detector in ground floor hallway"
    ]
  },
  regulatory_compliance: {
    meets_current_standards: false,
    relevant_regulations: "Regulatory Reform (Fire Safety) Order 2005"
  },
  expiry_date: "2025-03-15"
}

async function testFireRiskAssessment() {
  const buildingId = "2beeec1d-a94e-4058-b881-213d74cc6830"

  try {
    console.log('🔥 Testing Fire Risk Assessment processing...')

    const response = await fetch('http://localhost:3000/api/compliance/create-from-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        buildingId: buildingId,
        analysisData: fireRiskAssessmentData,
        documentJobId: 'test-fra-' + Date.now()
      })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ Success:', result)
      console.log(`🎯 Created ${result.actions_created} action items`)
      console.log(`📊 Compliance status: ${result.status}`)
    } else {
      console.error('❌ Error:', result)
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

// Auto-run if this file is executed directly
if (typeof window === 'undefined') {
  testFireRiskAssessment()
}

module.exports = { testFireRiskAssessment, fireRiskAssessmentData }