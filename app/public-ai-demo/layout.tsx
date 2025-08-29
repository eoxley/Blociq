import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BlocIQ AI Demo - Property Management Assistant',
  description: 'Try BlocIQ AI assistant for free. Get expert property management advice, UK compliance guidance, and leaseholder communication help.',
  keywords: 'property management, AI assistant, UK compliance, leaseholder relations, building management',
}

export default function PublicAIDemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}