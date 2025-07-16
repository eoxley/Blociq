import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import SupabaseProvider from '@/components/SupabaseProvider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BlocIQ',
  description: 'Your block management assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>{children}</SupabaseProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
