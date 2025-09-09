'use client'

import React, { useState } from 'react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { Calendar, CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react'

export default function TestCalendarSyncPage() {
  const [syncResults, setSyncResults] = useState<any>(null)
  const [statusData, setStatusData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  const runSync = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sync/compliance-to-calendar', { method: 'POST' })
      const data = await response.json()
      setSyncResults(data)
    } catch (error) {
      setSyncResults({ error: 'Failed to run sync', details: error })
    } finally {
      setLoading(false)
    }
  }

  const getStatus = async () => {
    setStatusLoading(true)
    try {
      const response = await fetch('/api/sync/compliance-to-calendar')
      const data = await response.json()
      setStatusData(data)
    } catch (error) {
      setStatusData({ error: 'Failed to get status', details: error })
    } finally {
      setStatusLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Compliance Calendar Sync Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <BlocIQCard>
            <BlocIQCardHeader>
              <h2 className="text-xl font-semibold">Sync Compliance to Calendar</h2>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              <p className="text-gray-600 mb-4">
                Sync all compliance assets with due dates to your Outlook calendar.
              </p>
              <BlocIQButton 
                onClick={runSync} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Run Sync
                  </>
                )}
              </BlocIQButton>
            </BlocIQCardContent>
          </BlocIQCard>

          <BlocIQCard>
            <BlocIQCardHeader>
              <h2 className="text-xl font-semibold">Check Sync Status</h2>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              <p className="text-gray-600 mb-4">
                View the current sync status of compliance assets.
              </p>
              <BlocIQButton 
                onClick={getStatus} 
                disabled={statusLoading}
                variant="secondary"
                className="w-full"
              >
                {statusLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check Status
                  </>
                )}
              </BlocIQButton>
            </BlocIQCardContent>
          </BlocIQCard>
        </div>

        {syncResults && (
          <BlocIQCard className="mb-6">
            <BlocIQCardHeader>
              <h2 className="text-xl font-semibold">Sync Results</h2>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              {syncResults.success ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{syncResults.data?.synced || 0}</div>
                      <div className="text-sm text-blue-800">Total Synced</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{syncResults.data?.created || 0}</div>
                      <div className="text-sm text-green-800">Created</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-yellow-600">{syncResults.data?.updated || 0}</div>
                      <div className="text-sm text-yellow-800">Updated</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">{syncResults.data?.errors || 0}</div>
                      <div className="text-sm text-red-800">Errors</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Message:</strong> {syncResults.message}
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800">
                    <strong>Error:</strong> {syncResults.error}
                  </div>
                  {syncResults.details && (
                    <div className="text-red-600 text-sm mt-2">
                      <strong>Details:</strong> {JSON.stringify(syncResults.details, null, 2)}
                    </div>
                  )}
                </div>
              )}
            </BlocIQCardContent>
          </BlocIQCard>
        )}

        {statusData && (
          <BlocIQCard className="mb-6">
            <BlocIQCardHeader>
              <h2 className="text-xl font-semibold">Sync Status</h2>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              {statusData.success ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{statusData.data?.total || 0}</div>
                      <div className="text-sm text-blue-800">Total Assets</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{statusData.data?.synced || 0}</div>
                      <div className="text-sm text-green-800">Synced</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-yellow-600">{statusData.data?.unsynced || 0}</div>
                      <div className="text-sm text-yellow-800">Not Synced</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">{statusData.data?.syncPercentage || 0}%</div>
                      <div className="text-sm text-purple-800">Sync Rate</div>
                    </div>
                  </div>
                  
                  {statusData.data?.assets && statusData.data.assets.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">Asset Details</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {statusData.data.assets.map((asset: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(asset.status)}
                              <div>
                                <div className="font-medium">{asset.name}</div>
                                <div className="text-sm text-gray-600">{asset.building}</div>
                                <div className="text-xs text-gray-500">
                                  Due: {new Date(asset.dueDate).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {asset.synced ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Synced
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Not Synced
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800">
                    <strong>Error:</strong> {statusData.error}
                  </div>
                  {statusData.details && (
                    <div className="text-red-600 text-sm mt-2">
                      <strong>Details:</strong> {JSON.stringify(statusData.details, null, 2)}
                    </div>
                  )}
                </div>
              )}
            </BlocIQCardContent>
          </BlocIQCard>
        )}

        <BlocIQCard>
          <BlocIQCardHeader>
            <h2 className="text-xl font-semibold">How to Use</h2>
          </BlocIQCardHeader>
          <BlocIQCardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Ensure you have connected your Outlook account in the app</li>
              <li>Make sure you have compliance assets with due dates set up</li>
              <li>Click "Run Sync" to sync all compliance assets to your Outlook calendar</li>
              <li>Use "Check Status" to see which assets are synced and which need attention</li>
              <li>Check your Outlook calendar to see the compliance events</li>
            </ol>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Each compliance asset will appear as a 1-hour event on its due date at 9:00 AM, 
                with a 3-day reminder. Events will be updated if the due date changes.
              </p>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      </div>
    </div>
  )
}