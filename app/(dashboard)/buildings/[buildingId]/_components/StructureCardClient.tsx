"use client";

import useSWR from "swr";
import { getJSON } from "@/lib/fetcher";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Props = { buildingId: string };

export default function StructureCardClient({ buildingId }: Props) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/buildings/${buildingId}/structure`,
    getJSON
  );

  if (isLoading) return <Card className="p-6">Loading structure…</Card>;

  if (error) {
    return (
      <Card className="p-6 text-center">
        <div className="text-red-600 font-medium mb-2">Couldn't load building structure</div>
        <Button variant="default" onClick={() => mutate()} className="mt-2">Try Again</Button>
      </Card>
    );
  }

  const s = data?.building;
  if (!s || (Array.isArray(s) && s.length === 0)) {
    return (
      <Card className="p-6">
        <div className="mb-3">No structure set yet.</div>
        <Link href={`/buildings/${buildingId}/structure`}>
          <Button>Start Structure Setup</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-3">Building Structure</h3>
      {/* Render a few key fields; tweak to match your API */}
      <div className="grid grid-cols-2 gap-3">
        <div><span className="text-sm text-muted-foreground">Structure Type</span><div className="font-medium">{s.structure_type ?? "—"}</div></div>
        <div><span className="text-sm text-muted-foreground">Status</span><div className="font-medium">{s.status ?? "—"}</div></div>
        <div><span className="text-sm text-muted-foreground">Client</span><div className="font-medium">{data?.client?.name ?? "—"}</div></div>
        <div><span className="text-sm text-muted-foreground">RMC Directors</span><div className="font-medium">{data?.rmc_directors?.length ?? 0}</div></div>
      </div>
    </Card>
  );
}
