import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default function TermsOfUse() {
  return (
    <LayoutWithSidebar>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-[#0F5D5D] mb-6">Terms of Use</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-gray-700 mb-6">
              Welcome to BlocIQ. By using this platform, you agree to the following terms and conditions.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">1. License and Use</h2>
            <p className="text-gray-700 mb-4">
              BlocIQ grants you a limited, non-transferable licence to use the software for property management purposes. 
              This licence is personal to you and may not be assigned or sublicensed.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">2. User Responsibilities</h2>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li>You are responsible for ensuring all data entered is accurate and lawful.</li>
              <li>You must maintain the security of your account credentials.</li>
              <li>You agree not to use the platform for any illegal or unauthorized purpose.</li>
              <li>You are responsible for compliance with all applicable laws and regulations.</li>
            </ul>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">3. AI-Generated Content</h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-gray-700">
                <strong>Important:</strong> AI-generated content is for guidance only and must not be relied upon as legal 
                or professional advice. Always consult with qualified professionals for legal, financial, or technical matters.
              </p>
            </div>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">4. Data and Privacy</h2>
            <p className="text-gray-700 mb-4">
              Your use of BlocIQ is also governed by our Privacy Policy, which is incorporated into these terms by reference.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">5. Limitations of Liability</h2>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li>BlocIQ is not liable for any loss resulting from reliance on AI-generated content.</li>
              <li>We are not responsible for missed compliance actions or deadlines.</li>
              <li>We do not guarantee the accuracy of third-party integrations.</li>
              <li>Our liability is limited to the amount paid for the service in the 12 months preceding any claim.</li>
            </ul>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">6. Intellectual Property</h2>
            <p className="text-gray-700 mb-4">
              The BlocIQ platform, including its design, code, and content, is protected by intellectual property rights. 
              You retain ownership of your data but grant us a licence to process it for service provision.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">7. Termination</h2>
            <p className="text-gray-700 mb-4">
              We may terminate or suspend your access to BlocIQ at any time for violation of these terms. 
              You may cancel your account at any time through the platform settings.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">8. Governing Law</h2>
            <p className="text-gray-700 mb-4">
              These terms are governed by English law. Any disputes will be subject to the exclusive jurisdiction 
              of the courts of England and Wales.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We may update these terms from time to time. We will notify you of any material changes via email 
              or through the platform. Continued use constitutes acceptance of updated terms.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mt-8">
              <p className="text-sm text-gray-600">
                <strong>By using BlocIQ, you acknowledge that you have read, understood, and agree to these terms.</strong> 
                If you have any questions about these terms, please contact us at{' '}
                <a href="mailto:legal@blociq.co.uk" className="text-teal-600 hover:text-teal-700 underline">
                  legal@blociq.co.uk
                </a>
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  )
} 