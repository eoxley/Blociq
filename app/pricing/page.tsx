import React from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  const tiers = [
    {
      name: "Starter (Trial)",
      price: "£104*",
      period: "/month",
      badge: "Best to try now",
      description:
        "For solo property managers or very small teams who want BlocIQ Chat, lease upload, and the Outlook add-in.",
      features: [
        "1–3 users",
        "Ask BlocIQ AI assistant",
        "Compliance dashboard (1 building)",
        "Email templates + quick drafts",
        "Community support",
      ],
      ctaLabel: "Start 30-day trial",
      href: "/onboarding",
      variant: "outline" as const,
    },
    {
      name: "Growth",
      price: "£1,575*",
      period: "/month",
      badge: "Most popular",
      description:
        "For agencies managing multiple buildings who want automation and support.",
      features: [
        "Up to 20 users",
        "Unlimited buildings",
        "Ask BlocIQ + higher AI limits",
        "Compliance tracker + reminders",
        "Outlook integration (send/reply)",
        "Priority support",
      ],
      ctaLabel: "Talk to us",
      href: "mailto:hello@blociq.co.uk?subject=BlocIQ%20Growth%20enquiry",
      variant: "default" as const,
    },
    {
      name: "Enterprise",
      price: "Custom*",
      period: "",
      badge: "Housing associations",
      description:
        "For larger providers with governance, SSO and custom SLAs.",
      features: [
        "Unlimited users",
        "Advanced AI & higher limits",
        "Custom integrations (Qube/MRI)",
        "Security review + DPA",
        "Dedicated success manager",
      ],
      ctaLabel: "Contact sales",
      href: "mailto:hello@blociq.co.uk?subject=BlocIQ%20Enterprise%20enquiry",
      variant: "outline" as const,
    },
  ];

  const extras = [
    { name: "Lease Reader (OCR + AI)", detail: "Extract clauses, dates, parties from scanned or digital leases.", price: "£0.11–£0.26* per page or £52*/building/month pack" },
    { name: "Outlook Add-in", detail: "AI reply drafts, summarise, file to building/unit, link emails to records.", price: "£5.25*/user/month (min 10)" },
    { name: "Compliance Pro", detail: "Automated reminders, calendar sync, PDF ingestion to compliance items.", price: "£209*/building/month" },
    { name: "Custom Integrations", detail: "Qube/MRI/third-party connectors, single sign-on, procurement exports.", price: "POA" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Hero Section with Communications Hub Styling */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-20">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center">
            {/* Hero Icon */}
            <div className="w-20 h-20 bg-white/25 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/30">
              <div className="text-white text-2xl font-bold">£</div>
            </div>
            
            {/* Hero Title */}
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Transparent UK Pricing
            </h1>
            
            {/* Hero Subtitle */}
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-8">
              Simple subscription with an optional one-off implementation fee. Start small, scale easily.
            </p>
            
            {/* Example Pricing Notice */}
            <div className="mt-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6 max-w-2xl mx-auto shadow-xl">
              <p className="text-white text-base font-medium">
                Example Pricing Structure - The pricing shown below are examples only. Contact us for current rates and personalized quotes.
              </p>
            </div>
            
            {/* Navigation Links */}
            <div className="mt-8 flex items-center justify-center gap-6 text-base">
              <Link href="/onboarding" className="text-white/90 hover:text-white transition-colors font-medium">
                See onboarding
              </Link>
              <span className="text-white/50">•</span>
              <a href="#extras" className="text-white/90 hover:text-white transition-colors font-medium">
                Extras & Add-ons
              </a>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
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
                <Link href="/onboarding">
                  <Button className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    View onboarding steps <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription tiers */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Choose Your Plan</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Start with our trial plan and scale up as your business grows
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {tiers.map((t) => (
              <Card key={t.name} className={`rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${t.name === "Growth" ? "ring-2 ring-[#4f46e5] scale-105" : "hover:scale-105"}`}>
                <CardHeader className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-xl font-bold">{t.name}</CardTitle>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      t.name === "Growth" 
                        ? "bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white" 
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {t.badge}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">{t.price}</span>
                    <span className="text-gray-500 text-lg">{t.period}</span>
                  </div>
                  <p className="text-gray-600 mt-4 leading-relaxed">{t.description}</p>
                </CardHeader>
                <CardContent className="px-8 pb-6">
                  <ul className="space-y-3">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="p-8 pt-0">
                  <Link href={t.href} className="w-full">
                    <Button 
                      className={`w-full py-3 rounded-2xl font-semibold transition-all duration-300 ${
                        t.name === "Growth"
                          ? "bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white shadow-lg hover:shadow-xl"
                          : "bg-white border-2 border-[#4f46e5] text-[#4f46e5] hover:bg-[#4f46e5] hover:text-white"
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

        {/* Bottom Note */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-[#4f46e5]/5 to-[#a855f7]/5 border border-[#4f46e5]/20 rounded-3xl p-8 max-w-4xl mx-auto">
            <div className="w-16 h-16 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-white text-2xl">ℹ️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Important Information</h3>
            <p className="text-gray-700 leading-relaxed">
              <strong>Note:</strong> Pricing shown are examples only. Solo property managers can sign up online soon. For now, start with{" "}
              <Link href="/onboarding" className="text-[#4f46e5] hover:text-[#a855f7] font-semibold underline">Onboarding</Link> or email{" "}
              <a className="text-[#4f46e5] hover:text-[#a855f7] font-semibold underline" href="mailto:hello@blociq.co.uk">hello@blociq.co.uk</a>{" "}
              for current pricing. Larger firms and housing associations should contact us directly for Enterprise quotes.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
