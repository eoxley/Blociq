"use client";

import { useState } from "react";
import { Calendar, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { BlocIQButton } from "@/components/ui/blociq-button";
import { toast } from "sonner";

export default function SyncCalendarButton() {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/cron/sync-calendar");
      const data = await res.json();

      if (res.ok) {
        toast.success(`Calendar synced successfully! ${data.count} events updated.`);
      } else {
        toast.error(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      toast.error("Failed to connect to sync API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <BlocIQButton
        onClick={handleSync}
        disabled={loading}
        size="sm"
        className="flex items-center gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Calendar className="h-4 w-4" />
        )}
        {loading ? "Syncing..." : "Sync Calendar"}
      </BlocIQButton>
    </div>
  );
} 