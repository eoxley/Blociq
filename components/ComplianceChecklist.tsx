import React from 'react';

interface ComplianceItem {
  name: string;
  frequency: string;
  description: string;
  isBSA?: boolean;
}

interface Category {
  title: string;
  icon: string;
  items: ComplianceItem[];
}

const complianceData: Category[] = [
  {
    title: "🧱 Building Safety Act (BSA) Compliance",
    icon: "🧱",
    items: [
      {
        name: "Building Safety Case Report (BSC)",
        frequency: "Annually",
        description: "Comprehensive safety assessment required for high-rise residential buildings over 18m.",
        isBSA: true
      },
      {
        name: "Resident Engagement Strategy",
        frequency: "Annually",
        description: "Documented approach for resident involvement in building safety decisions.",
        isBSA: true
      },
      {
        name: "Permanent Information Box (PIB)",
        frequency: "Ongoing",
        description: "Secure information storage containing building safety information for emergency services.",
        isBSA: true
      },
      {
        name: "Building Plans / As-Built Drawings",
        frequency: "Updated as required",
        description: "Accurate building plans showing structural elements and safety systems.",
        isBSA: true
      },
      {
        name: "Safety Management System",
        frequency: "Ongoing",
        description: "Systematic approach to managing building safety risks and responsibilities.",
        isBSA: true
      },
      {
        name: "Golden Thread of Information",
        frequency: "Ongoing",
        description: "Digital record of building information throughout its lifecycle.",
        isBSA: true
      },
      {
        name: "Building Safety Manager Registration",
        frequency: "Annually",
        description: "Registration of appointed Building Safety Manager with HSE.",
        isBSA: true
      },
      {
        name: "Safety Case Report Updates",
        frequency: "When significant changes occur",
        description: "Updates to safety case when building modifications or new risks identified.",
        isBSA: true
      }
    ]
  },
  {
    title: "🔥 Fire Safety",
    icon: "🔥",
    items: [
      {
        name: "Fire Risk Assessment",
        frequency: "Annually",
        description: "A legal assessment of fire hazards under the Fire Safety Order."
      },
      {
        name: "Fire Alarm System Testing",
        frequency: "Weekly",
        description: "Testing of fire alarm systems and emergency lighting."
      },
      {
        name: "Fire Door Inspection",
        frequency: "Quarterly",
        description: "Inspection of fire doors, frames, and seals for integrity."
      },
      {
        name: "Emergency Lighting Testing",
        frequency: "Monthly",
        description: "Testing of emergency lighting systems and battery backup."
      },
      {
        name: "Fire Extinguisher Servicing",
        frequency: "Annually",
        description: "Servicing and certification of portable fire extinguishers."
      },
      {
        name: "Fire Safety Training",
        frequency: "Annually",
        description: "Fire safety training for staff and residents."
      },
      {
        name: "Fire Evacuation Drills",
        frequency: "Annually",
        description: "Practice evacuation procedures with residents."
      },
      {
        name: "Fire Safety Signage",
        frequency: "Quarterly",
        description: "Inspection and maintenance of fire safety signs and notices."
      },
      {
        name: "Sprinkler System Testing",
        frequency: "Quarterly",
        description: "Testing of automatic sprinkler systems where installed."
      },
      {
        name: "Fire Safety Equipment Log",
        frequency: "Monthly",
        description: "Maintenance log of all fire safety equipment and systems."
      }
    ]
  },
  {
    title: "💧 Water Safety",
    icon: "💧",
    items: [
      {
        name: "Legionella Risk Assessment",
        frequency: "Annually",
        description: "Assessment of water systems for legionella bacteria risks."
      },
      {
        name: "Water Temperature Monitoring",
        frequency: "Monthly",
        description: "Monitoring of hot and cold water temperatures."
      },
      {
        name: "Water Tank Cleaning",
        frequency: "Annually",
        description: "Cleaning and disinfection of water storage tanks."
      },
      {
        name: "Water System Flushing",
        frequency: "Quarterly",
        description: "Flushing of infrequently used water outlets."
      },
      {
        name: "Water Quality Testing",
        frequency: "Annually",
        description: "Testing of water quality for bacteria and contaminants."
      },
      {
        name: "Water Safety Management",
        frequency: "Ongoing",
        description: "Documented water safety management procedures."
      },
      {
        name: "Water System Maintenance",
        frequency: "Quarterly",
        description: "Maintenance of water distribution systems and pumps."
      }
    ]
  },
  {
    title: "⚡ Electrical Safety",
    icon: "⚡",
    items: [
      {
        name: "Electrical Installation Condition Report (EICR)",
        frequency: "Every 5 years",
        description: "Comprehensive electrical safety inspection and testing."
      },
      {
        name: "Portable Appliance Testing (PAT)",
        frequency: "Annually",
        description: "Testing of portable electrical equipment."
      },
      {
        name: "Emergency Lighting Testing",
        frequency: "Monthly",
        description: "Testing of emergency lighting systems and battery backup."
      },
      {
        name: "Electrical Safety Inspection",
        frequency: "Annually",
        description: "Visual inspection of electrical installations and equipment."
      },
      {
        name: "Consumer Unit Testing",
        frequency: "Annually",
        description: "Testing of consumer units and circuit breakers."
      },
      {
        name: "Electrical Safety Certificate",
        frequency: "Every 5 years",
        description: "Certification of electrical installation safety."
      }
    ]
  },
  {
    title: "🏗️ Structural & Building Integrity",
    icon: "🏗️",
    items: [
      {
        name: "Structural Survey",
        frequency: "Every 10 years",
        description: "Comprehensive structural assessment of the building."
      },
      {
        name: "Roof Inspection",
        frequency: "Annually",
        description: "Inspection of roof condition, gutters, and drainage."
      },
      {
        name: "External Wall Inspection",
        frequency: "Annually",
        description: "Inspection of external walls, cladding, and render."
      },
      {
        name: "Foundation Monitoring",
        frequency: "Every 5 years",
        description: "Monitoring of building foundations and settlement."
      },
      {
        name: "Drainage System Inspection",
        frequency: "Annually",
        description: "Inspection of drainage systems and sewer connections."
      },
      {
        name: "Balcony Safety Inspection",
        frequency: "Annually",
        description: "Inspection of balconies, railings, and safety barriers."
      },
      {
        name: "Window and Glazing Inspection",
        frequency: "Annually",
        description: "Inspection of windows, glazing, and safety glass."
      }
    ]
  },
  {
    title: "🛠️ Operational Maintenance",
    icon: "🛠️",
    items: [
      {
        name: "Lift Maintenance Certificate",
        frequency: "Annually",
        description: "Annual lift maintenance and safety certification."
      },
      {
        name: "HVAC System Servicing",
        frequency: "Quarterly",
        description: "Servicing of heating, ventilation, and air conditioning systems."
      },
      {
        name: "Boiler Servicing",
        frequency: "Annually",
        description: "Annual boiler servicing and safety inspection."
      },
      {
        name: "Gas Safety Certificate",
        frequency: "Annually",
        description: "Annual gas safety inspection and certification."
      },
      {
        name: "Asbestos Management Survey",
        frequency: "Every 5 years",
        description: "Survey and management plan for asbestos-containing materials."
      },
      {
        name: "Energy Performance Certificate (EPC)",
        frequency: "Every 10 years",
        description: "Building energy efficiency assessment and certification."
      },
      {
        name: "Building Insurance Certificate",
        frequency: "Annually",
        description: "Proof of building insurance coverage and renewal."
      },
      {
        name: "Maintenance Schedule Review",
        frequency: "Quarterly",
        description: "Review and update of building maintenance schedules."
      }
    ]
  },
  {
    title: "📑 Legal & Insurance",
    icon: "📑",
    items: [
      {
        name: "Building Insurance Policy",
        frequency: "Annually",
        description: "Comprehensive building insurance policy renewal."
      },
      {
        name: "Employers' Liability Insurance",
        frequency: "Annually",
        description: "Insurance for staff and contractors working on site."
      },
      {
        name: "Public Liability Insurance",
        frequency: "Annually",
        description: "Insurance for public liability and third-party claims."
      },
      {
        name: "Professional Indemnity Insurance",
        frequency: "Annually",
        description: "Insurance for professional services and advice."
      },
      {
        name: "Lease Compliance Review",
        frequency: "Annually",
        description: "Review of lease terms and compliance requirements."
      },
      {
        name: "Health and Safety Policy",
        frequency: "Annually",
        description: "Updated health and safety policy and procedures."
      },
      {
        name: "Risk Assessment Review",
        frequency: "Annually",
        description: "Review and update of building risk assessments."
      },
      {
        name: "Contractor Insurance Verification",
        frequency: "Before each contract",
        description: "Verification of contractor insurance and qualifications."
      }
    ]
  },
  {
    title: "🌿 Environmental & Sustainability",
    icon: "🌿",
    items: [
      {
        name: "Energy Performance Assessment",
        frequency: "Every 10 years",
        description: "Assessment of building energy performance and efficiency."
      },
      {
        name: "Carbon Footprint Assessment",
        frequency: "Annually",
        description: "Assessment of building carbon emissions and environmental impact."
      },
      {
        name: "Waste Management Review",
        frequency: "Quarterly",
        description: "Review of waste management procedures and recycling."
      },
      {
        name: "Sustainable Procurement Policy",
        frequency: "Annually",
        description: "Policy for sustainable procurement and materials selection."
      },
      {
        name: "Green Building Certification",
        frequency: "Every 5 years",
        description: "Assessment for green building certification schemes."
      },
      {
        name: "Environmental Impact Assessment",
        frequency: "Every 5 years",
        description: "Assessment of building environmental impact and improvements."
      }
    ]
  },
  {
    title: "🧰 Optional / Good Practice",
    icon: "🧰",
    items: [
      {
        name: "Building Security Assessment",
        frequency: "Annually",
        description: "Assessment of building security systems and procedures."
      },
      {
        name: "Accessibility Audit",
        frequency: "Every 3 years",
        description: "Audit of building accessibility and disability compliance."
      },
      {
        name: "Noise Assessment",
        frequency: "Every 3 years",
        description: "Assessment of building acoustics and noise management."
      },
      {
        name: "Air Quality Monitoring",
        frequency: "Annually",
        description: "Monitoring of indoor air quality and ventilation."
      },
      {
        name: "Cybersecurity Assessment",
        frequency: "Annually",
        description: "Assessment of building management system cybersecurity."
      },
      {
        name: "Resident Satisfaction Survey",
        frequency: "Annually",
        description: "Survey of resident satisfaction with building management."
      },
      {
        name: "Staff Training Review",
        frequency: "Annually",
        description: "Review and update of staff training and development."
      },
      {
        name: "Emergency Response Plan",
        frequency: "Annually",
        description: "Updated emergency response and business continuity plan."
      },
      {
        name: "Building Technology Audit",
        frequency: "Every 3 years",
        description: "Audit of building technology systems and upgrades."
      },
      {
        name: "Sustainability Report",
        frequency: "Annually",
        description: "Annual sustainability and environmental performance report."
      }
    ]
  }
];

