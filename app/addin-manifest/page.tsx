'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Download, ExternalLink, FileText, AlertCircle } from 'lucide-react';

export default function AddinManifestPage() {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success'>('idle');

  const handleDownload = async () => {
    setDownloadStatus('downloading');
    
    try {
      const response = await fetch('/api/addin/manifest');
      
      if (!response.ok) {
        throw new Error('Failed to download manifest');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'BlocIQ-Outlook-Addin-manifest.xml';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setDownloadStatus('success');
      setTimeout(() => setDownloadStatus('idle'), 3000);
      
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus('idle');
      alert('Download failed. Please try again.');
    }
  };

  const copyManifestUrl = () => {
    const url = `${window.location.origin}/api/addin/manifest`;
    navigator.clipboard.writeText(url);
    alert('Manifest URL copied to clipboard!');
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          BlocIQ Outlook Add-in Manifest
        </h1>
        <p className="text-gray-600">
          Download the manifest file for Microsoft Partner Center submission
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Download Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Download Manifest
            </CardTitle>
            <CardDescription>
              Get the latest manifest.xml file for add-in submission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Version:</span>
              <Badge variant="secondary">1.0.0.6</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ready for Submission
              </Badge>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleDownload}
                disabled={downloadStatus === 'downloading'}
                className="w-full"
                size="lg"
              >
                {downloadStatus === 'downloading' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Downloading...
                  </>
                ) : downloadStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Downloaded!
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download manifest.xml
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={copyManifestUrl}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Copy Direct URL
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submission Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Submission Guide
            </CardTitle>
            <CardDescription>
              Steps to submit to Microsoft Partner Center
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Download manifest.xml</p>
                  <p className="text-sm text-gray-600">Use the download button above</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Go to Partner Center</p>
                  <p className="text-sm text-gray-600">
                    Visit{' '}
                    <a 
                      href="https://partner.microsoft.com/dashboard" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Microsoft Partner Center
                    </a>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Upload & Submit</p>
                  <p className="text-sm text-gray-600">Upload the manifest file and submit for review</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <div>
                  <p className="font-medium">Wait for Approval</p>
                  <p className="text-sm text-gray-600">Microsoft review typically takes 1-5 business days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Changes */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Changes (v1.0.0.6)</CardTitle>
          <CardDescription>
            Latest fixes applied to ensure Microsoft approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Fixed WebApplicationInfo configuration issues</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Added required Privacy Policy and Terms of Use URLs</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Enhanced description for better approval chances</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Verified all URLs are accessible via HTTPS</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Updated manifest schema compliance</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Direct URL Display */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Direct Manifest URL</CardTitle>
          <CardDescription>
            You can also access the manifest directly at this URL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm break-all">
            {typeof window !== 'undefined' && `${window.location.origin}/api/addin/manifest`}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            This URL always serves the latest version of your manifest file
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
