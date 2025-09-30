'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Phone,
  Mail,
  Building
} from 'lucide-react';

interface Contractor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  vat_number?: string;
  categories: string[];
  notes?: string;
  contractor_documents: Array<{
    id: string;
    doc_type: string;
    status: string;
    valid_to: string;
  }>;
}

interface ContractorListProps {
  buildingId: string;
}

export function ContractorList({ buildingId }: ContractorListProps) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load contractors
  const loadContractors = async () => {
    try {
      const response = await fetch(`/api/contractors?building_id=${buildingId}`);
      const data = await response.json();
      
      if (data.success) {
        setContractors(data.contractors);
      } else {
        setError(data.error || 'Failed to load contractors');
      }
    } catch (err) {
      setError('Failed to load contractors');
    } finally {
      setIsLoading(false);
    }
  };

  // Get insurance status
  const getInsuranceStatus = (contractor: Contractor) => {
    const insurance = contractor.contractor_documents.find(doc => doc.doc_type === 'insurance');
    if (!insurance) return { status: 'missing', color: 'red' };
    if (insurance.status === 'expired') return { status: 'expired', color: 'red' };
    return { status: 'valid', color: 'green' };
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'expired': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'missing': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  useEffect(() => {
    if (buildingId) {
      loadContractors();
    }
  }, [buildingId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contractors</h2>
          <p className="text-muted-foreground">Manage contractors and compliance documents</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Contractor
        </Button>
      </div>

      {contractors.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <Building className="h-8 w-8 mx-auto mb-2" />
              <p>No contractors found</p>
              <p className="text-sm">Add your first contractor to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractors.map((contractor) => {
            const insuranceStatus = getInsuranceStatus(contractor);
            
            return (
              <Card key={contractor.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{contractor.name}</CardTitle>
                      <CardDescription>
                        {contractor.categories.length > 0 
                          ? contractor.categories.join(', ')
                          : 'General contractor'
                        }
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(insuranceStatus.status)}
                      <Badge variant={
                        insuranceStatus.color === 'green' ? 'default' :
                        insuranceStatus.color === 'red' ? 'destructive' :
                        'secondary'
                      }>
                        {insuranceStatus.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {contractor.email && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{contractor.email}</span>
                      </div>
                    )}
                    
                    {contractor.phone && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{contractor.phone}</span>
                      </div>
                    )}
                    
                    {contractor.vat_number && (
                      <div className="text-sm text-muted-foreground">
                        VAT: {contractor.vat_number}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Documents
                    </Button>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


