import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default function CookiePolicy() {
  return (
    <LayoutWithSidebar>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-[#0F5D5D] mb-6">Cookie Policy</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-gray-700 mb-6">
              We use cookies to improve your experience on BlocIQ. This policy explains what cookies we use and how you can control them.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">What Are Cookies?</h2>
            <p className="text-gray-700 mb-4">
              Cookies are small text files that are stored on your device when you visit our website. They help us provide 
              you with a better experience and understand how you use our platform.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Types of Cookies We Use</h2>
            
            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Essential Cookies</h3>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li><strong>Authentication cookies</strong> - Keep you signed in securely</li>
              <li><strong>Session cookies</strong> - Maintain your session across page visits</li>
              <li><strong>Security cookies</strong> - Protect against unauthorized access</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Functional Cookies</h3>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li><strong>Form validation cookies</strong> - Remember form data and preferences</li>
              <li><strong>User preference cookies</strong> - Store your settings and preferences</li>
              <li><strong>Language cookies</strong> - Remember your language choice</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Analytics Cookies</h3>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li><strong>Usage analytics</strong> - Help us understand how the platform is used</li>
              <li><strong>Performance monitoring</strong> - Identify and fix technical issues</li>
              <li><strong>Feature optimization</strong> - Improve user experience based on usage patterns</li>
            </ul>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Third-Party Cookies</h2>
            <p className="text-gray-700 mb-4">
              We may use third-party services that set their own cookies:
            </p>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li><strong>Supabase</strong> - Database and authentication services</li>
              <li><strong>Microsoft Outlook</strong> - Email integration services</li>
              <li><strong>OpenAI</strong> - AI processing services</li>
              <li><strong>Vercel</strong> - Hosting and analytics services</li>
            </ul>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Managing Cookies</h2>
            <p className="text-gray-700 mb-4">
              You can control and manage cookies in several ways:
            </p>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li><strong>Browser settings</strong> - Most browsers allow you to disable or delete cookies</li>
              <li><strong>Cookie consent</strong> - We will ask for your consent before setting non-essential cookies</li>
              <li><strong>Opt-out tools</strong> - Use browser extensions or tools to manage cookie preferences</li>
            </ul>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <p className="text-gray-700">
                <strong>Note:</strong> Disabling certain cookies may affect the functionality of BlocIQ. 
                Essential cookies cannot be disabled as they are necessary for the platform to work properly.
              </p>
            </div>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Cookie Duration</h2>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li><strong>Session cookies</strong> - Deleted when you close your browser</li>
              <li><strong>Persistent cookies</strong> - Remain on your device for a set period (usually 30 days to 1 year)</li>
              <li><strong>Authentication cookies</strong> - Typically last for 30 days or until you log out</li>
            </ul>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Updates to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this cookie policy from time to time. We will notify you of any material changes via email 
              or through the platform.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mt-8">
              <p className="text-sm text-gray-600">
                <strong>By using BlocIQ, you consent to our use of cookies as described in this policy.</strong> 
                If you have any questions about our use of cookies, please contact us at{' '}
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