interface ComplianceItemProps {
  item: ComplianceItem;
}

const ComplianceItem: React.FC<ComplianceItemProps> = ({ item }) => (
  <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
    <div className="flex-shrink-0">
      {item.isBSA && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          BSA
        </span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
      <p className="text-xs text-gray-600 mt-1">{item.description}</p>
      <div className="mt-2">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {item.frequency}
        </span>
      </div>
    </div>
  </div>
);

interface CategoryProps {
  category: Category;
}

const Category: React.FC<CategoryProps> = ({ category }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
      <span className="mr-2">{category.icon}</span>
      {category.title}
    </h3>
    <div className="grid gap-3">
      {category.items.map((item, index) => (
        <ComplianceItem key={index} item={item} />
      ))}
    </div>
  </div>
);

const ComplianceChecklist: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          UK Leasehold Block Management Compliance Checklist
        </h1>
        <p className="text-gray-600">
          Comprehensive compliance and good practice requirements for UK leasehold block management.
        </p>
      </div>
      
      <div className="space-y-8">
        {complianceData.map((category, index) => (
          <Category key={index} category={category} />
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Notes:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>BSA</strong> items are Building Safety Act regulated requirements</li>
          <li>• Frequencies are recommendations and may vary based on building type and risk</li>
          <li>• Some items may require professional certification or specialist assessment</li>
          <li>• Always consult with qualified professionals for specific compliance requirements</li>
        </ul>
      </div>
    </div>
  );
};

export default ComplianceChecklist; 