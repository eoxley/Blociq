import React from "react";
import Link from "next/link";
import { Check, ArrowRight, Star, Users, Building, Zap, Shield } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BlocIQLogo from "@/components/BlocIQLogo";

export default function PricingPage() {
  const tiers = [
    {
      name: "Solo",
      price: "£104",
      period: "/month",
      badge: "Perfect to start",
      icon: <Users className="w-6 h-6" />,
      description: "Perfect for solo property managers who need core compliance tools and AI assistance.",
      valueProps: "Save 5+ hours per week with AI-powered document analysis and automated compliance tracking.",
      features: [
        "1-2 users included",
        "Up to 3 buildings",
        "BlocIQ AI Chat unlimited",
        "Basic compliance dashboard", 
        "Email templates & drafts",
        "Community support",
      ],
      ctaLabel: "Start Free Trial",
      href: "/enquiry",
      variant: "outline" as const,
      testimonial: '"BlocIQ saved me 6 hours a week on compliance admin" - Sarah M., Independent Agent',
      mostPopular: false,
    },
    {
      name: "Professional",
      price: "£295",
      period: "/month", 
      badge: "Most popular",
      icon: <Building className="w-6 h-6" />,
      description: "Ideal for growing teams managing multiple properties who need efficiency and automation.",
      valueProps: "Automate 80% of routine compliance tasks and scale your operations without hiring more staff.",
      features: [
        "3-8 users included",
        "Up to 15 buildings",
        "Advanced BlocIQ AI features",
        "Automated compliance reminders",
        "Outlook integration & email AI",
        "Priority email support",
        "Lease analysis & OCR",
        "Custom email templates",
      ],
      ctaLabel: "Book Demo",
      href: "/enquiry",
      variant: "default" as const,
      testimonial: '"Our compliance workload dropped 75% after implementing BlocIQ" - Mark T., Property Agency',
      mostPopular: true,
    },
    {
      name: "Scale",
      price: "£695", 
      period: "/month",
      badge: "Best for agencies",
      icon: <Zap className="w-6 h-6" />,
      description: "For established agencies needing advanced automation, integrations, and team collaboration.",
      valueProps: "Multiply your team's productivity with full automation, API integrations, and advanced reporting.",
      features: [
        "9-25 users included",
        "Unlimited buildings",
        "Advanced AI with higher limits",
        "API integrations (Qube/MRI)", 
        "Advanced reporting & analytics",
        "Phone & email support",
        "Custom workflows",
        "Multi-office management",
        "Client portal access",
      ],
      ctaLabel: "Contact Sales",
      href: "mailto:hello@blociq.co.uk?subject=BlocIQ%20Scale%20enquiry",
      variant: "outline" as const,
      testimonial: '"BlocIQ helped us manage 3x more properties with the same team size" - Lisa K., Regional Manager',
      mostPopular: false,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      badge: "Housing associations",
      icon: <Shield className="w-6 h-6" />,
      description: "For large housing providers requiring governance, security, and dedicated support.",
      valueProps: "Enterprise-grade security, compliance, and scalability with dedicated success management.",
      features: [
        "Unlimited users & buildings",
        "Enterprise security (SSO, SAML)",
        "Custom integrations & APIs",
        "Dedicated success manager", 
        "SLA guarantees",
        "Advanced compliance reporting",
        "Custom training programs",
        "Data migration assistance",
      ],
      ctaLabel: "Contact Sales",
      href: "mailto:hello@blociq.co.uk?subject=BlocIQ%20Enterprise%20enquiry", 
      variant: "outline" as const,
      testimonial: '"BlocIQ transformed our compliance process across 500+ properties" - David R., Housing Association',
      mostPopular: false,
    },
  ];

  const extras = [
    { name: "Lease Reader (OCR + AI)", detail: "Extract clauses, dates, parties from scanned or digital leases.", price: "£0.11–£0.26* per page or £52*/building/month pack" },
    { name: "Outlook Add-in", detail: "AI reply drafts, summarise, file to building/unit, link emails to records.", price: "£5.25*/user/month (min 10)" },
    { name: "Compliance Pro", detail: "Automated reminders, calendar sync, PDF ingestion to compliance items.", price: "£209*/building/month" },
    { name: "Custom Integrations", detail: "Qube/MRI/third-party connectors, single sign-on, procurement exports.", price: "POA" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#f1f5f9]">
      {/* Header with BlocIQ Logo */}
      <div className="bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 text-white p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
              <BlocIQLogo size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">BlocIQ</h1>
              <p className="text-white/90 text-sm">Property Management Platform</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center">
            {/* Social Proof */}
            <div className="mb-8">
              <div className="flex items-center justify-center gap-1 text-yellow-500 mb-3">
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <span className="ml-2 text-gray-600 font-medium">Trusted by 200+ UK Property Managers</span>
              </div>
            </div>
            
            {/* Hero Title */}
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 bg-clip-text text-transparent mb-6 tracking-tight">
              Scale Your Success
            </h1>
            
            {/* Hero Subtitle */}
            <p className="text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed mb-8">
              Choose the perfect plan to transform your property management with AI-powered automation
            </p>
            
            {/* Value Proposition */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Save 15+ Hours Weekly</h3>
                <p className="text-gray-600 text-sm">Automate compliance, communications, and reporting</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">100% UK Compliant</h3>
                <p className="text-gray-600 text-sm">Stay ahead of regulations with AI-powered tracking</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Scale Without Limits</h3>
                <p className="text-gray-600 text-sm">Manage more properties with the same team size</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="mx-auto max-w-7xl px-6 py-20">

        {/* Implementation table */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Implementation & Onboarding</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose your onboarding experience - from self-serve to white-glove service
            </p>
          </div>
          
          <Card className="rounded-3xl shadow-2xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#4f46e5]/5 to-[#a855f7]/5 p-8">
              <CardTitle className="text-2xl font-bold text-gray-900">Implementation / Onboarding (one-off)</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid sm:grid-cols-3 gap-6 text-base">
                <div className="p-6 border border-gray-200 rounded-2xl bg-white hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <span className="text-white font-bold text-lg">🚀</span>
                  </div>
                  <p className="font-bold text-lg mb-2">Self-serve</p>
                  <p className="text-gray-600">£0 – you plug in and go</p>
                </div>
                <div className="p-6 border border-gray-200 rounded-2xl bg-white hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <span className="text-white font-bold text-lg">🎯</span>
                  </div>
                  <p className="font-bold text-lg mb-2">Guided</p>
                  <p className="text-gray-600">From £2,100 – training & data import</p>
                </div>
                <div className="p-6 border border-gray-200 rounded-2xl bg-white hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <span className="text-white font-bold text-lg">👑</span>
                  </div>
                  <p className="font-medium text-lg mb-2">White-glove</p>
                  <p className="text-gray-600">From £5,250 – integrations & custom setup</p>
                </div>
              </div>
              <p className="mt-6 text-sm text-gray-500 text-center">*Example pricing excludes VAT. Annual discounts available. Contact us for current rates.</p>
              <div className="mt-8 text-center">
                {/* Temporarily disabled - Onboarding page */}
                {/* <Link href="/onboarding">
                  <Button className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    View onboarding steps <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link> */}
                <Button 
                  disabled
                  className="bg-gray-300 text-gray-500 px-8 py-3 rounded-2xl font-semibold cursor-not-allowed"
                >
                  View onboarding steps <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription tiers */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 bg-clip-text text-transparent mb-6">
              Find Your Perfect Fit
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              No surprising jumps. No hidden fees. Just transparent pricing that scales with your business.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
            {tiers.map((t, index) => (
              <Card key={t.name} className={`rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${t.mostPopular ? "ring-4 ring-gradient-to-r from-pink-500 to-blue-500 scale-105 lg:scale-110" : "hover:scale-105"} overflow-hidden`}>
                {t.mostPopular && (
                  <div className="bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 text-white text-center py-2 px-4 text-sm font-bold">
                    ⭐ MOST POPULAR
                  </div>
                )}
                
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 rounded-xl flex items-center justify-center text-white">
                      {t.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">{t.name}</CardTitle>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                        {t.badge}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">{t.price}</span>
                      <span className="text-gray-500 text-lg">{t.period}</span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{t.description}</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-pink-50 via-teal-50 to-blue-50 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-800 leading-relaxed">{t.valueProps}</p>
                  </div>
                </CardHeader>
                
                <CardContent className="px-6 pb-4">
                  <ul className="space-y-2">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                        <span className="text-sm text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardContent className="px-6 py-4">
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs italic text-gray-600 leading-relaxed">{t.testimonial}</p>
                  </div>
                </CardContent>
                
                <CardFooter className="p-6 pt-0">
                  <Link href={t.href} className="w-full">
                    <Button 
                      className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${
                        t.mostPopular
                          ? "bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 hover:brightness-110 text-white"
                          : "bg-white border-2 border-gradient-to-r from-pink-500 to-blue-500 text-transparent bg-clip-text hover:bg-gradient-to-r hover:from-pink-500 hover:to-blue-500 hover:text-white"
                      }`}
                    >
                      {t.ctaLabel}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Extras */}
        <section id="extras" className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Extras & Add-ons</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Enhance your BlocIQ experience with powerful add-on features
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {extras.map((x, index) => (
              <Card key={x.name} className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[#4f46e5]/5 to-[#a855f7]/5 p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {index === 0 ? '📄' : index === 1 ? '📧' : index === 2 ? '✅' : '🔗'}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-900">{x.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-4 leading-relaxed">{x.detail}</p>
                  <div className="bg-gradient-to-r from-[#4f46e5]/10 to-[#a855f7]/10 border border-[#4f46e5]/20 rounded-xl p-4">
                    <p className="font-semibold text-[#4f46e5] text-center">{x.price}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Quick answers to common pricing questions
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-gray-900 mb-3">Can I upgrade or downgrade anytime?</h3>
              <p className="text-gray-600">Yes! Change plans monthly with no penalties. Upgrades take effect immediately, downgrades at your next billing cycle.</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-gray-900 mb-3">Is there a free trial?</h3>
              <p className="text-gray-600">All plans include a 30-day free trial with full access to features. No credit card required to start.</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-gray-900 mb-3">What about data migration?</h3>
              <p className="text-gray-600">We provide free data migration assistance on Professional plans and above. Our team helps transfer your existing data seamlessly.</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-gray-900 mb-3">Are there setup fees?</h3>
              <p className="text-gray-600">No setup fees for Solo and Professional plans. Scale and Enterprise may include optional onboarding services.</p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 rounded-3xl p-12 text-white max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-4">Ready to Transform Your Property Management?</h3>
            <p className="text-xl mb-8 text-white/90 leading-relaxed">
              Join hundreds of UK property managers who've already scaled their success with BlocIQ
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
              <Link href="/enquiry" className="flex-1">
                <Button className="w-full py-4 px-8 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                  Start Free Trial
                </Button>
              </Link>
              <a href="mailto:hello@blociq.co.uk?subject=BlocIQ%20Pricing%20Question" className="flex-1">
                <Button className="w-full py-4 px-8 border-2 border-white bg-transparent text-white font-bold rounded-2xl hover:bg-white hover:text-gray-900 transition-all duration-300">
                  Ask Questions
                </Button>
              </a>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-white/80 text-sm">
                Questions? Email <a href="mailto:hello@blociq.co.uk" className="font-semibold underline hover:text-white">hello@blociq.co.uk</a> or call for immediate assistance.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
