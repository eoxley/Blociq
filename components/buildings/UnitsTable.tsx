"use client";
import { useEffect, useState } from "react";
import TagChip from "@/components/ui/TagChip";
import { displayUnit, fmtPct, safe } from "@/components/buildings/format";
import { getUnitsLeaseholders, UnitLeaseholderRow } from "@/lib/queries/getUnitsLeaseholders";

export default function UnitsTable({ buildingId }: { buildingId: string }) {
  const [rows, setRows] = useState<UnitLeaseholderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getUnitsLeaseholders(buildingId);
        if (alive) setRows(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [buildingId]);

  if (loading) return <div className="text-sm text-neutral-500">Loading units…</div>;

  return (
    <div className="overflow-auto rounded-xl border border-neutral-200">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-4 py-2 text-left">Unit</th>
            <th className="px-4 py-2 text-left">Leaseholder</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Apportionment</th>
            <th className="px-4 py-2 text-left">Tags</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((r) => (
            <tr key={r.unit_id} className="hover:bg-neutral-50/60">
              <td className="px-4 py-2">{displayUnit(r.unit_label, r.unit_number)}</td>
              <td className="px-4 py-2">{safe(r.leaseholder_name)}</td>
              <td className="px-4 py-2">{safe(r.leaseholder_email)}</td>
              <td className="px-4 py-2">{fmtPct(r.apportionment_percent)}</td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {r.is_director ? <TagChip label={r.director_role || "Director"} /> : null}
                </div>
              </td>
              <td className="px-4 py-2">
                {/* keep your existing action */}
                <a className="text-blue-600 hover:underline" href={`#log-call-${r.unit_id}`}>Log call</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
