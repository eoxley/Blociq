"use client";

import React, { useRef } from 'react';
import { 
  PrimaryHero, 
  SecondaryHero, 
  MinimalHero 
} from '@/components/marketing/HeroBanner';
import { 
  SaveTimeCard, 
  StayCompliantCard, 
  BuiltForUKCard 
} from '@/components/marketing/ValuePropCard';
import { 
  ProcessDiagram, 
  SecurityFeatures 
} from '@/components/marketing/ProcessDiagram';
import { 
  PrimaryCTA, 
  SecondaryCTA, 
  MinimalCTA, 
  DownloadCTA 
} from '@/components/marketing/CallToAction';
import { Download, Eye, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MarketingVaultPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const valuePropsRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const downloadAsset = (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (ref.current) {
      // In a real implementation, you would use html-to-image or similar
      // For now, we'll just show an alert
      alert(`Downloading ${filename}...`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              BlocIQ Marketing Vault
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Reusable marketing assets, components, and templates for presentations, 
              social media, and marketing campaigns. All styled with BlocIQ's brand kit.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs defaultValue="heroes" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="heroes">Hero Banners</TabsTrigger>
            <TabsTrigger value="value-props">Value Props</TabsTrigger>
            <TabsTrigger value="diagrams">Diagrams</TabsTrigger>
            <TabsTrigger value="ctas">Call to Actions</TabsTrigger>
          </TabsList>

          {/* Hero Banners Tab */}
          <TabsContent value="heroes" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Hero Banners</h2>
              <p className="text-lg text-slate-600">
                Eye-catching hero sections for landing pages, presentations, and marketing materials
              </p>
            </div>

            <div className="space-y-12">
              {/* Primary Hero */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Primary Hero Banner</CardTitle>
                      <CardDescription>
                        Main hero banner with BlocIQ gradient and logo
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsset(heroRef, 'primary-hero.png')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div ref={heroRef}>
                    <PrimaryHero />
                  </div>
                </CardContent>
              </Card>

              {/* Secondary Hero */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Secondary Hero Banner</CardTitle>
                      <CardDescription>
                        Alternative hero with dark gradient theme
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsset(heroRef, 'secondary-hero.png')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <SecondaryHero />
                </CardContent>
              </Card>

              {/* Minimal Hero */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Minimal Hero Banner</CardTitle>
                      <CardDescription>
                        Clean, minimal design for subtle presentations
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsset(heroRef, 'minimal-hero.png')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <MinimalHero />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Value Props Tab */}
          <TabsContent value="value-props" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Value Proposition Cards</h2>
              <p className="text-lg text-slate-600">
                Key value propositions with icons and descriptions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Save Time Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Save Time Card</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAsset(valuePropsRef, 'save-time-card.png')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div ref={valuePropsRef}>
                    <SaveTimeCard />
                  </div>
                </CardContent>
              </Card>

              {/* Stay Compliant Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Stay Compliant Card</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAsset(valuePropsRef, 'stay-compliant-card.png')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <StayCompliantCard />
                </CardContent>
              </Card>

              {/* Built for UK Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Built for UK Card</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAsset(valuePropsRef, 'built-for-uk-card.png')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <BuiltForUKCard />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Diagrams Tab */}
          <TabsContent value="diagrams" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Process Diagrams</h2>
              <p className="text-lg text-slate-600">
                Visual representations of how BlocIQ works and security features
              </p>
            </div>

            <div className="space-y-12">
              {/* Process Flow */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>How BlocIQ Works - Flow Diagram</CardTitle>
                      <CardDescription>
                        Step-by-step process flow from data input to outputs
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsset(processRef, 'process-flow.png')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div ref={processRef}>
                    <ProcessDiagram variant="flow" />
                  </div>
                </CardContent>
              </Card>

              {/* Security Features */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Security & Compliance Features</CardTitle>
                      <CardDescription>
                        Key security and compliance features
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsset(processRef, 'security-features.png')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <SecurityFeatures />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Call to Actions Tab */}
          <TabsContent value="ctas" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Call to Action Banners</h2>
              <p className="text-lg text-slate-600">
                Compelling call-to-action sections for conversions
              </p>
            </div>

            <div className="space-y-12">
              {/* Primary CTA */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Primary Call to Action</CardTitle>
                      <CardDescription>
                        Main CTA with trial and demo buttons
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsset(ctaRef, 'primary-cta.png')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div ref={ctaRef}>
                    <PrimaryCTA />
                  </div>
                </CardContent>
              </Card>

              {/* Secondary CTA */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Secondary Call to Action</CardTitle>
                      <CardDescription>
                        Alternative CTA with gradient background
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsset(ctaRef, 'secondary-cta.png')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <SecondaryCTA />
                </CardContent>
              </Card>

              {/* Minimal CTA */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Minimal Call to Action</CardTitle>
                      <CardDescription>
                        Clean, minimal CTA design
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsset(ctaRef, 'minimal-cta.png')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <MinimalCTA />
                </CardContent>
              </Card>

              {/* Download CTA */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Download Call to Action</CardTitle>
                      <CardDescription>
                        CTA for downloading marketing assets
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsset(ctaRef, 'download-cta.png')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DownloadCTA />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer CTA */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-4">
            Need Custom Marketing Assets?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Contact our marketing team for custom designs, brand guidelines, and additional assets.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              Contact Marketing Team
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Download Brand Kit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
