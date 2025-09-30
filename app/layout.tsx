import './globals.css';
import type { Metadata } from 'next';
import SupabaseProvider from '@/components/SupabaseProvider';
import { BlocIQProvider } from '@/components/BlocIQContext';
import ReactQueryProvider from '@/components/ReactQueryProvider';
import Footer from '@/components/Footer';
import PublicAskBlocIQWidget from '@/components/PublicAskBlocIQWidget';
import { Toaster } from 'sonner';

// Force dynamic rendering for the entire app to prevent static generation issues
export const dynamic = 'force-dynamic';


export const metadata: Metadata = {
  title: 'Blociq - Property Management Platform',
  description: 'Modern property management platform for managing buildings, units, and leaseholders.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased font-sans">
        <ReactQueryProvider>
          <BlocIQProvider>
            <SupabaseProvider>
              <div className="min-h-screen flex flex-col">
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
              {/* Public Ask BlocIQ Widget - only appears on landing page for unauthenticated users */}
              <PublicAskBlocIQWidget />
            </SupabaseProvider>
          </BlocIQProvider>
        </ReactQueryProvider>
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#333333',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            },
          }}
        />
      </body>
    </html>
  );
}
