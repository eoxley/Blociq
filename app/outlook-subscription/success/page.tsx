'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Mail, ExternalLink } from 'lucide-react';

interface SubscriptionDetails {
  id: string;
  status: string;
  customer: string;
  current_period_end: string;
}

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    console.log('Success page loaded with URL:', window.location.href);
    console.log('Session ID from search params:', sessionId);
    console.log('All search params:', Object.fromEntries(searchParams.entries()));

    if (sessionId) {
      console.log('Found session ID, fetching subscription details...');
      fetchSubscriptionDetails();
    } else {
      // Check if this is a direct visit or incomplete checkout
      console.log('No session ID found in URL:', window.location.href);

      // Try to check if user has any recent subscription instead
      checkForRecentSubscription();
    }
  }, [sessionId]);

  const checkForRecentSubscription = async () => {
    try {
      // Check if there's a recent subscription for any email
      // This is a fallback when session ID is missing
      const response = await fetch('/api/admin/outlook-monitoring');
      const data = await response.json();

      if (data.recentActivity && data.recentActivity.length > 0) {
        const recentSubscription = data.recentActivity.find(
          (activity: any) => activity.action.includes('Subscription') &&
          new Date(activity.timestamp) > new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        );

        if (recentSubscription) {
          // Show success without session details
          setSubscription({
            id: 'recent_subscription',
            status: 'active',
            customer: recentSubscription.email,
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking for recent subscriptions:', error);
    }

    setError('No session ID found');
    setLoading(false);
  };

  const fetchSubscriptionDetails = async () => {
    try {
      console.log('Fetching subscription details for session:', sessionId);
      const response = await fetch(`/api/stripe/create-outlook-subscription?session_id=${sessionId}`);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const result = await response.json();
      console.log('API response:', result);

      if (result.success) {
        console.log('✅ Successfully retrieved subscription:', result.subscription);
        setSubscription(result.subscription);
      } else {
        console.error('❌ API returned error:', result.error);
        setError(result.error || 'Failed to retrieve subscription details');
      }
    } catch (error) {
      console.error('❌ Network error fetching subscription:', error);
      setError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const downloadManifest = () => {
    const manifestUrl = '/outlook-addin/manifest.xml';
    const link = document.createElement('a');
    link.href = manifestUrl;
    link.download = 'blociq-outlook-manifest.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your subscription details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-orange-600">Setup Incomplete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                It looks like you haven't completed the subscription process yet, or you arrived here directly.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">What happened?</h4>
                <p className="text-sm text-blue-800 mb-2">
                  You may have arrived here directly or there was a redirect issue from Stripe.
                </p>
                <h4 className="font-semibold text-blue-900 mb-2 mt-4">Next Steps:</h4>
                <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                  <li>If you just completed payment, click "I Just Paid" below</li>
                  <li>If you haven't paid yet, start your subscription</li>
                  <li>Check your email for payment confirmation from Stripe</li>
                </ol>
              </div>

              <div className="flex space-x-3">
                <Button asChild className="flex-1">
                  <a href="/outlook-subscription">Start Subscription</a>
                </Button>
                <Button variant="default" asChild className="flex-1 bg-green-600 hover:bg-green-700">
                  <a href="/outlook-subscription/install">I Just Paid - Get Add-ins</a>
                </Button>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg mt-4">
                <p className="text-xs text-yellow-800">
                  <strong>Debug info:</strong> No session_id parameter found in URL.
                  If you just completed payment, please check your browser console or contact support.
                </p>
              </div>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => window.location.reload()}
                  className="text-sm"
                >
                  🔄 Refresh Page
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                If you just completed payment, click "I Just Paid - Get Add-ins" to proceed with installation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to BlocIQ Outlook AI!
            </h1>
            <p className="text-xl text-gray-600">
              Your subscription is now active. Let's get you set up.
            </p>
          </div>

          {/* Subscription Details */}
          {subscription && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-green-600">Subscription Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-lg">{subscription.customer}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="text-lg capitalize">{subscription.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Next Billing Date</p>
                    <p className="text-lg">
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Subscription ID</p>
                    <p className="text-lg font-mono text-sm">{subscription.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Setup Instructions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    1
                  </span>
                  Download the Outlook Add-in
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Download and install the BlocIQ manifest file to add AI functionality to your Outlook.
                </p>
                <Button onClick={downloadManifest} className="mr-4">
                  <Download className="mr-2 h-4 w-4" />
                  Download Manifest File
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    2
                  </span>
                  Install in Outlook
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Follow these steps to install the add-in in your Outlook:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Open Outlook (Web, Desktop, or Mobile)</li>
                  <li>Go to Home → Get Add-ins (or Store)</li>
                  <li>Click "My add-ins" → "Add a custom add-in"</li>
                  <li>Select "Add from file" and upload the downloaded manifest</li>
                  <li>Click "Install" to complete the setup</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    3
                  </span>
                  Start Using AI Replies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Once installed, you'll see BlocIQ buttons in your Outlook interface:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Ask BlocIQ:</strong> Get AI assistance with property management questions</li>
                  <li><strong>Generate Reply:</strong> Create professional responses to emails</li>
                  <li><strong>Triage Inbox:</strong> Process multiple emails with AI-generated drafts</li>
                </ul>
              </CardContent>
            </Card>

            {/* Support Links */}
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <Button variant="outline" asChild>
                    <a href="mailto:support@blociq.co.uk">
                      <Mail className="mr-2 h-4 w-4" />
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
                      Installation Guide
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <div className="text-center pt-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                You're All Set! 🎉
              </h3>
              <p className="text-gray-600 mb-6">
                Start transforming your property management emails with AI-powered responses.
              </p>
              <Button size="lg" asChild>
                <a href="https://outlook.office.com" target="_blank" rel="noopener noreferrer">
                  <Mail className="mr-2 h-4 w-4" />
                  Open Outlook
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}