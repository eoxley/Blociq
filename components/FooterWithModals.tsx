'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import BlocIQLogo from '@/components/BlocIQLogo'

type LegalPage = 'privacy' | 'terms' | 'cookies' | 'accessibility' | null

export default function FooterWithModals() {
  const [activePage, setActivePage] = useState<LegalPage>(null)

  const legalContent = {
    privacy: {
      title: 'Privacy Policy',
      content: `Last updated: December 2024

BlocIQ Ltd ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our property management platform.

Information We Collect
We collect information that you provide directly to us, including:
- Account information (name, email, company details)
- Property and building data
- Communication records
- Document uploads
- Usage data and analytics

How We Use Your Information
- To provide and maintain our services
- To notify you about changes to our service
- To provide customer support
- To gather analysis to improve our service
- To detect and prevent fraud

Data Security
We implement appropriate security measures to protect your personal information. All data is stored on UK servers and is GDPR compliant.

Your Rights
Under GDPR, you have the right to:
- Access your personal data
- Rectify inaccurate data
- Request deletion of your data
- Object to processing of your data
- Data portability

Contact Us
If you have questions about this Privacy Policy, please contact us at:
Email: support@blociq.co.uk

BlocIQ Ltd
Company No. 16533839
ICO Registration: ZB995810`
    },
    terms: {
      title: 'Terms of Service',
      content: `Last updated: December 2024

Agreement to Terms
By accessing or using BlocIQ, you agree to be bound by these Terms of Service.

Use License
BlocIQ grants you a limited, non-exclusive, non-transferable license to use our platform for property management purposes.

User Responsibilities
You agree to:
- Provide accurate information
- Maintain the security of your account
- Comply with all applicable laws
- Not misuse the service

Intellectual Property
All content, features, and functionality are owned by BlocIQ Ltd and are protected by UK and international copyright, trademark, and other intellectual property laws.

Limitation of Liability
BlocIQ shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.

Professional Indemnity Insurance
BlocIQ Ltd maintains Professional Indemnity Insurance through Hiscox with £1,000,000 cover (Policy PL-PSC10003772018/00).

Termination
We may terminate or suspend your account at our sole discretion, without prior notice, for conduct that we believe violates these Terms.

Governing Law
These Terms shall be governed by the laws of England and Wales.

Contact Us
For questions about these Terms, please contact:
Email: support@blociq.co.uk

BlocIQ Ltd
Company No. 16533839
Trademark No: UK00004267693`
    },
    cookies: {
      title: 'Cookie Policy',
      content: `Last updated: December 2024

What Are Cookies
Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience.

How We Use Cookies
Essential Cookies
Required for the platform to function, including:
- Authentication and security
- Session management
- User preferences

Analytics Cookies
Help us understand how users interact with our platform:
- Page views and navigation patterns
- Feature usage statistics
- Performance monitoring

Your Cookie Choices
You can control cookies through your browser settings. However, disabling certain cookies may limit your ability to use some features of BlocIQ.

Third-Party Cookies
We may use third-party services that set their own cookies:
- Supabase (authentication and database)
- Analytics providers
- Support services

Updates to This Policy
We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new policy on this page.

Contact Us
If you have questions about our use of cookies, please contact:
Email: support@blociq.co.uk

BlocIQ Ltd
Company No. 16533839
ICO Registration: ZB995810`
    },
    accessibility: {
      title: 'Accessibility Statement',
      content: `Last updated: December 2024

Our Commitment
BlocIQ is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards.

Measures to Support Accessibility
BlocIQ takes the following measures to ensure accessibility:
- Include accessibility as part of our mission statement
- Integrate accessibility into our procurement practices
- Provide continual accessibility training for our staff
- Assign clear accessibility goals and responsibilities

Conformance Status
We aim to conform to Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.

Technical Specifications
BlocIQ relies on the following technologies to work with your web browser:
- HTML5
- CSS3
- JavaScript
- ARIA (Accessible Rich Internet Applications)

Feedback
We welcome your feedback on the accessibility of BlocIQ. Please let us know if you encounter accessibility barriers:

Email: support@blociq.co.uk

We aim to respond to accessibility feedback within 5 business days.

Assessment Approach
BlocIQ assessed the accessibility of our platform by:
- Self-evaluation
- User testing with people with disabilities
- Ongoing monitoring and updates

Known Limitations
Despite our efforts, some limitations may exist:
- Certain PDF documents may not be fully accessible
- Third-party integrations may have their own accessibility limitations

We are working to address these limitations in future updates.

Contact Us
For accessibility support or concerns:
Email: support@blociq.co.uk

BlocIQ Ltd
Company No. 16533839`
    }
  }

  const LegalModal = ({ page }: { page: LegalPage }) => {
    if (!page) return null
    const content = legalContent[page]

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
            <button
              onClick={() => setActivePage(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose prose-sm max-w-none">
              {content.content.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-gray-700 whitespace-pre-wrap">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
            <button
              onClick={() => setActivePage(null)}
              className="px-6 py-2 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white rounded-lg font-medium hover:brightness-110 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <footer className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-lg flex items-center justify-center mr-3">
                  <BlocIQLogo className="text-white" size={16} />
                </div>
                <span className="text-xl font-bold">BlocIQ</span>
              </div>
              <p className="text-gray-400 mb-4">
                The operating system for block management.
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <p><strong>BlocIQ Ltd</strong> — Company No. 16533839</p>
                <p><strong>ICO Registration:</strong> ZB995810</p>
                <p><strong>Trademark No:</strong> UK00004267693</p>
                <p><strong>Professional Indemnity Insurance:</strong> Hiscox, £1,000,000 cover, Policy PL-PSC10003772018/00</p>
                <p>GDPR compliant, UK servers</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Log In</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button onClick={() => setActivePage('privacy')} className="hover:text-white transition-colors">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => setActivePage('terms')} className="hover:text-white transition-colors">
                    Terms
                  </button>
                </li>
                <li>
                  <button onClick={() => setActivePage('cookies')} className="hover:text-white transition-colors">
                    Cookies
                  </button>
                </li>
                <li>
                  <button onClick={() => setActivePage('accessibility')} className="hover:text-white transition-colors">
                    Accessibility
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#book-demo" className="hover:text-white transition-colors">Book a Demo</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><a href="mailto:support@blociq.co.uk" className="hover:text-white transition-colors">support@blociq.co.uk</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 BlocIQ Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <LegalModal page={activePage} />
    </>
  )
}