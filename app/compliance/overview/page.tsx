"use client";

import React, { useState } from "react";
import { CheckCircle, Info } from "lucide-react";

// Sample data (replace with DB fetch if available)
const COMPLIANCE_ASSETS = [
  // Fire Safety
  {
    id: "FRA",
    category: "Fire Safety",
    title: "Fire Risk Assessment",
    frequency: "Annually",
    applies_to: "All buildings",
    notes: "Regulatory Reform (Fire Safety) Order 2005",
    required: true,
  },
  {
    id: "FIRE_ALARM",
    category: "Fire Safety",
    title: "Fire Alarm Testing",
    frequency: "Weekly test, 6-monthly servicing",
    applies_to: "All buildings",
    notes: "BS 5839",
    required: false,
  },
  {
    id: "EM_LIGHT",
    category: "Fire Safety",
    title: "Emergency Lighting Test",
    frequency: "Monthly test, annual 3-hr test",
    applies_to: "All buildings",
    notes: "BS 5266",
    required: false,
  },
  {
    id: "FIRE_DOOR",
    category: "Fire Safety",
    title: "Fire Door Inspection",
    frequency: "Annually or high-risk frequency",
    applies_to: "All buildings",
    notes: "Fire Safety Act 2021",
    required: false,
  },
  {
    id: "SMOKE_VENT",
    category: "Fire Safety",
    title: "Smoke Ventilation Servicing",
    frequency: "Annually",
    applies_to: "All buildings",
    notes: "BS EN 12101",
    required: false,
  },
  // Electrical
  {
    id: "EICR",
    category: "Electrical",
    title: "Electrical Installation Condition Report",
    frequency: "Every 5 years",
    applies_to: "Communal electrics",
    notes: "BS 7671",
    required: true,
  },
  {
    id: "LIGHTNING",
    category: "Electrical",
    title: "Lightning Protection Testing",
    frequency: "Annually",
    applies_to: "If installed",
    notes: "If installed",
    required: false,
  },
  {
    id: "PAT",
    category: "Electrical",
    title: "PAT Testing",
    frequency: "Annually if communal equipment present",
    applies_to: "Portable appliances (concierge, etc.)",
    notes: "",
    required: false,
  },
  // Water & Drainage
  {
    id: "LEGIONELLA",
    category: "Water & Drainage",
    title: "Legionella Risk Assessment",
    frequency: "Every 2 years",
    applies_to: "Communal water storage",
    notes: "",
    required: false,
  },
  {
    id: "COLD_TANK",
    category: "Water & Drainage",
    title: "Cold Water Tank Inspection",
    frequency: "Annually",
    applies_to: "Gravity-fed systems",
    notes: "",
    required: false,
  },
  {
    id: "SUMP_PUMP",
    category: "Water & Drainage",
    title: "Sump Pump / Drainage Servicing",
    frequency: "Annually",
    applies_to: "Basement plant",
    notes: "",
    required: false,
  },
  // Structural & Safety
  {
    id: "ASBESTOS",
    category: "Structural & Safety",
    title: "Asbestos Management Survey",
    frequency: "One-off + annual reinspection",
    applies_to: "All buildings",
    notes: "CAR 2012",
    required: false,
  },
  {
    id: "EWS1",
    category: "Structural & Safety",
    title: "External Wall System Check (EWS1 / PAS9980)",
    frequency: "As required",
    applies_to: "For relevant buildings only",
    notes: "",
    required: false,
  },
  {
    id: "SAFETY_CASE",
    category: "Structural & Safety",
    title: "Building Safety Case",
    frequency: "Annual review – HRBs only",
    applies_to: "HRBs only",
    notes: "Building Safety Act 2022",
    required: false,
  },
  // Building Systems
  {
    id: "LIFT_INSPECTION",
    category: "Building Systems",
    title: "Lift Inspection",
    frequency: "Every 6 months",
    applies_to: "Where lift is present",
    notes: "LOLER 1998",
    required: true,
  },
  {
    id: "LIFT_SERVICE",
    category: "Building Systems",
    title: "Lift Servicing",
    frequency: "Quarterly",
    applies_to: "Where lift is present",
    notes: "Best practice / manufacturer spec",
    required: false,
  },
  {
    id: "ACCESS_CONTROL",
    category: "Building Systems",
    title: "Access Control System",
    frequency: "Annually",
    applies_to: "Door entry, fob readers",
    notes: "",
    required: false,
  },
  {
    id: "SMOKE_SHAFT",
    category: "Building Systems",
    title: "Smoke Shaft Testing",
    frequency: "Annually",
    applies_to: "Where present",
    notes: "",
    required: false,
  },
  // Legal & Insurance
  {
    id: "BUILDINGS_INSURANCE",
    category: "Legal & Insurance",
    title: "Buildings Insurance",
    frequency: "Annually",
    applies_to: "All buildings",
    notes: "Lease obligation + LTA 1985",
    required: true,
  },
  {
    id: "D_O_INSURANCE",
    category: "Legal & Insurance",
    title: "Directors & Officers Insurance",
    frequency: "Annually",
    applies_to: "For RMC/RTM",
    notes: "",
    required: false,
  },
  {
    id: "ENGINEERING_INSURANCE",
    category: "Legal & Insurance",
    title: "Engineering Insurance",
    frequency: "Annually",
    applies_to: "If lift, plant or pressure systems exist",
    notes: "",
    required: false,
  },
  {
    id: "PUBLIC_LIABILITY",
    category: "Legal & Insurance",
    title: "Public Liability Certificate",
    frequency: "Annually",
    applies_to: "Especially for self-managed sites",
    notes: "",
    required: false,
  },
] as const;

