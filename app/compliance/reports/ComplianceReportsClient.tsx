'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Download, 
  Filter,
  Search,
  Brain,
  BarChart3,
  Calendar,
  FileText,
  Eye
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

interface Building {
  id: string
  name: string
  address: string | null
  unit_count: number | null
  building_compliance_assets: {
    id: string
    status: string
    next_due_date: string | null
    last_updated?: string
    compliance_assets: {
      id: string
      name: string
      category: string | null
    }
  }[]
}

interface ComplianceDoc {
  id: string
  building_id: number
  doc_type: string | null
  expiry_date: string | null
  start_date: string | null
  buildings: {
    id: string
    name: string
  } | null
}

interface ComplianceAsset {
  id: string
  name: string
  category: string | null
}

interface PortfolioStats {
  totalComplianceAssets: number
  totalBuildingsWithTracking: number
  totalOverdueItems: number
  totalDueSoonItems: number
}

interface ComplianceReportsClientProps {
  buildings: Building[]
  complianceDocs: ComplianceDoc[]
  complianceAssets: ComplianceAsset[]
  portfolioStats: PortfolioStats
}

type StatusFilter = 'all' | 'overdue' | 'due-soon' | 'not-started' | 'compliant'
type CategoryFilter = 'all' | 'Safety' | 'Fire' | 'Electrical' | 'Gas' | 'Health' | 'Structural' | 'Insurance' | 'Energy' | 'Equipment'

export default function ComplianceReportsClient({
  buildings,
  complianceDocs,
  complianceAssets,
  portfolioStats
}: ComplianceReportsClientProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Calculate building compliance statistics
  const buildingStats = useMemo(() => {
    return buildings.map(building => {
      const assets = building.building_compliance_assets || []
      const totalAssets = assets.length
      
      if (totalAssets === 0) {
        return {
          building,
          totalAssets: 0,
          compliantAssets: 0,
          overdueAssets: 0,
          dueSoonAssets: 0,
          notStartedAssets: 0,
          compliancePercentage: 0,
          status: 'No Tracking'
        }
      }

      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

      let compliantAssets = 0
      let overdueAssets = 0
      let dueSoonAssets = 0
      let notStartedAssets = 0

      assets.forEach(asset => {
        if (asset.status === 'Compliant') {
          compliantAssets++
        } else if (asset.next_due_date) {
          const dueDate = new Date(asset.next_due_date)
          if (dueDate < today) {
            overdueAssets++
          } else if (dueDate <= thirtyDaysFromNow) {
            dueSoonAssets++
          } else {
            notStartedAssets++
          }
        } else {
          notStartedAssets++
        }
      })

      const compliancePercentage = Math.round((compliantAssets / totalAssets) * 100)

      let status = 'Compliant'
      if (overdueAssets > 0) {
        status = 'Overdue'
      } else if (dueSoonAssets > 0) {
        status = 'Due Soon'
      } else if (notStartedAssets > 0) {
        status = 'Not Started'
      }

      return {
        building,
        totalAssets,
        compliantAssets,
        overdueAssets,
        dueSoonAssets,
        notStartedAssets,
        compliancePercentage,
        status
      }
    })
  }, [buildings])

  // Filter building stats based on search and filters
  const filteredBuildingStats = useMemo(() => {
    return buildingStats.filter(stat => {
      const matchesSearch = searchTerm === '' || 
        stat.building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (stat.building.address && stat.building.address.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || stat.status.toLowerCase().includes(statusFilter.replace('-', ' '))

      return matchesSearch && matchesStatus
    })
  }, [buildingStats, searchTerm, statusFilter])

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Compliant':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Overdue':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Due Soon':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Not Started':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'No Tracking':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Export CSV function
  const exportCSV = () => {
    const headers = ['Building Name', 'Asset Name', 'Category', 'Status', 'Next Due Date', 'Last Updated']
    const rows = []

    filteredBuildingStats.forEach(stat => {
      stat.building.building_compliance_assets?.forEach(asset => {
        const assetName = asset.compliance_assets?.name || 'Unknown Asset'
        const category = asset.compliance_assets?.category || 'Unknown'
        const status = asset.status || 'Not Started'
        const nextDue = asset.next_due_date ? new Date(asset.next_due_date).toLocaleDateString() : 'Not Set'
        const lastUpdated = asset.last_updated ? new Date(asset.last_updated).toLocaleDateString() : 'Not set'

        rows.push([
          stat.building.name,
          assetName,
          category,
          status,
          nextDue,
          lastUpdated
        ])
      })
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.success('CSV report exported successfully')
  }

  // Navigate to building compliance
  const goToBuildingCompliance = (buildingId: string) => {
    router.push(`/buildings/${buildingId}/compliance`)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compliance Assets</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioStats.totalComplianceAssets}</div>
            <p className="text-xs text-muted-foreground">
              Across {portfolioStats.totalBuildingsWithTracking} buildings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buildings with Tracking</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioStats.totalBuildingsWithTracking}</div>
            <p className="text-xs text-muted-foreground">
              Out of {buildings.length} total buildings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{portfolioStats.totalOverdueItems}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{portfolioStats.totalDueSoonItems}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Building Compliance Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Building Compliance Overview
          </CardTitle>
          <p className="text-gray-600">
            Compliance status across all buildings in your portfolio
          </p>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search buildings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="due-soon">Due Soon</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportCSV} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Buildings Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Building</TableHead>
                  <TableHead>Compliance %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead>Due Soon</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBuildingStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No buildings found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBuildingStats.map((stat) => (
                    <TableRow key={stat.building.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{stat.building.name}</div>
                          {stat.building.address && (
                            <div className="text-sm text-gray-500">{stat.building.address}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={stat.compliancePercentage} className="w-16" />
                          <span className="text-sm font-medium">{stat.compliancePercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(stat.status)}>
                          {stat.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {stat.compliantAssets}
                          </div>
                          <div className="text-gray-500">of {stat.totalAssets}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {stat.overdueAssets > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            {stat.overdueAssets}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stat.dueSoonAssets > 0 ? (
                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                            {stat.dueSoonAssets}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToBuildingCompliance(stat.building.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* AI Summary Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Audit Summary
          </CardTitle>
          <p className="text-gray-600">
            AI-powered analysis of compliance gaps and recommendations
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
            <Brain className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">AI Summary Coming Soon</h3>
            <p className="text-gray-600 mb-4">
              This feature will provide intelligent analysis of compliance gaps across your portfolio, 
              highlighting priority areas and suggesting action items.
            </p>
            <Button disabled className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Generate Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 