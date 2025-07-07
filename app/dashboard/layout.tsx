// File: /app/dashboard/layout.tsx

import { Inter } from "next/font/google"
import Link from "next/link"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "BlocIQ Dashboard",
  description: "AI-powered inbox for property managers"
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-soft text-charcoal font-brand">
      <header className="bg-primary text-white px-6 py-4 shadow-soft flex justify-between items-center">
        <div className="text-xl font-semibold">BlocIQ</div>
        <nav className="space-x-4">
          <Link href="/dashboard/inbox" className="hover:underline">Inbox</Link>
          <Link href="/dashboard/drafts" className="hover:underline">Drafts</Link>
          <Link href="/dashboard/compliance" className="hover:underline">Compliance</Link>
        </nav>
      </header>

      <main className="p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>

      <Toaster position="top-right" richColors />
    </div>
  )
}
