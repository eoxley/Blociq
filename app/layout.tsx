import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import SupabaseProvider from '@/components/SupabaseProvider';
import { BlocIQProvider } from '@/components/BlocIQContext';
import ConditionalFloatingButtons from '@/components/ConditionalFloatingButtons';
import GlobalNavigation from '@/components/GlobalNavigation';
import Footer from '@/components/Footer';
import { Toaster } from 'sonner';

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
      <body className={`${inter.className} bg-background`}>
        <BlocIQProvider>
          <SupabaseProvider>
            <div className="min-h-screen flex flex-col">
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <GlobalNavigation />
          </SupabaseProvider>
          <ConditionalFloatingButtons />
          <Toaster position="top-right" />
        </BlocIQProvider>
      </body>
    </html>
  );
}
