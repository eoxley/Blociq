import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default function PrivacyPolicy() {
  return (
    <LayoutWithSidebar>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-[#0F5D5D] mb-6">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-gray-700 mb-6">
              BlocIQ Ltd ("we", "our" or "us") is committed to protecting your privacy. This policy outlines how we collect, use, and store your data when using the BlocIQ platform.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Data Collection</h2>
            <p className="text-gray-700 mb-4">
              We collect personal data including email, building records, uploaded documents, and communication logs for property management purposes.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Third-Party Processors</h2>
            <p className="text-gray-700 mb-4">
              We use third-party processors such as Supabase, Microsoft Outlook, and OpenAI, all of whom are GDPR-compliant.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Data Protection</h2>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li>Your data will not be sold or shared outside the platform without your consent.</li>
              <li>All data is encrypted in transit and at rest using industry-standard protocols.</li>
              <li>We implement appropriate security measures to protect against unauthorized access.</li>
              <li>Regular security audits are conducted to ensure data protection standards.</li>
            </ul>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Your Rights</h2>
            <p className="text-gray-700 mb-4">
              You have the right to request access, correction, or deletion of your data at any time by contacting{' '}
              <a href="mailto:privacy@blociq.co.uk" className="text-teal-600 hover:text-teal-700 underline">
                privacy@blociq.co.uk
              </a>
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your data for as long as necessary to provide our services and comply with legal obligations. 
              You may request deletion of your account and associated data at any time.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Updates to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this privacy policy from time to time. We will notify you of any material changes via email 
              or through the platform.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mt-8">
              <p className="text-sm text-gray-600">
                <strong>By using BlocIQ, you agree to the terms of this policy.</strong> If you have any questions about 
                this privacy policy, please contact us at{' '}
                <a href="mailto:privacy@blociq.co.uk" className="text-teal-600 hover:text-teal-700 underline">
                  privacy@blociq.co.uk
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