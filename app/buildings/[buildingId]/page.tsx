"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Building, MapPin, Calendar, Users, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import BuildingTasks from "@/components/BuildingTasks";
import SiteInspection from "@/components/SiteInspection";
import { createClient } from "@supabase/supabase-js";

interface BuildingData {
  id: string;
  name: string;
  address: string;
  total_units: number;
  year_built: number;
  building_type: string;
  management_company: string;
  contact_email: string;
  contact_phone: string;
}

export default function BuildingDetailPage() {
  const params = useParams();
  const buildingId = params.buildingId as string;
  const [building, setBuilding] = useState<BuildingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (buildingId) {
      fetchBuildingData();
    }
  }, [buildingId]);

  const fetchBuildingData = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId)
        .single();

      if (error) {
        console.error('Error fetching building:', error);
        return;
      }

      setBuilding(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LayoutWithSidebar title="Building Details" subtitle="Loading building information...">
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    );
  }

  if (!building) {
    return (
      <LayoutWithSidebar title="Building Not Found" subtitle="The requested building could not be found">
        <div className="p-6">
          <div className="text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600">Building Not Found</h2>
            <p className="text-gray-500 mt-2">The building you're looking for doesn't exist or you don't have access to it.</p>
          </div>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar 
      title={building.name} 
      subtitle={building.address}
    >
      <div className="p-6">
        {/* Building Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{building.name}</h1>
              <p className="text-gray-600 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {building.address}
              </p>
            </div>
          </div>

          {/* Building Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Units</p>
                    <p className="text-2xl font-bold text-gray-900">{building.total_units}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Year Built</p>
                    <p className="text-2xl font-bold text-gray-900">{building.year_built || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Building className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Type</p>
                    <p className="text-2xl font-bold text-gray-900">{building.building_type || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Mail className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Management</p>
                    <p className="text-lg font-bold text-gray-900 truncate">{building.management_company || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          {(building.contact_email || building.contact_phone) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {building.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{building.contact_email}</span>
                    </div>
                  )}
                  {building.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{building.contact_phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Building Features Tabs */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              📝 Tasks
            </TabsTrigger>
            <TabsTrigger value="inspections" className="flex items-center gap-2">
              🏢 Inspections
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              📊 Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            <BuildingTasks buildingId={buildingId} />
          </TabsContent>

          <TabsContent value="inspections" className="space-y-6">
            <SiteInspection buildingId={buildingId} />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Building Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Building Details</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Name:</dt>
                        <dd className="font-medium">{building.name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Address:</dt>
                        <dd className="font-medium">{building.address}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Type:</dt>
                        <dd className="font-medium">{building.building_type || 'Not specified'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Year Built:</dt>
                        <dd className="font-medium">{building.year_built || 'Not specified'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Total Units:</dt>
                        <dd className="font-medium">{building.total_units}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Management Information</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Management Company:</dt>
                        <dd className="font-medium">{building.management_company || 'Not specified'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Contact Email:</dt>
                        <dd className="font-medium">{building.contact_email || 'Not specified'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Contact Phone:</dt>
                        <dd className="font-medium">{building.contact_phone || 'Not specified'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutWithSidebar>
  );
} 