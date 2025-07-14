import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-2 text-[#0F5D5D] hover:text-teal-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Terms of Service
            </h1>
            <p className="text-gray-600">
              Last updated: {new Date().toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>

          <div className="prose prose-gray max-w-none space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms of Service ("Terms") govern your use of BlocIQ, an AI-powered property management platform operated by BlocIQ Ltd ("we," "our," or "us"). By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access our service.
              </p>
            </section>

            {/* Acceptance of Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Acceptance of Terms
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By using BlocIQ, you confirm that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>You are at least 18 years old and have the legal capacity to enter into these Terms</li>
                <li>You have the authority to bind your organisation to these Terms if using BlocIQ on behalf of a company</li>
                <li>You will use the service in compliance with all applicable laws and regulations</li>
                <li>You will provide accurate and complete information when creating your account</li>
              </ul>
            </section>

            {/* Service Description */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Service Description
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                BlocIQ provides AI-powered property management tools including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>AI-assisted email management and response generation</li>
                <li>Compliance tracking and document management</li>
                <li>Portfolio calendar and event management</li>
                <li>Property data analysis and insights</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                We reserve the right to modify, suspend, or discontinue any part of our service at any time with reasonable notice.
              </p>
            </section>

            {/* User Obligations */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. User Obligations
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Maintain the security of your account credentials and not share them with others</li>
                <li>Use the service only for lawful purposes and in compliance with UK property management regulations</li>
                <li>Not attempt to reverse engineer, decompile, or otherwise attempt to extract source code from our service</li>
                <li>Not use the service to transmit malicious code, spam, or other harmful content</li>
                <li>Comply with all applicable data protection laws, including GDPR</li>
                <li>Ensure all data uploaded to our platform is accurate and legally obtained</li>
              </ul>
            </section>

            {/* AI Disclaimer */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. AI Disclaimer and Limitations
              </h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Important AI Disclaimer
                </h3>
                <p className="text-yellow-700 leading-relaxed">
                  BlocIQ uses artificial intelligence to assist with property management tasks. While our AI is trained on property management best practices and UK regulations, it is not a substitute for professional legal, financial, or property management advice.
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                You acknowledge and agree that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>AI-generated content should be reviewed by qualified professionals before implementation</li>
                <li>AI responses may not always be accurate or complete</li>
                <li>You remain responsible for all decisions made based on AI-generated content</li>
                <li>AI features are provided "as is" without warranty of accuracy or completeness</li>
                <li>We are not liable for any losses arising from reliance on AI-generated content</li>
              </ul>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Intellectual Property and Content Rights
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Our Rights:</strong> BlocIQ and its original content, features, and functionality are owned by BlocIQ Ltd and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Your Rights:</strong> You retain ownership of any content you upload to our platform. By using our service, you grant us a limited, non-exclusive license to process and store your data for the purpose of providing our services.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>AI-Generated Content:</strong> AI-generated content created using our platform is provided for your use, but we retain the right to use anonymised data to improve our AI models.
              </p>
            </section>

            {/* Privacy and Data Protection */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Privacy and Data Protection
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
              </p>
              <p className="text-gray-700 leading-relaxed">
                We are committed to GDPR compliance and will process your data in accordance with UK data protection laws. You have the right to access, rectify, and delete your personal data as outlined in our Privacy Policy.
              </p>
            </section>

            {/* Liability */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Limitation of Liability
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To the maximum extent permitted by law, BlocIQ Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Loss of profits, data, or business opportunities</li>
                <li>Damages arising from use of AI-generated content</li>
                <li>Service interruptions or technical issues</li>
                <li>Third-party actions or content</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                Our total liability to you for any claims arising from these Terms shall not exceed the amount you paid for our service in the 12 months preceding the claim.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Termination
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may terminate your account at any time by contacting us. We may terminate or suspend your access immediately, without prior notice, for any reason, including breach of these Terms.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Upon termination, your right to use the service will cease immediately. We will retain your data for 30 days following termination, after which it will be permanently deleted unless required by law to retain it longer.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Governing Law and Jurisdiction
              </h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Contact Information
              </h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">
                  <strong>BlocIQ Ltd</strong><br />
                  Registered in England & Wales: Company No. 16533839<br />
                  Registered Office: 3 Cliveden Court, The Broadway, TN3 8DA<br />
                  Email: <a href="mailto:eleanor.oxley@blociq.co.uk" className="text-teal-600 hover:text-teal-700">eleanor.oxley@blociq.co.uk</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
} 