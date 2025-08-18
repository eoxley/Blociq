import BatchUpload from "./BatchUpload";

export default function CompliancePageExample({ buildingId }: { buildingId: string }) {
  return (
    <div className="space-y-6">
      {/* Your existing compliance status widgets */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Compliance Overview</h2>
        {/* Your existing compliance widgets would go here */}
        <p className="text-gray-600">Existing compliance status and tracking...</p>
      </div>

      {/* New Batch Upload Section */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Batch Upload (AI)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload multiple compliance documents and let AI analyse, classify, and set tracking automatically.
        </p>
        <BatchUpload buildingId={buildingId} />
      </div>
    </div>
  );
}
