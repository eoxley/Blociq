'use client'

import React, { useState } from 'react'
import { FileText, CheckCircle, AlertTriangle, Clock, Upload, Eye, Calendar, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { format, isAfter, isBefore, addDays } from 'date-fns'

interface ComplianceSectionProps {
  complianceAssets: any[]
  complianceDocuments: any[]
  buildingId: string
}

export default function ComplianceSection({ complianceAssets, complianceDocuments, buildingId }: ComplianceSectionProps) {
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false)

  // Group assets by category
  const groupedAssets = (complianceAssets || []).reduce((acc, asset) => {
    const category = asset.compliance_assets?.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(asset)
    return acc
  }, {} as Record<string, any[]>)

  // Calculate compliance statistics
  const totalAssets = (complianceAssets || []).length
  const compliantCount = (complianceAssets || []).filter(asset => asset.status === 'compliant').length
  const overdueCount = (complianceAssets || []).filter(asset => asset.status === 'overdue').length
  const pendingCount = (complianceAssets || []).filter(asset => asset.status === 'pending').length
  const missingCount = (complianceAssets || []).filter(asset => asset.status === 'missing').length

  const compliancePercentage = totalAssets > 0 ? Math.round((compliantCount / totalAssets) * 100) : 0

  const getStatusBadge = (status: string, dueDate?: string) => {
    const isOverdue = dueDate && isAfter(new Date(), new Date(dueDate))
    
    switch (status?.toLowerCase()) {
      case 'compliant':
        return { label: 'Compliant', color: 'bg-green-100 text-green-800', icon: CheckCircle }
      case 'overdue':
      case 'due':
        return { label: 'Overdue', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
      case 'pending':
      case 'due_soon':
        return { label: 'Due Soon', color: 'bg-yellow-100 text-yellow-800', icon: Clock }
      case 'missing':
        return { label: 'Missing', color: 'bg-gray-100 text-gray-800', icon: FileText }
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: FileText }
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const openAssetModal = (asset: any) => {
    setSelectedAsset(asset)
    setIsAssetModalOpen(true)
  }

  const getDocumentsForAsset = (assetId: string) => {
    return (complianceDocuments || []).filter(doc => doc.compliance_asset_id === assetId)
  }

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Removed counter cards section */}
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Compliance Rate</span>
              <span>{compliancePercentage}%</span>
            </div>
            <Progress value={compliancePercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Compliance Assets by Category */}
      <div className="space-y-6">
        {Object.entries(groupedAssets).map(([category, assets]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
              <p className="text-sm text-gray-600">
                {assets.length} item{assets.length !== 1 ? 's' : ''} in this category
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => {
                    const statusBadge = getStatusBadge(asset.status, asset.due_date)
                    const StatusIcon = statusBadge.icon
                    const documents = getDocumentsForAsset(asset.id)
                    
                    return (
                      <TableRow key={asset.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium">{asset.compliance_assets?.title}</div>
                            {asset.compliance_assets?.description && (
                              <div className="text-sm text-gray-500">{asset.compliance_assets.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusBadge.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {asset.due_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">
                                {format(new Date(asset.due_date), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${getPriorityColor(asset.priority)}`}>
                            {asset.priority || 'Medium'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{documents.length}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAssetModal(asset)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Asset Detail Modal */}
      <Dialog open={isAssetModalOpen} onOpenChange={setIsAssetModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAsset?.compliance_assets?.title} - Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedAsset && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Asset Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Title</label>
                        <p className="font-semibold">{selectedAsset.compliance_assets?.title}</p>
                      </div>
                      {selectedAsset.compliance_assets?.description && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Description</label>
                          <p className="text-sm">{selectedAsset.compliance_assets.description}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-600">Category</label>
                        <p>{selectedAsset.compliance_assets?.category}</p>
                      </div>
                      {selectedAsset.compliance_assets?.frequency_months && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Frequency</label>
                          <p>{selectedAsset.compliance_assets.frequency_months} months</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Status & Due Date</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <div className="mt-1">
                          {(() => {
                            const statusBadge = getStatusBadge(selectedAsset.status, selectedAsset.due_date)
                            const StatusIcon = statusBadge.icon
                            return (
                              <Badge className={statusBadge.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusBadge.label}
                              </Badge>
                            )
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Due Date</label>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {selectedAsset.due_date ? 
                            format(new Date(selectedAsset.due_date), 'dd/MM/yyyy') : 
                            'Not set'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Priority</label>
                        <p className={getPriorityColor(selectedAsset.priority)}>
                          {selectedAsset.priority || 'Medium'}
                        </p>
                      </div>
                      {selectedAsset.assigned_to && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Assigned To</label>
                          <p>{selectedAsset.assigned_to}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {selectedAsset.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedAsset.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Uploaded Documents</span>
                      <Button size="sm" className="flex items-center gap-1">
                        <Upload className="h-4 w-4" />
                        Upload Document
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const documents = getDocumentsForAsset(selectedAsset.id)
                      if (documents.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents</h3>
                            <p className="text-gray-600">No documents have been uploaded for this compliance item.</p>
                          </div>
                        )
                      }

                      return (
                        <div className="space-y-2">
                          {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="font-medium">{doc.file_name}</p>
                                  <p className="text-sm text-gray-500">
                                    Uploaded {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Compliance History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">Compliance history will be displayed here when available.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 