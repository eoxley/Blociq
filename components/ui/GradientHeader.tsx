export default function GradientHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white px-5 py-6 shadow-sm">
      <div className="text-xl font-semibold">{title}</div>
      {subtitle ? <div className="text-sm opacity-90">{subtitle}</div> : null}
    </div>
  );
}
