'use client';

import { useState, useEffect } from 'react';
import { useAgency } from '@/hooks/useAgency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Monitor,
  Plus,
  Search,
  Users,
  Building2,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Key,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface PortalAccess {
  id: string;
  leaseholder_id: string;
  leaseholder_name: string;
  email: string;
  building_id: string;
  building_name: string;
  unit_number: string | null;
  access_scope: 'unit' | 'building';
  status: 'active' | 'inactive' | 'pending';
  last_login: string | null;
  created_at: string;
  portal_url: string;
}

export default function ClientPortalPage() {
  const { currentAgency } = useAgency();
  const [portalAccesses, setPortalAccesses] = useState<PortalAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    recentLogins: 0
  });

  useEffect(() => {
    loadPortalAccesses();
  }, [currentAgency]);

  const loadPortalAccesses = async () => {
    try {
      setIsLoading(true);

      // Load leaseholders with portal access
      const response = await fetch('/api/leaseholders');
      const data = await response.json();

      if (data.success && data.leaseholders) {
        // Transform leaseholder data to portal access format
        const accesses = data.leaseholders.map((lh: any) => ({
          id: lh.id,
          leaseholder_id: lh.id,
          leaseholder_name: lh.name,
          email: lh.email,
          building_id: lh.building_id,
          building_name: lh.building_name || 'Unknown Building',
          unit_number: lh.unit_number,
          access_scope: lh.unit_number ? 'unit' : 'building',
          status: lh.portal_enabled ? 'active' : 'inactive',
          last_login: null,
          created_at: lh.created_at,
          portal_url: `/portal/${lh.id}`
        }));

        setPortalAccesses(accesses);

        // Calculate stats
        const stats = accesses.reduce((acc: any, access: PortalAccess) => ({
          total: acc.total + 1,
          active: acc.active + (access.status === 'active' ? 1 : 0),
          pending: acc.pending + (access.status === 'pending' ? 1 : 0),
          recentLogins: acc.recentLogins + (access.last_login &&
            new Date(access.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? 1 : 0)
        }), {
          total: 0,
          active: 0,
          pending: 0,
          recentLogins: 0
        });

        setStats(stats);
      }
    } catch (error) {
      console.error('Error loading portal accesses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAccesses = portalAccesses.filter(access =>
    access.leaseholder_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    access.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    access.building_name.toLowerCase().includes(searchQuery.toLowerCase())
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

  const copyPortalUrl = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Portal URL copied to clipboard');
  };

  const sendInvitation = async (leaseholderId: string) => {
    try {
      const response = await fetch(`/api/leaseholders/${leaseholderId}/invite`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Invitation sent successfully');
      } else {
        toast.error('Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl mb-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Client Portal Management
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
              Manage leaseholder portal access, send invitations, and monitor engagement
            </p>
            <div className="flex justify-center gap-4">
              <Button className="bg-white text-[#4f46e5] hover:bg-white/90">
                <Plus className="h-4 w-4 mr-2" />
                Grant Access
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
            <CardTitle className="text-sm font-medium">Total Access</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-600 mt-1">Portal accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-gray-600 mt-1">Can access portal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting setup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
            <Monitor className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.recentLogins}</div>
            <p className="text-xs text-gray-600 mt-1">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by leaseholder, email, or building..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portal Access List */}
      <Card>
        <CardHeader>
          <CardTitle>Portal Access Accounts</CardTitle>
          <CardDescription>
            {filteredAccesses.length} account{filteredAccesses.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredAccesses.length === 0 ? (
            <div className="text-center py-12">
              <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchQuery ? 'No portal accounts found matching your search' : 'No portal access granted yet'}
              </p>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Grant First Portal Access
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAccesses.map((access) => (
                <div
                  key={access.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{access.leaseholder_name}</h3>
                        <Badge className={getStatusColor(access.status)}>
                          {access.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {access.access_scope === 'unit' ? 'Unit Access' : 'Building Access'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4" />
                            <span>{access.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Building2 className="h-4 w-4" />
                            <span>{access.building_name}</span>
                            {access.unit_number && <span className="text-gray-400">• Unit {access.unit_number}</span>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Key className="h-4 w-4" />
                            <span>Created: {new Date(access.created_at).toLocaleDateString()}</span>
                          </div>
                          {access.last_login && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>Last login: {new Date(access.last_login).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <code className="text-sm text-gray-700">{window.location.origin}{access.portal_url}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyPortalUrl(access.portal_url)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(access.portal_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Portal
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendInvitation(access.leaseholder_id)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invite
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