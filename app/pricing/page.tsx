import React from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  const tiers = [
    {
      name: "Starter (Trial)",
      price: "£104",
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
      price: "£1,575",
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
      price: "Custom",
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
    { name: "Lease Reader (OCR + AI)", detail: "Extract clauses, dates, parties from scanned or digital leases.", price: "£0.11–£0.26 per page or £52/building/month pack" },
    { name: "Outlook Add-in", detail: "AI reply drafts, summarise, file to building/unit, link emails to records.", price: "£5.25/user/month (min 10)" },
    { name: "Compliance Pro", detail: "Automated reminders, calendar sync, PDF ingestion to compliance items.", price: "£209/building/month" },
    { name: "Custom Integrations", detail: "Qube/MRI/third-party connectors, single sign-on, procurement exports.", price: "POA" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="md:text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">Transparent UK pricing</h1>
          <p className="mt-3 text-slate-600">
            Simple subscription with an optional one-off implementation fee. Start small, scale easily.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <Link href="/onboarding" className="underline">See onboarding</Link>
            <span className="text-slate-400">•</span>
            <a href="#extras" className="underline">Extras & Add-ons</a>
          </div>
        </div>

        {/* Implementation table */}
        <div className="mt-10">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Implementation / Onboarding (one-off)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 text-sm">
                <div className="p-3 border-b sm:border-b-0 sm:border-r">
                  <p className="font-medium">Self-serve</p>
                  <p className="text-slate-600">£0 – you plug in and go</p>
                </div>
                <div className="p-3 border-b sm:border-b-0 sm:border-r">
                  <p className="font-medium">Guided</p>
                  <p className="text-slate-600">From £2,100 – training & data import</p>
                </div>
                <div className="p-3">
                  <p className="font-medium">White-glove</p>
                  <p className="text-slate-600">From £5,250 – integrations & custom setup</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">Pricing excludes VAT. Annual discounts available.</p>
              <div className="mt-4">
                <Link href="/onboarding">
                  <Button className="rounded-xl">
                    View onboarding steps <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription tiers */}
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <Card key={t.name} className={`rounded-2xl ${t.name === "Growth" ? "ring-2 ring-teal-500" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100">{t.badge}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">{t.price}</span>
                  <span className="text-slate-500">{t.period}</span>
                </div>
                <p className="text-sm text-slate-600 mt-2">{t.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={t.href} className="w-full">
                  <Button className="w-full rounded-xl" variant={t.variant}>
                    {t.ctaLabel}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Extras */}
        <section id="extras" className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">Extras & Add-ons</h2>
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {extras.map((x) => (
              <Card key={x.name} className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">{x.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  <p>{x.detail}</p>
                  <p className="mt-2 font-medium">{x.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="mt-12 text-center text-sm text-slate-600">
          <p>
            <strong>Note:</strong> Solo property managers can sign up online soon. For now, start with{" "}
            <Link href="/onboarding" className="underline">Onboarding</Link> or email{" "}
            <a className="underline" href="mailto:hello@blociq.co.uk">hello@blociq.co.uk</a>.
            Larger firms and housing associations should contact us directly for Enterprise pricing.
          </p>
        </div>
      </section>
    </main>
  );
}
