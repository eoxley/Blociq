// app/components/DashboardLayout.tsx

import React from 'react';
import { ReactNode } from 'react';

// Define the props for DashboardLayout to accept children (other components or page content)
interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="dashboard-layout">
      {/* Header Section */}
      <header className="dashboard-header">
        <nav>

        </nav>
      </header>

      {/* Main Content Section (renders the children passed to this layout) */}
      <main className="dashboard-main-content">
        {children}
      </main>

      {/* Footer Section */}
      <footer className="dashboard-footer">
        <p>&copy; 2025 Blociq. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default DashboardLayout;
