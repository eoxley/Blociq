'use client'

import React, { useState } from 'react'
import { Users, Mail, Phone, FileText, Calendar, Building2, Eye, Flag, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'

interface UnitLeaseholderListProps {
  units: any[]
  buildingId: string
  incomingEmails: any[]
  communicationsLog: any[]
}

export default function UnitLeaseholderList({ units, buildingId, incomingEmails, communicationsLog }: UnitLeaseholderListProps) {
  const [selectedUnit, setSelectedUnit] = useState<any>(null)
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)

  const openUnitModal = (unit: any) => {
    setSelectedUnit(unit)
    setIsUnitModalOpen(true)
  }

  const getUnitFlags = (unit: any) => {
    const flags = []
    if (unit.leaseholders?.is_director) flags.push({ label: 'Director', color: 'bg-purple-100 text-purple-800' })
    // Add more flags as needed
    return flags
  }

  const getUnitCorrespondence = (unitId: string) => {
    const emails = incomingEmails.filter(email => email.unit_id === unitId)
    const comms = communicationsLog.filter(comm => comm.unit_id === unitId)
    return { emails, comms }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Units & Leaseholders
        </CardTitle>
        <p className="text-sm text-gray-600">Manage units and leaseholder information</p>
      </CardHeader>
      <CardContent>
        {units.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Units Found</h3>
            <p className="text-gray-600">No units have been added to this building yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Leaseholder</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => {
                  const flags = getUnitFlags(unit)
                  return (
                    <TableRow key={unit.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {unit.unit_number}
                        {unit.type && (
                          <span className="text-sm text-gray-500 ml-2">({unit.type})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {unit.leaseholders ? (
                          <div>
                            <div className="font-medium">{unit.leaseholders.name}</div>
                            {unit.leaseholders.email && (
                              <div className="text-sm text-gray-500">{unit.leaseholders.email}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No leaseholder</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {unit.leaseholders?.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{unit.leaseholders.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No phone</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {flags.map((flag, index) => (
                            <Badge key={index} className={flag.color} variant="secondary">
                              {flag.label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUnitModal(unit)}
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
          </div>
        )}

        {/* Unit Detail Modal */}
        <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Unit {selectedUnit?.unit_number} - Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedUnit && (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="lease">Lease</TabsTrigger>
                  <TabsTrigger value="correspondence">Correspondence</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Unit Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Unit Number</label>
                          <p className="text-lg font-semibold">{selectedUnit.unit_number}</p>
                        </div>
                        {selectedUnit.type && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Type</label>
                            <p>{selectedUnit.type}</p>
                          </div>
                        )}
                        {selectedUnit.floor && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Floor</label>
                            <p>{selectedUnit.floor}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Leaseholder
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedUnit.leaseholders ? (
                          <>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Name</label>
                              <p className="text-lg font-semibold">{selectedUnit.leaseholders.name}</p>
                            </div>
                            {selectedUnit.leaseholders.email && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Email</label>
                                <p className="flex items-center gap-1">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                  {selectedUnit.leaseholders.email}
                                </p>
                              </div>
                            )}
                            {selectedUnit.leaseholders.phone && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Phone</label>
                                <p className="flex items-center gap-1">
                                  <Phone className="h-4 w-4 text-gray-400" />
                                  {selectedUnit.leaseholders.phone}
                                </p>
                              </div>
                            )}
                            {selectedUnit.leaseholders.is_director && (
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-purple-500" />
                                <Badge className="bg-purple-100 text-purple-800">RMC Director</Badge>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-400">No leaseholder assigned</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="lease" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Lease Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500">Lease information will be displayed here when available.</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="correspondence" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Correspondence
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const correspondence = getUnitCorrespondence(selectedUnit.id)
                        const hasCorrespondence = correspondence.emails.length > 0 || correspondence.comms.length > 0
                        
                        if (!hasCorrespondence) {
                          return <p className="text-gray-500">No correspondence found for this unit.</p>
                        }

                        return (
                          <div className="space-y-4">
                            {correspondence.emails.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">Incoming Emails ({correspondence.emails.length})</h4>
                                <div className="space-y-2">
                                  {correspondence.emails.slice(0, 5).map((email: any) => (
                                    <div key={email.id} className="border rounded-lg p-3">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium">{email.from_name || email.from_email}</p>
                                          <p className="text-sm text-gray-600">{email.subject}</p>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {format(new Date(email.received_at), 'dd/MM/yyyy')}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {correspondence.comms.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">Communications Log ({correspondence.comms.length})</h4>
                                <div className="space-y-2">
                                  {correspondence.comms.slice(0, 5).map((comm: any) => (
                                    <div key={comm.id} className="border rounded-lg p-3">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium">{comm.subject}</p>
                                          <p className="text-sm text-gray-600">{comm.content}</p>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {format(new Date(comm.created_at), 'dd/MM/yyyy')}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500">Documents will be displayed here when available.</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </div>
  )
} 