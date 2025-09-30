'use client';

import { useState, useEffect } from 'react';
import { useAgency } from '@/hooks/useAgency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  HardHat,
  Plus,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  Upload,
  Calendar
} from 'lucide-react';

interface Contractor {
  id: string;
  name: string;
  trade: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive' | 'pending';
  insurance_expiry: string | null;
  public_liability: number | null;
  active_works: number;
  completed_works: number;
  documents_count: number;
  compliance_status: 'compliant' | 'expiring_soon' | 'expired';
}

export default function ContractorsPage() {
  const { currentAgency } = useAgency();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expiringSoon: 0,
    activeWorks: 0
  });

  useEffect(() => {
    loadContractors();
  }, [currentAgency]);

  const loadContractors = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/contractors');
      const data = await response.json();

      if (data.success && data.contractors) {
        setContractors(data.contractors);

        // Calculate stats
        const stats = data.contractors.reduce((acc: any, contractor: Contractor) => ({
          total: acc.total + 1,
          active: acc.active + (contractor.status === 'active' ? 1 : 0),
          expiringSoon: acc.expiringSoon + (contractor.compliance_status === 'expiring_soon' ? 1 : 0),
          activeWorks: acc.activeWorks + contractor.active_works
        }), {
          total: 0,
          active: 0,
          expiringSoon: 0,
          activeWorks: 0
        });

        setStats(stats);
      }
    } catch (error) {
      console.error('Error loading contractors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContractors = contractors.filter(contractor =>
    contractor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contractor.trade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-green-600';
      case 'expiring_soon':
        return 'text-orange-600';
      case 'expired':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl mb-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Contractor Management
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
              Manage your approved vendor list, track compliance, and monitor active works
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => setShowAddModal(true)} className="bg-white text-[#4f46e5] hover:bg-white/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Contractor
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contractors</CardTitle>
            <HardHat className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-600 mt-1">{stats.active} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Works</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWorks}</div>
            <p className="text-xs text-gray-600 mt-1">Ongoing projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
            <p className="text-xs text-gray-600 mt-1">Insurance renewal needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.total > 0 ? Math.round(((stats.total - stats.expiringSoon) / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-600 mt-1">Fully compliant</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contractors by name or trade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contractors List */}
      <Card>
        <CardHeader>
          <CardTitle>Contractor Directory</CardTitle>
          <CardDescription>
            {filteredContractors.length} contractor{filteredContractors.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredContractors.length === 0 ? (
            <div className="text-center py-12">
              <HardHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchQuery ? 'No contractors found matching your search' : 'No contractors added yet'}
              </p>
              <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Contractor
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContractors.map((contractor) => (
                <div
                  key={contractor.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{contractor.name}</h3>
                        <Badge className={getStatusColor(contractor.status)}>
                          {contractor.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <HardHat className="h-4 w-4" />
                            <span className="font-medium">Trade:</span>
                            <span>{contractor.trade}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4" />
                            <span>{contractor.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4" />
                            <span>{contractor.phone}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className={`h-4 w-4 ${getComplianceColor(contractor.compliance_status)}`} />
                            <span className="font-medium">Compliance:</span>
                            <span className={getComplianceColor(contractor.compliance_status)}>
                              {contractor.compliance_status === 'compliant' ? 'Up to date' :
                               contractor.compliance_status === 'expiring_soon' ? 'Expiring soon' : 'Expired'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FileText className="h-4 w-4" />
                            <span>{contractor.documents_count} documents</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>{contractor.active_works} active works</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Doc
                      </Button>
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