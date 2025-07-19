"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import ProgressTrackerWidget from "@/components/ProgressTrackerWidget";

export default function ProgressTrackerDemoPage() {
  return (
    <LayoutWithSidebar 
      title="Progress Tracker Widget Demo" 
      subtitle="Showcasing different states and configurations"
    >
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Progress Tracker Widget Examples</h2>
          <p className="text-gray-600">
            The Progress Tracker Widget provides a quick overview of building progress, 
            including task completion and inspection status with visual indicators and warnings.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Good Progress State */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Good Progress State</CardTitle>
              <p className="text-sm text-gray-600">
                Building with good progress - no warnings or overdue items
              </p>
            </CardHeader>
            <CardContent>
              <ProgressTrackerWidget 
                buildingId="demo-good-progress"
                showRefreshButton={true}
              />
            </CardContent>
          </Card>

          {/* Warning State */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Warning State</CardTitle>
              <p className="text-sm text-gray-600">
                Building with overdue tasks and failed inspection items
              </p>
            </CardHeader>
            <CardContent>
              <ProgressTrackerWidget 
                buildingId="demo-warning-state"
                showRefreshButton={true}
              />
            </CardContent>
          </Card>

          {/* Compact Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compact Widget</CardTitle>
              <p className="text-sm text-gray-600">
                Widget without refresh button for embedded use
              </p>
            </CardHeader>
            <CardContent>
              <ProgressTrackerWidget 
                buildingId="demo-compact"
                showRefreshButton={false}
                className="max-w-sm"
              />
            </CardContent>
          </Card>

          {/* Full Width Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Full Width Widget</CardTitle>
              <p className="text-sm text-gray-600">
                Widget designed for dashboard or overview pages
              </p>
            </CardHeader>
            <CardContent>
              <ProgressTrackerWidget 
                buildingId="demo-full-width"
                showRefreshButton={true}
                className="w-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Widget Features */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Widget Features</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📊 Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Visual progress bars showing task completion and inspection status with percentages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">⚠️ Warning System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Automatic detection and highlighting of overdue tasks and failed inspection items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">🔄 Real-time Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Refresh button to update progress data and sync with latest building status
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">📅 Last Inspection Info</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Shows the date and status of the most recent site inspection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">🔗 Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Direct links to view detailed tasks and inspections for the building
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">📱 Responsive Design</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Adapts to different screen sizes and can be embedded in various layouts
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Implementation Guide */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Implementation Guide</h3>
          
          <Card>
            <CardHeader>
              <CardTitle>Basic Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
{`import ProgressTrackerWidget from "@/components/ProgressTrackerWidget";

// Basic usage
<ProgressTrackerWidget buildingId="your-building-id" />

// With custom styling
<ProgressTrackerWidget 
  buildingId="your-building-id"
  className="max-w-md"
  showRefreshButton={false}
  onRefresh={() => console.log('Refreshed!')}
/>`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Props</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-medium">buildingId</dt>
                    <dd className="text-gray-600">Required. The ID of the building to track</dd>
                  </div>
                  <div>
                    <dt className="font-medium">className</dt>
                    <dd className="text-gray-600">Optional. Additional CSS classes</dd>
                  </div>
                  <div>
                    <dt className="font-medium">showRefreshButton</dt>
                    <dd className="text-gray-600">Optional. Show/hide refresh button (default: true)</dd>
                  </div>
                  <div>
                    <dt className="font-medium">onRefresh</dt>
                    <dd className="text-gray-600">Optional. Callback when refresh is clicked</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Endpoint</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>GET</strong> <code>/api/building-progress/[buildingId]</code></p>
                  <p className="text-gray-600">Returns progress data including:</p>
                  <ul className="list-disc list-inside text-gray-600 ml-4">
                    <li>Task completion statistics</li>
                    <li>Inspection status and results</li>
                    <li>Overdue task count</li>
                    <li>Warning indicators</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  );
} 