// app/dashboard/mail-templates/page.tsx

import DashboardLayout from '../../../components/DashboardLayout';

export default function MailTemplatesPage() {
  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Mail Templates</h1>
        <p>This page lists all existing mail templates.</p>
      </div>
    </DashboardLayout>
  );
}
