// components/DashboardLayout.tsx

import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Optional nav/sidebar/header here */}
      {children}
    </div>
  );
}
