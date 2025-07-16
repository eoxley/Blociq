import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import SupabaseProvider from '@/components/SupabaseProvider';
import { BlocIQProvider } from '@/components/BlocIQContext';
import GlobalAskBlocIQ from '@/components/GlobalAskBlocIQ';
import { Toaster } from 'sonner';
import GlobalDocumentUploader from '@/components/GlobalDocumentUploader';

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
      <body className={`${inter.className} bg-background`}>
        <BlocIQProvider>
          <SupabaseProvider>{children}</SupabaseProvider>
          <GlobalAskBlocIQ />
          <GlobalDocumentUploader />
          <Toaster position="top-right" />
        </BlocIQProvider>
      </body>
    </html>
  );
}
