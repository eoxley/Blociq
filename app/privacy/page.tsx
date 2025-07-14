import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
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
              Privacy Policy
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
                BlocIQ Ltd ("we," "our," or "us") is committed to protecting your privacy and ensuring the security of your personal data. This Privacy Policy explains how we collect, use, and protect your information when you use our AI-powered property management platform.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                We are registered in England and Wales under company number 16533839, with our registered office at 3 Cliveden Court, The Broadway, TN3 8DA. For any privacy-related questions, please contact us at <a href="mailto:eleanor.oxley@blociq.co.uk" className="text-teal-600 hover:text-teal-700">eleanor.oxley@blociq.co.uk</a>.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Information We Collect
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We collect the following types of information:
              </p>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Authentication Data</h3>
                  <p className="text-gray-700 text-sm">
                    Email addresses and authentication credentials for account creation and login purposes.
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Property Management Data</h3>
                  <p className="text-gray-700 text-sm">
                    Leasehold documents, compliance certificates, building information, and property management records that you upload to our platform.
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Communication Content</h3>
                  <p className="text-gray-700 text-sm">
                    Emails, notes, messages, and other communications processed through our AI-powered tools.
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Technical Data</h3>
                  <p className="text-gray-700 text-sm">
                    IP addresses, usage logs, device information, and other metadata collected for security and service improvement purposes.
                  </p>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use your information for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Providing and maintaining our AI-powered property management services</li>
                <li>Processing and analyzing property data to generate insights and recommendations</li>
                <li>Improving our AI models and service functionality</li>
                <li>Ensuring platform security and preventing fraud</li>
                <li>Complying with legal obligations and regulatory requirements</li>
                <li>Providing customer support and responding to inquiries</li>
              </ul>
            </section>

            {/* Legal Basis */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Legal Basis for Processing
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Under GDPR, we process your personal data based on the following legal grounds:
              </p>
              
              <div className="space-y-4">
                <div className="border-l-4 border-teal-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Contract Performance</h3>
                  <p className="text-gray-700 text-sm">
                    Processing necessary to provide our services and fulfill our contractual obligations to you.
                  </p>
                </div>
                
                <div className="border-l-4 border-teal-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Legitimate Interest</h3>
                  <p className="text-gray-700 text-sm">
                    Processing for service improvement, security, and fraud prevention, where our interests do not override your fundamental rights.
                  </p>
                </div>
                
                <div className="border-l-4 border-teal-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Legal Obligation</h3>
                  <p className="text-gray-700 text-sm">
                    Processing required to comply with applicable laws and regulatory requirements.
                  </p>
                </div>
                
                <div className="border-l-4 border-teal-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Consent</h3>
                  <p className="text-gray-700 text-sm">
                    Processing based on your explicit consent, which you can withdraw at any time.
                  </p>
                </div>
              </div>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Data Sharing and Third Parties
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not sell your personal data for marketing purposes. We may share your data with:
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  Our Service Providers
                </h3>
                <ul className="text-blue-700 space-y-1 text-sm">
                  <li><strong>Supabase:</strong> Database and authentication services</li>
                  <li><strong>Microsoft (Outlook):</strong> Email integration and processing</li>
                  <li><strong>OpenAI:</strong> AI model processing and content generation</li>
                </ul>
                <p className="text-blue-700 text-sm mt-3">
                  All third-party providers are bound by strict data processing agreements and security requirements.
                </p>
              </div>
              
              <p className="text-gray-700 leading-relaxed">
                We may also disclose your information if required by law or to protect our rights, property, or safety.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Your Rights Under GDPR
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have the following rights regarding your personal data:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Right of Access</h3>
                  <p className="text-gray-700 text-sm">Request a copy of your personal data and information about how we process it.</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Right of Rectification</h3>
                  <p className="text-gray-700 text-sm">Request correction of inaccurate or incomplete personal data.</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Right of Erasure</h3>
                  <p className="text-gray-700 text-sm">Request deletion of your personal data in certain circumstances.</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Right to Restrict Processing</h3>
                  <p className="text-gray-700 text-sm">Request limitation of processing in certain circumstances.</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Right to Data Portability</h3>
                  <p className="text-gray-700 text-sm">Receive your data in a structured, machine-readable format.</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Right to Object</h3>
                  <p className="text-gray-700 text-sm">Object to processing based on legitimate interests.</p>
                </div>
              </div>
              
              <p className="text-gray-700 leading-relaxed mt-4">
                To exercise any of these rights, please contact us at <a href="mailto:eleanor.oxley@blociq.co.uk" className="text-teal-600 hover:text-teal-700">eleanor.oxley@blociq.co.uk</a>.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Data Retention Policy
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-teal-600 font-semibold">•</span>
                  <div>
                    <p className="text-gray-700 text-sm"><strong>Account Data:</strong> Retained while your account is active and for 30 days after deletion</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-teal-600 font-semibold">•</span>
                  <div>
                    <p className="text-gray-700 text-sm"><strong>Property Documents:</strong> Retained for the duration of your account plus 7 years for compliance purposes</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-teal-600 font-semibold">•</span>
                  <div>
                    <p className="text-gray-700 text-sm"><strong>Communication Data:</strong> Retained for 2 years for service improvement and support purposes</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-teal-600 font-semibold">•</span>
                  <div>
                    <p className="text-gray-700 text-sm"><strong>Technical Logs:</strong> Retained for 12 months for security and troubleshooting</p>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 leading-relaxed mt-4">
                We may retain data longer if required by law or for legitimate business purposes.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Cookies and Tracking
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Maintain your login session and preferences</li>
                <li>Analyze website usage and improve our services</li>
                <li>Ensure platform security and prevent fraud</li>
                <li>Provide essential functionality</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                You can control cookie settings through your browser preferences. Note that disabling certain cookies may affect platform functionality.
              </p>
            </section>

            {/* Security */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Data Security
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to protect your personal data:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication measures</li>
                <li>Staff training on data protection</li>
                <li>Incident response procedures</li>
              </ul>
            </section>

            {/* International Transfers */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. International Data Transfers
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Some of our service providers may process data outside the UK/EEA. We ensure such transfers comply with GDPR requirements through appropriate safeguards, including Standard Contractual Clauses and adequacy decisions.
              </p>
            </section>

            {/* Contact and Complaints */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Contact Information and Complaints
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For any questions about this Privacy Policy or to exercise your rights, please contact us:
              </p>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <strong>Email:</strong> <a href="mailto:eleanor.oxley@blociq.co.uk" className="text-teal-600 hover:text-teal-700">eleanor.oxley@blociq.co.uk</a>
                  </p>
                  <p className="text-gray-700">
                    <strong>Address:</strong> BlocIQ Ltd, 3 Cliveden Court, The Broadway, TN3 8DA
                  </p>
                  <p className="text-gray-700">
                    <strong>Company:</strong> BlocIQ Ltd (Company No. 16533839)
                  </p>
                </div>
              </div>
              
              <p className="text-gray-700 leading-relaxed mt-4">
                If you believe we have not addressed your concerns adequately, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" className="text-teal-600 hover:text-teal-700">ico.org.uk</a>.
              </p>
            </section>

            {/* Updates */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                12. Changes to This Policy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by email or through our platform. Continued use of our services after such changes constitutes acceptance of the updated policy.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
} 