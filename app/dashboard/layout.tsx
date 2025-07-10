import { ReactNode } from 'react';
import DashboardNavbar from '@/components/DashboardNavbar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNavbar />
      <main className="flex-grow p-6">{children}</main>
    </div>
  );
}