type ComplianceAsset = typeof COMPLIANCE_ASSETS[number];

const groupByCategory = (assets: ComplianceAsset[]) => {
  return assets.reduce((acc: Record<string, ComplianceAsset[]>, asset: ComplianceAsset) => {
    if (!acc[asset.category]) acc[asset.category] = [];
    acc[asset.category].push(asset);
    return acc;
  }, {});
};

export default function ComplianceOverviewPage() {
  const [search, setSearch] = useState("");
  const [modalNotes, setModalNotes] = useState<string | null>(null);

  // Filter and group
  const filtered = COMPLIANCE_ASSETS.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  );
  const grouped = groupByCategory(filtered);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Compliance Overview</h1>
      <p className="mb-8 text-gray-600 max-w-2xl">
        Reference list of all compliance obligations relevant to UK leasehold block management. Use this as a master index for legal and best practice requirements.
      </p>
      <div className="mb-6 flex items-center justify-between">
        <input
          type="text"
          placeholder="Search by asset title or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
        />
      </div>
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        {Object.keys(grouped).length === 0 ? (
          <div className="p-8 text-center text-gray-500">No compliance items found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applies To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([category, assets]) => (
                <React.Fragment key={category}>
                  <tr>
                    <td colSpan={5} className="bg-gray-100 px-6 py-3 font-semibold text-gray-700 text-lg border-t border-b border-gray-200">
                      {category}
                    </td>
                  </tr>
                  {assets.map((asset) => (
                    <tr
                      key={asset.id}
                      className={
                        asset.required
                          ? "bg-green-50 font-semibold"
                          : ""
                      }
                    >
                      <td className="px-6 py-4 align-top text-gray-700">{asset.category}</td>
                      <td className="px-6 py-4 align-top flex items-center gap-2">
                        {asset.title}
                        {asset.required && (
                          <span title="Legally required" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-200 text-green-800 ml-2">
                            <CheckCircle className="h-4 w-4 mr-1" /> Required
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top text-gray-700">{asset.frequency}</td>
                      <td className="px-6 py-4 align-top text-gray-700">{asset.applies_to}</td>
                      <td className="px-6 py-4 align-top text-gray-700">
                        {asset.notes ? (
                          <button
                            className="inline-flex items-center text-teal-700 hover:underline"
                            onClick={() => setModalNotes(asset.notes)}
                          >
                            <Info className="h-4 w-4 mr-1" /> View legal basis
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Modal for notes */}
      {modalNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setModalNotes(null)}
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-4">Legal Basis / Guidance</h3>
            <div className="text-gray-700 whitespace-pre-line">{modalNotes}</div>
          </div>
        </div>
      )}
    </div>
  );
} 