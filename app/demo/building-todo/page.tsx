import BuildingToDoWidget from "@/components/BuildingToDoWidget";

export default function BuildingTodoDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Building To-Do Widget Demo</h1>
          <p className="text-gray-600">A styled Building To-Do component that matches the BlocIQ design system</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Widget Preview</h2>
            <BuildingToDoWidget />
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Purple hero banner with icon and title
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Responsive checkbox to-do list
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Add new tasks with inline form
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Due date formatting and color coding
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Separate pending and completed sections
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Hover effects and smooth transitions
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Task statistics in footer
                </li>
              </ul>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Design System</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Colors:</span> Purple gradient hero, BlocIQ card styling
                </div>
                <div>
                  <span className="font-medium">Icons:</span> Lucide React (CalendarCheck, Plus, CheckCircle2)
                </div>
                <div>
                  <span className="font-medium">Components:</span> Custom BlocIQ UI components
                </div>
                <div>
                  <span className="font-medium">Styling:</span> Tailwind CSS with responsive design
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 