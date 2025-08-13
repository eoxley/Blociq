"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { summariseBuilding } from "../actions";

export default function SummariseWithAI({ buildingId }: { buildingId: string }) {
  const [open, setOpen] = useState(false);
  const [md, setMd] = useState<string>("");
  const [pending, start] = useTransition();

  return (
    <>
      <Button onClick={() => {
        setOpen(true);
        start(async () => {
          try {
            const res = await summariseBuilding(buildingId);
            setMd(res.markdown);
          } catch (e:any) {
            setMd(`**Failed to summarise**: ${e.message}`);
          }
        });
      }}>
        Summarise with AI
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 w-[min(860px,95vw)] shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">AI Summary</h3>
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            </div>
            <div className="prose max-w-none">
              {pending ? <p>Thinking…</p> : <div dangerouslySetInnerHTML={{ __html: mdToHtml(md) }} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Very lightweight markdown renderer; if you have a Markdown component, use that instead.
function mdToHtml(md: string) {
  return md
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/^\- (.*$)/gim, "<li>$1</li>")
    .replace(/\n/g, "<br/>");
}
