export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-xl px-4 space-y-6">
        <h1 className="text-3xl font-bold font-serif">Welcome to BlocIQ</h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Your AI-powered property inbox is ready to take on leaks, complaints, budgets, and all the admin chaos.
        </p>
        <a href="/dashboard/inbox" className="text-blue-600 underline hover:text-blue-800">
          🚀 Open Inbox
        </a>
      </div>
    </main>
  );
}
