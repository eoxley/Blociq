// Dashboard layout with scroll on main content only

import DashboardSidebar from "@/components/DashboardSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6">
        {children}
      </main>
    </div>
  );
} 