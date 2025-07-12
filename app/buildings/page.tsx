"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";

export default function BuildingsPage() {
  const buildings = [
    {
      id: 1,
      name: "Riverside Apartments",
      address: "123 River St, Downtown",
      units: 24,
      occupied: 22,
      revenue: "$18,400",
      status: "Good",
    },
    {
      id: 2,
      name: "Sunset Plaza",
      address: "456 Sunset Blvd, Midtown",
      units: 18,
      occupied: 16,
      revenue: "$14,200",
      status: "Good",
    },
    {
      id: 3,
      name: "Garden Heights",
      address: "789 Garden Ave, Uptown",
      units: 32,
      occupied: 28,
      revenue: "$22,800",
      status: "Maintenance Required",
    },
    {
      id: 4,
      name: "Oak Manor",
      address: "321 Oak St, Westside",
      units: 16,
      occupied: 15,
      revenue: "$12,600",
      status: "Good",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Good":
        return "text-green-600 bg-green-100";
      case "Maintenance Required":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Buildings</h1>
            <p className="text-gray-600 mt-2">Manage your property portfolio</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            Add Building
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Buildings</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{buildings.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Units</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {buildings.reduce((sum, building) => sum + building.units, 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Occupied Units</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {buildings.reduce((sum, building) => sum + building.occupied, 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Occupancy Rate</h3>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {Math.round(
                (buildings.reduce((sum, building) => sum + building.occupied, 0) /
                  buildings.reduce((sum, building) => sum + building.units, 0)) *
                  100
              )}%
            </p>
          </div>
        </div>

        {/* Buildings List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Buildings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Building
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Occupancy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {buildings.map((building) => (
                  <tr key={building.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{building.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {building.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {building.units}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {building.occupied}/{building.units}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {building.revenue}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          building.status
                        )}`}
                      >
                        {building.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                      <span className="mx-2">|</span>
                      <button className="text-blue-600 hover:text-blue-900">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}