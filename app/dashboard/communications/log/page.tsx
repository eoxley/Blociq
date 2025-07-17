'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import { ArrowLeft, Mail, FileText, Eye, Download, Filter, Calendar, Building, Users } from 'lucide-react';
import Link from 'next/link';

type Communication = Database['public']['Tables']['communications']['Row'];
type Building = Database['public']['Tables']['buildings']['Row'];
type Leaseholder = Database['public']['Tables']['leaseholders']['Row'];
type Template = Database['public']['Tables']['communication_templates']['Row'];

interface CommunicationWithDetails extends Communication {
  building: Building;
  leaseholder: Leaseholder;
  template: Template;
}

export default function CommunicationsLogPage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  
  const [communications, setCommunications] = useState<CommunicationWithDetails[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchBuildings();
    fetchCommunications();
  }, []);

  useEffect(() => {
    fetchCommunications();
  }, [selectedBuilding, selectedType, dateFrom, dateTo]);

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setBuildings(data || []);
    } catch (err: any) {
      console.error('Error fetching buildings:', err);
    }
  };

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('communications')
        .select(`
          *,
          building:buildings(*),
          leaseholder:leaseholders(*),
          template:communication_templates(*)
        `)
        .eq('sent', true)
        .order('sent_at', { ascending: false });

      // Apply filters
      if (selectedBuilding) {
        query = query.eq('building_id', selectedBuilding);
      }
      
      if (selectedType) {
        query = query.eq('type', selectedType);
      }
      
      if (dateFrom) {
        query = query.gte('sent_at', dateFrom);
      }
      
      if (dateTo) {
        query = query.lte('sent_at', dateTo + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setCommunications(data || []);
    } catch (err: any) {
      console.error('Error fetching communications:', err);
      setError(err.message || 'Failed to load communications');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedBuilding('');
    setSelectedType('');
    setDateFrom('');
    setDateTo('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    return type === 'email' ? <Mail className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    return type === 'email' ? 'Email' : 'Letter';
  };

  const handleViewMessage = (communication: CommunicationWithDetails) => {
    // For now, show in alert - could be enhanced with a modal
    alert(`Subject: ${communication.subject}\n\nContent:\n${communication.content}`);
  };

  const handleDownloadLetter = async (communication: CommunicationWithDetails) => {
    if (communication.type !== 'letter') return;
    
    try {
      // This would download the stored PDF from Supabase storage
      // For now, we'll show a placeholder
      alert('Letter download functionality would be implemented here');
    } catch (err: any) {
      console.error('Error downloading letter:', err);
      setError('Failed to download letter');
    }
  };

  const filteredCommunications = communications.filter(comm => {
    if (selectedBuilding && comm.building_id !== selectedBuilding) return false;
    if (selectedType && comm.type !== selectedType) return false;
    if (dateFrom && comm.sent_at < dateFrom) return false;
    if (dateTo && comm.sent_at > dateTo + 'T23:59:59') return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/communications">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Communications
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Communications Log</h1>
          <p className="text-muted-foreground">
            View all sent communications and letters
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                Clear All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="building-filter" className="text-sm font-medium">Building</Label>
                <Select 
                  id="building-filter"
                  value={selectedBuilding} 
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                >
                  <option value="">All Buildings</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Label htmlFor="type-filter" className="text-sm font-medium">Type</Label>
                <Select 
                  id="type-filter"
                  value={selectedType} 
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="email">Email</option>
                  <option value="letter">Letter</option>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date-from" className="text-sm font-medium">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="date-to" className="text-sm font-medium">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredCommunications.length} communication{filteredCommunications.length !== 1 ? 's' : ''}
          {selectedBuilding || selectedType || dateFrom || dateTo ? ' (filtered)' : ''}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCommunications}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Communications Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredCommunications.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No communications found</h3>
              <p className="text-muted-foreground">
                {selectedBuilding || selectedType || dateFrom || dateTo 
                  ? 'Try adjusting your filters or clear them to see all communications.'
                  : 'No communications have been sent yet.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Date Sent</th>
                    <th className="text-left p-4 font-medium">Template</th>
                    <th className="text-left p-4 font-medium">Recipient</th>
                    <th className="text-left p-4 font-medium">Building</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Method</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommunications.map((communication) => (
                    <tr key={communication.id} className="border-b hover:bg-muted/30">
                      <td className="p-4 text-sm">
                        {communication.sent_at ? formatDate(communication.sent_at) : 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {communication.template?.name || 'Unknown Template'}
                        </div>
                        {communication.subject && (
                          <div className="text-xs text-muted-foreground truncate max-w-48">
                            {communication.subject}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {communication.leaseholder?.name || 'Unknown Recipient'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {communication.leaseholder?.email || 'No email'}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {communication.building?.name || 'Unknown Building'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(communication.type || '')}
                          <span className="text-sm">
                            {getTypeLabel(communication.type || '')}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm capitalize">
                        {communication.send_method || 'Unknown'}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMessage(communication)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {communication.type === 'letter' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadLetter(communication)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 