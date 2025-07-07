import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-soft text-charcoal flex flex-col items-center justify-center text-center px-6">
      <div className="space-y-6 max-w-xl">
        <h1 className="text-4xl font-brand font-bold">Welcome to BlocIQ</h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Your AI-powered property inbox is ready to take on leaks, complaints, budgets, and all the admin chaos.
        </p>
        <Link
          href="/dashboard/inbox"
          className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-dark transition"
        >
          🚀 Open Inbox
        </Link>
      </div>
    </div>
  )
}
