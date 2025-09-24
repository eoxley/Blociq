'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, TrendingUp, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const UPGRADE_PLANS = [
  {
    id: 'professional',
    name: 'Professional',
    priceId: 'price_1S4FGI2MJXtvDEifYourPriceId2', // Replace with actual Stripe price ID
    price: '£79',
    period: 'month',
    usageLimit: 5000,
    features: [
      '5,000 AI replies per month',
      'Advanced email analysis',
      'Custom response templates',
      'Building context awareness',
      'Priority email support',
      'Compliance integration'
    ],
    recommended: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceId: 'price_1S4FGJ2MJXtvDEifYourPriceId3', // Replace with actual Stripe price ID
    price: '£199',
    period: 'month',
    usageLimit: 20000,
    features: [
      '20,000 AI replies per month',
      'Full lease context integration',
      'Advanced compliance checking',
      'Custom AI training',
      'Priority phone support',
      'Dedicated account manager'
    ],
    recommended: false
  }
];

interface CurrentSubscription {
  subscription_status: string;
  monthly_usage_limit: number;
  monthly_usage_count: number;
  current_period_end: string;
}

export default function OutlookUpgradePage() {
  const [email, setEmail] = useState('');
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  const checkCurrentSubscription = async () => {
    if (!email || !email.includes('@')) {
      return;
    }

    setCheckingSubscription(true);
    try {
      const response = await fetch(`/api/outlook-subscription?email=${encodeURIComponent(email)}`);
      const result = await response.json();

      if (result.success && result.subscription) {
        setCurrentSubscription(result.subscription);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  useEffect(() => {
    const delayedCheck = setTimeout(checkCurrentSubscription, 500);
    return () => clearTimeout(delayedCheck);
  }, [email]);

  const handleUpgrade = async (priceId: string) => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setSelectedPlan(priceId);

    try {
      const response = await fetch('/api/stripe/create-outlook-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          priceId,
          successUrl: `${window.location.origin}/outlook-subscription/success`,
          cancelUrl: `${window.location.origin}/outlook-subscription/upgrade`
        }),
      });

      const result = await response.json();

      if (result.success && result.url) {
        // Redirect to Stripe checkout
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start upgrade process. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-6">
            <div className="bg-orange-600 p-3 rounded-full">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upgrade Your BlocIQ Outlook AI
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            You've reached your monthly usage limit. Upgrade to continue using AI-powered responses
            and unlock advanced features.
          </p>
        </div>

        {/* Email Input */}
        <div className="max-w-md mx-auto mb-8">
          <div className="space-y-2">
            <Label htmlFor="email">Your Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-center"
            />
            {checkingSubscription && (
              <p className="text-sm text-gray-500 text-center">
                Checking your current subscription...
              </p>
            )}
          </div>
        </div>

        {/* Current Usage Display */}
        {currentSubscription && (
          <Card className="max-w-2xl mx-auto mb-12">
            <CardHeader>
              <CardTitle className="text-center text-orange-600">Current Subscription Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {currentSubscription.monthly_usage_count}
                  </p>
                  <p className="text-sm text-gray-600">Used This Month</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {currentSubscription.monthly_usage_limit}
                  </p>
                  <p className="text-sm text-gray-600">Monthly Limit</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {Math.max(0, currentSubscription.monthly_usage_limit - currentSubscription.monthly_usage_count)}
                  </p>
                  <p className="text-sm text-gray-600">Remaining</p>
                </div>
              </div>

              {currentSubscription.monthly_usage_count >= currentSubscription.monthly_usage_limit && (
                <div className="mt-4 p-4 bg-orange-100 rounded-lg text-center">
                  <p className="text-orange-800 font-medium">
                    🚫 You've reached your monthly usage limit
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Upgrade now to continue using AI replies or wait until{' '}
                    {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upgrade Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {UPGRADE_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.recommended ? 'ring-2 ring-orange-500 scale-105' : ''}`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-orange-600 text-white px-4 py-1">
                    Recommended Upgrade
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-lg">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">/{plan.period}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">
                    {plan.usageLimit.toLocaleString()} AI replies per month
                  </p>
                  {currentSubscription && (
                    <p className="text-sm text-orange-600 font-medium">
                      {((plan.usageLimit / currentSubscription.monthly_usage_limit) * 100 - 100).toFixed(0)}% more usage
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-600 shrink-0 mr-3 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.recommended ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                  variant={plan.recommended ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(plan.priceId)}
                  disabled={loading || !email}
                >
                  {loading && selectedPlan === plan.priceId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Upgrade Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits of Upgrading */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Why Upgrade?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">More AI Responses</h3>
                <p className="text-gray-600">Handle more emails with increased monthly limits</p>
              </div>

              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Advanced Features</h3>
                <p className="text-gray-600">Access building context and compliance checking</p>
              </div>

              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Priority Support</h3>
                <p className="text-gray-600">Get faster responses and dedicated assistance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t">
          <p className="text-gray-500">
            Questions about upgrading? Contact us at{' '}
            <a href="mailto:support@blociq.co.uk" className="text-orange-600 hover:underline">
              support@blociq.co.uk
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}