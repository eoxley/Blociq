'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Monitor,
  Smartphone,
  Globe,
  FileText,
  MessageSquare,
  Zap,
  ArrowRight
} from 'lucide-react';

const MANIFEST_FILES = [
  {
    id: 'ask-ai',
    name: 'BlocIQ Ask AI',
    description: 'Get instant answers to property management questions directly in Outlook',
    filename: 'manifest.xml',
    features: [
      'AI-powered property management assistance',
      'Instant answers to compliance questions',
      'Building and lease context awareness',
      'Works in any Outlook folder'
    ]
  },
  {
    id: 'reply',
    name: 'BlocIQ Smart Reply',
    description: 'Generate professional email responses with AI assistance',
    filename: 'outlook-manifest-reply.xml',
    features: [
      'AI-generated professional replies',
      'Context-aware responses',
      'Property management compliance built-in',
      'Works with any email thread'
    ]
  },
  {
    id: 'triage',
    name: 'BlocIQ Inbox Triage',
    description: 'Automatically process and create draft replies for multiple emails',
    filename: 'outlook-manifest-triage.xml',
    features: [
      'Batch process up to 20 emails',
      'Auto-generate draft replies',
      'Smart email categorization',
      'Bulk email management'
    ]
  }
];

export default function OutlookInstallPage() {
  const [downloadedManifests, setDownloadedManifests] = useState<string[]>([]);

  const downloadManifest = (manifestId: string, filename: string) => {
    const manifestUrl = `/outlook-addin/${filename}`;
    const link = document.createElement('a');
    link.href = manifestUrl;
    link.download = `blociq-${manifestId}-manifest.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadedManifests(prev => [...prev, manifestId]);
  };

  const downloadAllManifests = () => {
    MANIFEST_FILES.forEach(manifest => {
      setTimeout(() => {
        downloadManifest(manifest.id, manifest.filename);
      }, 100);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">
              Installation Instructions
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your BlocIQ Outlook AI subscription is active! Follow these steps to install the three AI add-ins and start transforming your email workflow.
          </p>
        </div>

        {/* Quick Download Section */}
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <Download className="mr-2 h-5 w-5" />
              Quick Start: Download All Manifests
            </CardTitle>
            <CardDescription className="text-green-700">
              Download all three manifest files at once, then follow the installation steps below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={downloadAllManifests}
              className="bg-green-600 hover:bg-green-700 text-white mr-4"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Download All 3 Manifests
            </Button>
            <span className="text-sm text-green-600">
              Files will be saved to your Downloads folder
            </span>
          </CardContent>
        </Card>

        {/* Manifest Files Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {MANIFEST_FILES.map((manifest) => (
            <Card key={manifest.id} className="relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{manifest.name}</span>
                  {downloadedManifests.includes(manifest.id) && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <CardDescription>{manifest.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {manifest.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  onClick={() => downloadManifest(manifest.id, manifest.filename)}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download {manifest.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Installation Instructions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Installation Instructions - Outlook Desktop Only</CardTitle>
            <CardDescription>
              BlocIQ add-ins work best with Outlook Desktop application. Web and mobile have limited functionality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Compatibility Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Monitor className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800">Recommended: Outlook Desktop</h4>
                  <p className="text-blue-700 text-sm mt-1">
                    For the best experience with BlocIQ AI add-ins, use the Outlook Desktop application.
                    Web and mobile versions have limited add-in support and may not display all features properly.
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Installation Steps */}
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: "Open Outlook Desktop",
                  content: "Launch your Outlook desktop application (Windows or Mac)"
                },
                {
                  step: 2,
                  title: "Access Add-ins Store",
                  content: "Go to Home tab → Store (or Get Add-ins) in the ribbon"
                },
                {
                  step: 3,
                  title: "My Add-ins",
                  content: "Click 'My Add-ins' in the left sidebar of the store"
                },
                {
                  step: 4,
                  title: "Add Custom Add-in",
                  content: "Click 'Add a custom add-in' → 'Add from file' and select your downloaded manifest files"
                },
                {
                  step: 5,
                  title: "Install All Three Add-ins",
                  content: "Install each manifest file one by one: Ask AI, Smart Reply, and Inbox Triage. Click 'Install' for each one."
                },
                {
                  step: 6,
                  title: "Restart Outlook",
                  content: "Close and restart Outlook. The BlocIQ buttons will appear in your ribbon when you open emails."
                }
              ].map((instruction) => (
                <div key={instruction.step} className="flex items-start p-4 bg-white rounded-lg border">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0">
                    {instruction.step}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{instruction.title}</h4>
                    <p className="text-gray-600 text-sm">{instruction.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Alternative Platform Notice */}
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800">Other Platforms</h4>
                  <p className="text-yellow-700 text-sm mt-1">
                    <strong>Outlook Web:</strong> Limited functionality - add-ins may not load properly.<br/>
                    <strong>Outlook Mobile:</strong> No add-in support - use desktop version for BlocIQ features.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Guide */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How to Use Your BlocIQ AI Add-ins</CardTitle>
            <CardDescription>
              Once installed, here's how to make the most of your AI-powered email assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Ask BlocIQ</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Get instant answers to property management questions
                </p>
                <Badge variant="outline" className="text-xs">Click in any email</Badge>
              </div>

              <div className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Smart Reply</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Generate professional responses to any email
                </p>
                <Badge variant="outline" className="text-xs">Click when reading emails</Badge>
              </div>

              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Inbox Triage</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Process multiple emails and create drafts automatically
                </p>
                <Badge variant="outline" className="text-xs">Click in inbox view</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
            <CardDescription>
              Common installation issues and solutions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">❌ "Add-in failed to load" error</h4>
                <p className="text-sm text-gray-600 mb-2">
                  This usually means the manifest file is corrupted or blocked.
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Re-download the manifest files from this page</li>
                  <li>Ensure your organization allows custom add-ins</li>
                  <li>Try installing in an incognito/private browser window</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">❌ BlocIQ buttons not appearing</h4>
                <p className="text-sm text-gray-600 mb-2">
                  The add-ins may need time to activate or require a refresh.
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Refresh your browser or restart Outlook</li>
                  <li>Check if the add-ins are enabled in Settings → Add-ins</li>
                  <li>Try opening a different email to trigger the add-in loading</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">❌ "Subscription required" message</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Your subscription may not be fully activated yet.
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Wait a few minutes for subscription to activate</li>
                  <li>Check your email for subscription confirmation</li>
                  <li>Contact support if issues persist after 30 minutes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              Our team is here to help you get up and running
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Button variant="outline" asChild>
                <a href="mailto:support@blociq.co.uk">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Email Support
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href="https://docs.microsoft.com/en-us/office/dev/add-ins/outlook/sideload-outlook-add-ins-for-testing"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Microsoft's Guide
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}