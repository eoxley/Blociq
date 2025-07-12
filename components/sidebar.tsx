'use client'

export default function Sidebar() {
  return (
    <aside className="min-h-screen w-64 bg-[#0F5D5D] text-white flex flex-col py-8 px-6">
      <h1 className="text-2xl font-bold mb-10 font-serif">BlocIQ</h1>
      <nav className="space-y-4">
        <a href="/home" className="block px-4 py-2 rounded-lg text-lg hover:bg-[#1a4d4d]">Home</a>
        <a href="/inbox" className="block px-4 py-2 rounded-lg text-lg hover:bg-[#1a4d4d]">Inbox</a>
        <a href="/buildings" className="block px-4 py-2 rounded-lg text-lg hover:bg-[#1a4d4d]">Buildings</a>
        <a href="/compliance" className="block px-4 py-2 rounded-lg text-lg hover:bg-[#1a4d4d]">Compliance</a>
      </nav>
    </aside>
  )
}
