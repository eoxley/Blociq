"use client";
import { useState, useEffect } from 'react';
import { Shield, Sparkles, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

type CountRow = { building_id:string; building_name:string; total:number; compliant:number; due_soon:number; overdue:number };
type UpcomingRow = { building_id:string; building_name:string; asset_name:string; category:string; bca_id:string; next_due_date:string; status:string };

export default function CompliancePortfolioPage() {
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [c, u] = await Promise.all([
      fetch("/api/portfolio/compliance/summary").then(r=>r.json()),
      fetch("/api/portfolio/compliance/upcoming").then(r=>r.json())
    ]);
    setCounts(c.data || []); setUpcoming(u.data || []);
  }

  useEffect(() => { setLoading(true); load().finally(()=>setLoading(false)); }, []);

  return (
    <div className="space-y-4">
      {/* Hero Banner - Matching Inbox Page Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Compliance Portfolio
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Live status across all buildings with comprehensive compliance tracking and management.
            </p>
            <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-xl p-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-white/90">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {loading ? 'Loading compliance data...' : `Monitoring ${counts.length} buildings`}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      {/* Summary grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {counts.map(row => (
          <Link 
            key={row.building_id} 
            href={`/buildings/${row.building_id}/compliance`}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="text-sm font-semibold text-neutral-800">{row.building_name}</div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              <Card label="Total" v={row.total} />
              <Card label="Compliant" v={row.compliant} tone="text-emerald-700" />
              <Card label="Due soon" v={row.due_soon} tone="text-amber-800" />
              <Card label="Overdue" v={row.overdue} tone="text-red-700" />
            </div>
          </Link>
        ))}
      </div>

      {/* Upcoming table (90 days) */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Upcoming (90 days)</h2>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Clock className="h-4 w-4" />
            <span>Next 90 days</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Building</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Asset</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Category</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Due Date</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map(row => (
                <tr key={row.bca_id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="py-3 px-4">
                    <Link 
                      href={`/buildings/${row.building_id}/compliance`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {row.building_name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-neutral-800">{row.asset_name}</td>
                  <td className="py-3 px-4 text-neutral-600">{row.category}</td>
                  <td className="py-3 px-4 text-neutral-600">{new Date(row.next_due_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ label, v, tone = "text-neutral-700" }: { label: string; v: number; tone?: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${tone}`}>{v}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
        return { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle };
      case 'due_soon':
        return { color: 'bg-amber-100 text-amber-800', icon: Clock };
      case 'overdue':
        return { color: 'bg-red-100 text-red-800', icon: AlertTriangle };
      default:
        return { color: 'bg-neutral-100 text-neutral-800', icon: Clock };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      {status.replace('_', ' ')}
    </span>
  );
}
