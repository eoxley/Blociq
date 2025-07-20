'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { AlertSuccess, AlertError, AlertWarning, AlertInfo } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';

export default function DesignSystemPage() {
  return (
    <LayoutWithSidebar>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">BlocIQ Design System</h1>
          <p className="text-muted-foreground">Enhanced color palette and component library</p>
        </div>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Brand Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="h-16 bg-primary rounded-lg border"></div>
                  <p className="text-sm font-medium">Primary</p>
                  <p className="text-xs text-muted-foreground">#2BBEB4</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-secondary rounded-lg border"></div>
                  <p className="text-sm font-medium">Secondary</p>
                  <p className="text-xs text-muted-foreground">#0F5D5D</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-background rounded-lg border"></div>
                  <p className="text-sm font-medium">Background</p>
                  <p className="text-xs text-muted-foreground">#FAFAFA</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-text rounded-lg border"></div>
                  <p className="text-sm font-medium text-white">Text</p>
                  <p className="text-xs text-muted-foreground">#333333</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Support Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="h-16 bg-error rounded-lg border"></div>
                  <p className="text-sm font-medium">Error</p>
                  <p className="text-xs text-muted-foreground">#EF4444</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-warning rounded-lg border"></div>
                  <p className="text-sm font-medium">Warning</p>
                  <p className="text-xs text-muted-foreground">#FBBF24</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-success rounded-lg border"></div>
                  <p className="text-sm font-medium">Success</p>
                  <p className="text-xs text-muted-foreground">#10B981</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-info rounded-lg border"></div>
                  <p className="text-sm font-medium">Info</p>
                  <p className="text-xs text-muted-foreground">#6366F1</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button variant="default">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="info">Info</Button>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">🚀</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge variant="default">Default</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="urgent">Urgent</Badge>
              <Badge variant="finance">Finance</Badge>
              <Badge variant="complaint">Complaint</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AlertSuccess>
              <h4 className="font-medium">Success!</h4>
              <p>Your action was completed successfully.</p>
            </AlertSuccess>
            <AlertError>
              <h4 className="font-medium">Error!</h4>
              <p>Something went wrong. Please try again.</p>
            </AlertError>
            <AlertWarning>
              <h4 className="font-medium">Warning!</h4>
              <p>Please review your input before proceeding.</p>
            </AlertWarning>
            <AlertInfo>
              <h4 className="font-medium">Info</h4>
              <p>Here's some helpful information for you.</p>
            </AlertInfo>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="input-demo">Input Field</Label>
              <Input id="input-demo" placeholder="Enter some text..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="select-demo">Select Field</Label>
              <Select id="select-demo">
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="textarea-demo">Textarea</Label>
              <Textarea id="textarea-demo" placeholder="Enter a longer message..." />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="checkbox-demo" checked={false} onCheckedChange={() => {}} />
              <Label htmlFor="checkbox-demo">Check this box</Label>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>75%</span>
              </div>
              <Progress value={75} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Loading</span>
                <span>25%</span>
              </div>
              <Progress value={25} />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4">
                <p>This is the overview tab content.</p>
              </TabsContent>
              <TabsContent value="analytics" className="mt-4">
                <p>This is the analytics tab content.</p>
              </TabsContent>
              <TabsContent value="reports" className="mt-4">
                <p>This is the reports tab content.</p>
              </TabsContent>
              <TabsContent value="notifications" className="mt-4">
                <p>This is the notifications tab content.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>Skeleton Loading</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <Skeleton className="h-[125px] w-full rounded-xl" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
} 