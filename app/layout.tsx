import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import SupabaseProvider from '@/components/SupabaseProvider';
import { BlocIQProvider } from '@/components/BlocIQContext';
import Footer from '@/components/Footer';
import { Toaster } from 'sonner';
import AskAiFabWrapper from '@/components/AskAiFabWrapper'

const inter = Inter({ subsets: ['latin'] });

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
      <body className={`${inter.className} bg-[#FAFAFA] antialiased`}>
        <BlocIQProvider>
          <SupabaseProvider>
            <div className="min-h-screen flex flex-col">
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <AskAiFabWrapper href="/ai-assistant" />
          </SupabaseProvider>
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
        </BlocIQProvider>
      </body>
    </html>
  );
}
