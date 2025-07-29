'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building, Users, Mail, Phone, Calendar, PoundSterling, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import OccupierManagement from '@/components/OccupierManagement'
import { Tables } from '@/lib/database.types'

type Unit = Tables<'units'> & {
  leaseholders: Tables<'leaseholders'>[]
  occupiers: Tables<'occupiers'>[]
}

interface UnitDetailClientProps {
  building: Tables<'buildings'>
  unit: Unit
}

export default function UnitDetailClient({ building, unit }: UnitDetailClientProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const handleEmailLeaseholder = (email: string) => {
    window.open(`mailto:${email}`, '_blank')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'inactive': return 'outline'
      case 'pending': return 'warning'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href={`/buildings/${building.id}/units`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Units
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Unit {unit.unit_number}
            </h1>
            <p className="text-gray-600">{building.name}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {unit.type || 'Residential'}
        </Badge>
      </div>

      {/* Unit Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Unit Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Unit Number</p>
              <p className="text-lg">{unit.unit_number}</p>
            </div>
            {unit.floor && (
              <div>
                <p className="text-sm font-medium text-gray-500">Floor</p>
                <p className="text-lg">{unit.floor}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Type</p>
              <p className="text-lg">{unit.type || 'Residential'}</p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leaseholders">Leaseholders</TabsTrigger>
          <TabsTrigger value="occupiers">Occupiers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leaseholders Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Leaseholders ({unit.leaseholders?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unit.leaseholders && unit.leaseholders.length > 0 ? (
                  <div className="space-y-3">
                    {unit.leaseholders.map((leaseholder) => (
                      <div key={leaseholder.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{leaseholder.name}</h4>
                          {leaseholder.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEmailLeaseholder(leaseholder.email!)}
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </Button>
                          )}
                        </div>
                        {leaseholder.email && (
                          <p className="text-sm text-gray-600">{leaseholder.email}</p>
                        )}
                        {leaseholder.phone && (
                          <p className="text-sm text-gray-600">{leaseholder.phone}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No leaseholders assigned</p>
                )}
              </CardContent>
            </Card>

            {/* Occupiers Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Occupiers ({unit.occupiers?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unit.occupiers && unit.occupiers.length > 0 ? (
                  <div className="space-y-3">
                    {unit.occupiers.slice(0, 3).map((occupier) => (
                      <div key={occupier.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{occupier.full_name}</h4>
                          <Badge variant={getStatusColor(occupier.status || '')}>
                            {occupier.status}
                          </Badge>
                        </div>
                        {occupier.email && (
                          <p className="text-sm text-gray-600">{occupier.email}</p>
                        )}
                        {occupier.rent_amount && (
                          <p className="text-sm text-gray-600">
                            £{occupier.rent_amount} {occupier.rent_frequency}
                          </p>
                        )}
                      </div>
                    ))}
                    {unit.occupiers.length > 3 && (
                      <p className="text-sm text-gray-500">
                        +{unit.occupiers.length - 3} more occupiers
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No occupiers found</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leaseholders Tab */}
        <TabsContent value="leaseholders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leaseholder Details</CardTitle>
            </CardHeader>
            <CardContent>
              {unit.leaseholders && unit.leaseholders.length > 0 ? (
                <div className="space-y-4">
                  {unit.leaseholders.map((leaseholder) => (
                    <div key={leaseholder.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{leaseholder.name}</h3>
                        {leaseholder.email && (
                          <Button
                            variant="outline"
                            onClick={() => handleEmailLeaseholder(leaseholder.email!)}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {leaseholder.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{leaseholder.email}</span>
                          </div>
                        )}
                        {leaseholder.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{leaseholder.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No Leaseholders</p>
                  <p className="text-gray-500">No leaseholders have been assigned to this unit.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Occupiers Tab */}
        <TabsContent value="occupiers" className="space-y-4">
          <OccupierManagement unit={unit} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 