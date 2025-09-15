'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, AlertTriangle, CheckCircle, Loader2, Eye, Shield } from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import PageHero from '@/components/PageHero'

interface CleanupResults {
  buildings: number
  units: number
  leaseholders: number
  emails: number
  compliance_documents: number
  compliance_assets: number
  building_documents: number
  building_todos: number
  property_events: number
  storage_files: number
}

interface TestDataCount {
  buildings: number
  units: number
  emails: number
  compliance_documents: number
  building_todos: number
  property_events: number
}

export default function CleanupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [cleanupResults, setCleanupResults] = useState<CleanupResults | null>(null)
  const [testDataCount, setTestDataCount] = useState<TestDataCount | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const auditTestData = async () => {
    setIsAuditing(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/cleanup-test-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to audit test data')
      }

      setTestDataCount(data.test_data_count)
      setSuccess('Test data audit completed successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsAuditing(false)
    }
  }

  const performCleanup = async () => {
    if (!confirm('⚠️ WARNING: This will permanently delete all test and demo data from the database. This action cannot be undone. Are you sure you want to continue?')) {
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setCleanupResults(null)

    try {
      const response = await fetch('/api/admin/cleanup-test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to perform cleanup')
      }

      setCleanupResults(data.removed)
      setSuccess('Test data cleanup completed successfully')
      setTestDataCount(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const totalItemsRemoved = cleanupResults ? Object.values(cleanupResults).reduce((sum, count) => sum + count, 0) : 0
  const totalTestItems = testDataCount ? Object.values(testDataCount).reduce((sum, count) => sum + count, 0) : 0

  return (
    <LayoutWithSidebar>
      <div className="space-y-8">
        <PageHero
          title="Database Cleanup"
          subtitle="Remove all test and demo data from the BlocIQ database"
          icon={<Shield className="h-8 w-8 text-white" />}
        />

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Database Cleanup</h1>
              <p className="text-gray-600 mt-2">
                Remove all test and demo data from the BlocIQ database
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-amber-600" />
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                Admin Only
              </Badge>
            </div>
          </div>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>⚠️ Critical Operation:</strong> This cleanup will permanently delete all test and demo data. 
              This action cannot be undone. Please ensure you have backups before proceeding.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-4">
            <Button
              onClick={auditTestData}
              disabled={isAuditing || isLoading}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {isAuditing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {isAuditing ? 'Auditing...' : 'Audit Test Data'}
            </Button>

            <Button
              onClick={performCleanup}
              disabled={isLoading || isAuditing}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Cleaning...' : 'Clean All Test Data'}
            </Button>
          </div>

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {testDataCount && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Test Data Found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">{testDataCount.buildings}</div>
                    <div className="text-sm text-blue-700">Buildings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">{testDataCount.units}</div>
                    <div className="text-sm text-blue-700">Units</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">{testDataCount.emails}</div>
                    <div className="text-sm text-blue-700">Emails</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">{testDataCount.compliance_documents}</div>
                    <div className="text-sm text-blue-700">Compliance Docs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">{testDataCount.building_todos}</div>
                    <div className="text-sm text-blue-700">Todos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">{testDataCount.property_events}</div>
                    <div className="text-sm text-blue-700">Events</div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    Total: {totalTestItems} test items found
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {cleanupResults && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Cleanup Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{cleanupResults.buildings}</div>
                    <div className="text-sm text-green-700">Buildings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{cleanupResults.units}</div>
                    <div className="text-sm text-green-700">Units</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{cleanupResults.leaseholders}</div>
                    <div className="text-sm text-green-700">Leaseholders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{cleanupResults.emails}</div>
                    <div className="text-sm text-green-700">Emails</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{cleanupResults.compliance_documents}</div>
                    <div className="text-sm text-green-700">Compliance Docs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{cleanupResults.compliance_assets}</div>
                    <div className="text-sm text-green-700">Compliance Assets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{cleanupResults.building_documents}</div>
                    <div className="text-sm text-green-700">Building Docs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{cleanupResults.building_todos}</div>
                    <div className="text-sm text-green-700">Todos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{cleanupResults.property_events}</div>
                    <div className="text-sm text-green-700">Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{cleanupResults.storage_files}</div>
                    <div className="text-sm text-green-700">Storage Files</div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Total: {totalItemsRemoved} items removed
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">What Will Be Cleaned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Buildings:</strong> All buildings with names containing &quot;test&quot;, &quot;demo&quot;, or &quot;example&quot;
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Units & Leaseholders:</strong> All units and associated leaseholders from test buildings
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Emails:</strong> All emails with subjects containing &quot;test&quot; or sent to example.com addresses
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Documents:</strong> All compliance and building documents with &quot;test&quot; in the filename
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Todos &amp; Events:</strong> All building todos and property events with &quot;test&quot; in the title
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutWithSidebar>
  )
}