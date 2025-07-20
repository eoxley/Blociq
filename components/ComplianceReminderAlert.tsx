'use client'

import React from 'react'
import { AlertTriangle, Clock, CheckCircle, X, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useComplianceRemindersSummary } from '@/hooks/useComplianceReminders'
import { useRouter } from 'next/navigation'

interface ComplianceReminderAlertProps {
  showDetails?: boolean
  className?: string
  onDismiss?: () => void
  autoRefresh?: boolean
}

export default function ComplianceReminderAlert({
  showDetails = false,
  className = '',
  onDismiss,
  autoRefresh = true
}: ComplianceReminderAlertProps) {
  const router = useRouter()
  const { summary, hasCritical, urgentCount, loading, generatedAt } = useComplianceRemindersSummary({
    autoRefresh,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  })

  if (loading) {
    return (
      <Card className={`border-l-4 border-l-blue-500 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Loading compliance status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No reminders to show
  if (!summary || (summary.critical_items === 0 && summary.total_due_soon_assets + summary.total_expiring_documents === 0)) {
    return null
  }

  const totalItems = summary.critical_items + summary.total_due_soon_assets + summary.total_expiring_documents

  return (
    <Card className={`border-l-4 ${hasCritical ? 'border-l-red-500' : 'border-l-yellow-500'} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasCritical ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
            <CardTitle className="text-lg">
              {hasCritical ? 'Critical Compliance Alerts' : 'Compliance Reminders'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={hasCritical ? 'destructive' : 'secondary'}>
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </Badge>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {hasCritical ? 'Items requiring immediate attention' : 'Items due soon'}
            </span>
            {generatedAt && (
              <span className="text-gray-500">
                Updated {generatedAt.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            {summary.critical_items > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="font-medium text-red-600">{summary.critical_items}</div>
                  <div className="text-xs text-gray-500">Critical</div>
                </div>
              </div>
            )}
            
            {(summary.total_due_soon_assets + summary.total_expiring_documents) > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <div>
                  <div className="font-medium text-yellow-600">
                    {summary.total_due_soon_assets + summary.total_expiring_documents}
                  </div>
                  <div className="text-xs text-gray-500">Due Soon</div>
                </div>
              </div>
            )}
          </div>

          {/* Show Details */}
          {showDetails && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <strong>Buildings affected:</strong> {summary.total_buildings_affected}
              </div>
              
              <div className="text-sm text-gray-600">
                <strong>Assets:</strong> {summary.total_overdue_assets} overdue, {summary.total_due_soon_assets} due soon
              </div>
              
              <div className="text-sm text-gray-600">
                <strong>Documents:</strong> {summary.total_expired_documents} expired, {summary.total_expiring_documents} expiring
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant={hasCritical ? 'destructive' : 'default'}
              onClick={() => router.push('/compliance/reports')}
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              View Details
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push('/compliance')}
            >
              Compliance Dashboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Compact version for header/sidebar
export function ComplianceReminderBadge() {
  const { hasCritical, urgentCount } = useComplianceRemindersSummary({
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000
  })

  if (urgentCount === 0) return null

  return (
    <Badge 
      variant={hasCritical ? 'destructive' : 'secondary'}
      className="animate-pulse"
    >
      {urgentCount}
    </Badge>
  )
}

// Minimal alert for notifications
export function ComplianceReminderNotification() {
  const { summary, hasCritical } = useComplianceRemindersSummary({
    autoRefresh: true,
    refreshInterval: 10 * 60 * 1000 // 10 minutes
  })

  if (!summary || summary.critical_items === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="border-l-4 border-l-red-500 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <div className="font-medium text-red-600">
                {summary.critical_items} Critical Compliance Items
              </div>
              <div className="text-sm text-gray-600">
                Require immediate attention
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = '/compliance/reports'}
            >
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 