'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Mail, Zap, Shield, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PRICING_PLANS = [
  {
    id: 'professional',
    name: 'BlocIQ Outlook AI',
    priceId: 'price_1S4FGI2MJXtvDEifOutlookAI15', // Replace with actual Stripe price ID
    price: '£15',
    period: 'month',
    originalPrice: '£15',
    trialDays: 30,
    usageLimit: 5000,
    features: [
      '30-day free trial',
      'Unlimited AI replies during trial',
      'After trial: 5,000 AI replies per month',
      'Advanced email analysis',
      'Building & lease context awareness',
      'Property management compliance',
      'Professional response templates',
      'Email support'
    ],
    recommended: true
  }
];

export default function OutlookSubscriptionPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
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
          cancelUrl: `${window.location.origin}/outlook-subscription`
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
      console.error('Subscription error:', error);
      alert('Failed to start subscription process. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-6">
            <div className="bg-blue-600 p-3 rounded-full">
              <Mail className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            BlocIQ Outlook AI Assistant
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform your property management emails with AI-powered responses.
            Generate professional, context-aware replies directly in Outlook.
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Zap className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Instant AI Replies</h3>
              <p className="text-sm text-gray-600">Generate professional responses in seconds</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Compliance Aware</h3>
              <p className="text-sm text-gray-600">Built-in property management compliance</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Mail className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Context Understanding</h3>
              <p className="text-sm text-gray-600">Understands building and lease context</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Save Time</h3>
              <p className="text-sm text-gray-600">Reduce email response time by 80%</p>
            </CardContent>
          </Card>
        </div>

        {/* Email Input */}
        <div className="max-w-md mx-auto mb-12">
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
            <p className="text-sm text-gray-500 text-center">
              Enter your email to get started with your subscription
            </p>
          </div>
        </div>

        {/* Pricing Plan */}
        <div className="max-w-lg mx-auto">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className="relative ring-2 ring-blue-500 scale-105"
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-green-600 text-white px-4 py-1">
                  30-Day Free Trial
                </Badge>
              </div>

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-3xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-lg">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">
                      FREE for 30 days
                    </div>
                    <div className="text-lg">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600">/{plan.period} after trial</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-green-700 bg-green-50 p-2 rounded-lg">
                    ✨ Start your free trial today - no payment required upfront
                  </p>
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={loading || !email}
                >
                  {loading && selectedPlan === plan.priceId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Start Free Trial'
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Cancel anytime during your free trial. No charges until day 31.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How it Works */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold mb-2">Subscribe & Install</h3>
              <p className="text-gray-600">Choose your plan and install the Outlook add-in</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-semibold mb-2">Generate Replies</h3>
              <p className="text-gray-600">Click the BlocIQ button to generate AI-powered responses</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-semibold mb-2">Review & Send</h3>
              <p className="text-gray-600">Review the generated reply and send with confidence</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">How does the 30-day free trial work?</h3>
                <p className="text-gray-600">
                  Start using BlocIQ Outlook AI immediately with unlimited AI replies for 30 days.
                  No payment required upfront. Cancel anytime during the trial with no charges.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">What happens after my free trial?</h3>
                <p className="text-gray-600">
                  After 30 days, your subscription continues at £15/month with 5,000 AI replies
                  per month. You'll be notified before any charges and can cancel anytime.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Do I need an existing BlocIQ account?</h3>
                <p className="text-gray-600">
                  No, the Outlook AI Assistant is a standalone subscription that works independently
                  of the main BlocIQ platform.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">What if I exceed my monthly limit?</h3>
                <p className="text-gray-600">
                  During your free trial, usage is unlimited. After the trial, you get 5,000 AI replies
                  per month. If you need more, contact us about custom pricing.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                <p className="text-gray-600">
                  Yes, you can cancel during your free trial with no charges, or anytime after.
                  You'll continue to have access until the end of your current billing period.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t">
          <p className="text-gray-500">
            Questions? Contact us at{' '}
            <a href="mailto:support@blociq.co.uk" className="text-blue-600 hover:underline">
              support@blociq.co.uk
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}