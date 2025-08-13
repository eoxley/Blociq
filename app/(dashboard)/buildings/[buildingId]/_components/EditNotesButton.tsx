"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateBuildingNotes } from "../actions";
import { toast } from "sonner";

export default function EditNotesButton({ buildingId, initial }: { buildingId: string; initial?: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initial ?? "");
  const [pending, start] = useTransition();

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>Edit Notes</Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 w-[min(680px,95vw)] shadow-xl">
            <h3 className="text-lg font-semibold mb-3">Edit Notes</h3>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[180px]" />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                disabled={pending}
                onClick={() => start(async () => {
                  try {
                    await updateBuildingNotes(buildingId, notes);
                    toast.success("Notes updated successfully");
                    setOpen(false);
                  } catch (e: any) {
                    toast.error(`Failed to update notes: ${e.message}`);
                  }
                })}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
