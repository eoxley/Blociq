'use client';

import { useState, useEffect } from 'react';
import { useAgency } from '@/hooks/useAgency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ClipboardList,
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  HardHat,
  Calendar,
  DollarSign,
  Filter
} from 'lucide-react';

interface WorkOrder {
  id: string;
  wo_number: string;
  title: string;
  description: string;
  building_id: string;
  building_name: string;
  contractor_id: string | null;
  contractor_name: string | null;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_cost: number | null;
  actual_cost: number | null;
  created_at: string;
  due_date: string | null;
  completed_at: string | null;
}

export default function WorkOrdersPage() {
  const { currentAgency } = useAgency();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    totalCost: 0
  });

  useEffect(() => {
    loadWorkOrders();
  }, [currentAgency]);

  const loadWorkOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/works-orders');
      const data = await response.json();

      if (data.success && data.workOrders) {
        setWorkOrders(data.workOrders);

        // Calculate stats
        const stats = data.workOrders.reduce((acc: any, wo: WorkOrder) => ({
          total: acc.total + 1,
          pending: acc.pending + (wo.status === 'pending' ? 1 : 0),
          inProgress: acc.inProgress + (wo.status === 'in_progress' ? 1 : 0),
          completed: acc.completed + (wo.status === 'completed' ? 1 : 0),
          totalCost: acc.totalCost + (wo.actual_cost || wo.estimated_cost || 0)
        }), {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          totalCost: 0
        });

        setStats(stats);
      }
    } catch (error) {
      console.error('Error loading work orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         wo.wo_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         wo.building_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl mb-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Work Order Management
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
              Track maintenance requests, manage repairs, and monitor work order progress
            </p>
            <div className="flex justify-center gap-4">
              <Button className="bg-white text-[#4f46e5] hover:bg-white/90">
                <Plus className="h-4 w-4 mr-2" />
                Create Work Order
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-600 mt-1">All work orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.inProgress}</div>
            <p className="text-xs text-gray-600 mt-1">Active works</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-gray-600 mt-1">Finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalCost)}
            </div>
            <p className="text-xs text-gray-600 mt-1">All work orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search work orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Work Orders</CardTitle>
          <CardDescription>
            {filteredWorkOrders.length} work order{filteredWorkOrders.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredWorkOrders.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchQuery || statusFilter !== 'all'
                  ? 'No work orders found matching your criteria'
                  : 'No work orders created yet'}
              </p>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Work Order
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWorkOrders.map((wo) => (
                <div
                  key={wo.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-gray-500">{wo.wo_number}</span>
                        <h3 className="text-lg font-semibold text-gray-900">{wo.title}</h3>
                        <Badge className={getStatusColor(wo.status)}>
                          {wo.status.replace('_', ' ')}
                        </Badge>
                        <span className={`text-sm font-semibold ${getPriorityColor(wo.priority)}`}>
                          {wo.priority.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-4">{wo.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="h-4 w-4" />
                          <span>{wo.building_name || 'No building'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <HardHat className="h-4 w-4" />
                          <span>{wo.contractor_name || 'No contractor'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          <span>
                            {wo.actual_cost
                              ? formatCurrency(wo.actual_cost)
                              : wo.estimated_cost
                              ? `Est. ${formatCurrency(wo.estimated_cost)}`
                              : 'No cost'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {wo.due_date
                              ? new Date(wo.due_date).toLocaleDateString()
                              : 'No due date'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      {wo.status === 'pending' && (
                        <Button variant="ghost" size="sm" className="text-green-600">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}