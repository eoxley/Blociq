'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Link from 'next/link'
import { Plus, Building2, Calendar, DollarSign, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface MajorWorksProject {
  id: string
  name: string
  description: string
  status: string
  building_id: string
  estimated_cost: number | null
  expected_completion_date: string | null
  created_at: string
  building_name?: string
}

export default function MajorWorksPage() {
  const [projects, setProjects] = useState<MajorWorksProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('major_works_projects')
        .select(`
          *,
          buildings:building_id(name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching projects:', error)
      } else {
        const transformedData = data?.map(project => ({
          ...project,
          building_name: project.buildings?.[0]?.name || 'Unknown'
        })) || []
        setProjects(transformedData)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "works_in_progress":
        return "bg-blue-100 text-blue-800"
      case "contractor_appointed":
        return "bg-yellow-100 text-yellow-800"
      case "statement_of_estimates":
        return "bg-purple-100 text-purple-800"
      case "notice_of_intention":
        return "bg-orange-100 text-orange-800"
      case "on_hold":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "notice_of_intention":
        return "Notice of Intention"
      case "statement_of_estimates":
        return "Statement of Estimates"
      case "contractor_appointed":
        return "Contractor Appointed"
      case "works_in_progress":
        return "Works in Progress"
      case "completed":
        return "Completed"
      case "on_hold":
        return "On Hold"
      case "cancelled":
        return "Cancelled"
      default:
        return status
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "Not specified"
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set"
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading major works projects...</p>
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }

  return (
    <LayoutWithSidebar>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Major Works Projects</h1>
            <p className="text-gray-600">Manage and track major works projects across all buildings</p>
          </div>
          <Link href="/major-works/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No major works projects</h3>
              <p className="text-gray-600 mb-6">
                Get started by creating your first major works project.
              </p>
              <Link href="/major-works/new">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge className={getStatusColor(project.status)}>
                      {getStatusLabel(project.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {project.description || 'No description available'}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{project.building_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{formatCurrency(project.estimated_cost)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {formatDate(project.expected_completion_date)}
                        </span>
                      </div>
                    </div>
                    
                    <Link href={`/major-works/${project.id}`}>
                      <Button variant="outline" className="w-full mt-4">
                        View Details
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  )
} 