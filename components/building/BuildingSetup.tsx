import { Card, CardContent } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function BuildingSetup() {
  const structure = {
    ownershipModel: "Tripartite",
    freeholder: "E&M Estates Ltd",
    rmc: "Ashwood House RMC Ltd",
    managingAgent: "MIH Property Management",
  }

  const directors = [
    {
      name: "Maria Kokkinou",
      role: "Chairperson",
      contact: "maria@ashwoodrmc.co.uk",
      notes: "Prefers email comms",
    },
    {
      name: "Peter Weil",
      role: "Director",
      contact: "peter@ashwoodrmc.co.uk",
      notes: "Regular contact for budgets",
    },
    {
      name: "John Ogilvie",
      role: "Director",
      contact: null,
      notes: "Not involved in day-to-day",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Ownership Structure Section */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">🏛️ Building Structure</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <p><strong>Ownership Model:</strong> {structure.ownershipModel}</p>
            <p><strong>Freeholder:</strong> {structure.freeholder}</p>
            <p><strong>RMC:</strong> {structure.rmc}</p>
            <p><strong>Managing Agent:</strong> {structure.managingAgent}</p>
          </div>
        </CardContent>
      </Card>

      {/* Directors Section */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">👥 RMC Directors</h2>
          <div className="space-y-3">
            {directors.map((director) => (
              <div
                key={director.name}
                className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 p-3 rounded-lg border"
              >
                <div>
                  <p className="font-medium">{director.name}</p>
                  <p className="text-sm text-gray-600">{director.role}</p>
                  <p className="text-sm text-gray-500">{director.notes}</p>
                </div>
                {director.contact ? (
                  <a
                    href={`mailto:${director.contact}`}
                    className="flex items-center gap-1 text-blue-600 hover:underline mt-2 md:mt-0"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 italic mt-2 md:mt-0">No contact listed</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 