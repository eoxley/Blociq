export function StageBadge({ stage }: { stage: string }) {
  const tone = /complete/.test(stage) ? "bg-emerald-100 text-emerald-800" :
               /progress/.test(stage) ? "bg-blue-100 text-blue-800" :
               /tender/.test(stage) ? "bg-amber-100 text-amber-800" :
               /s20/.test(stage) ? "bg-fuchsia-100 text-fuchsia-800" :
               /hold/.test(stage) ? "bg-neutral-200 text-neutral-700" : "bg-neutral-100 text-neutral-700";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{stage.replace(/_/g," ")}</span>;
}
