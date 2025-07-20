import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default function Accessibility() {
  return (
    <LayoutWithSidebar>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-[#0F5D5D] mb-6">Accessibility Statement</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-gray-700 mb-6">
              BlocIQ is committed to ensuring digital accessibility for all users. We are continually improving 
              the user experience and applying relevant accessibility standards where possible.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Our Commitment</h2>
            <p className="text-gray-700 mb-4">
              We believe that digital accessibility is a fundamental right and essential for creating an inclusive 
              platform. Our goal is to make BlocIQ accessible to users with diverse abilities and needs.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Accessibility Standards</h2>
            <p className="text-gray-700 mb-4">
              We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. 
              These guidelines explain how to make web content more accessible for people with disabilities.
            </p>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Accessibility Features</h2>
            
            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Visual Accessibility</h3>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li>High contrast color schemes and clear typography</li>
              <li>Resizable text that can be enlarged up to 200% without loss of functionality</li>
              <li>Clear visual hierarchy and consistent navigation</li>
              <li>Alternative text for images and icons</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Keyboard Navigation</h3>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li>Full keyboard navigation support</li>
              <li>Visible focus indicators for all interactive elements</li>
              <li>Logical tab order throughout the application</li>
              <li>Keyboard shortcuts for common actions</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Screen Reader Support</h3>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li>Semantic HTML structure for better screen reader interpretation</li>
              <li>ARIA labels and descriptions where appropriate</li>
              <li>Clear and descriptive link text</li>
              <li>Proper heading structure and landmarks</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Cognitive Accessibility</h3>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li>Clear and simple language</li>
              <li>Consistent interface design and navigation</li>
              <li>Error messages that are easy to understand</li>
              <li>Logical workflow and user journeys</li>
            </ul>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Known Limitations</h2>
            <p className="text-gray-700 mb-4">
              While we strive for comprehensive accessibility, some areas may have limitations:
            </p>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li>Some third-party integrations may not be fully accessible</li>
              <li>Complex data visualizations may have limited accessibility</li>
              <li>AI-generated content may require manual review for accessibility</li>
            </ul>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Testing and Evaluation</h2>
            <p className="text-gray-700 mb-4">
              We regularly test our platform for accessibility using:
            </p>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li>Automated accessibility testing tools</li>
              <li>Manual testing with screen readers</li>
              <li>Keyboard-only navigation testing</li>
              <li>User feedback from individuals with disabilities</li>
            </ul>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Continuous Improvement</h2>
            <p className="text-gray-700 mb-4">
              We are committed to ongoing improvement of our accessibility features:
            </p>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li>Regular accessibility audits and reviews</li>
              <li>User feedback integration</li>
              <li>Staff training on accessibility best practices</li>
              <li>Monitoring of new accessibility technologies and standards</li>
            </ul>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Feedback and Support</h2>
            <p className="text-gray-700 mb-4">
              We welcome feedback on the accessibility of BlocIQ. If you experience any difficulties or have 
              suggestions for improvement, please contact us:
            </p>
            <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
              <li>Email: <a href="mailto:support@blociq.co.uk" className="text-teal-600 hover:text-teal-700 underline">support@blociq.co.uk</a></li>
              <li>Phone: +44 (0) 20 1234 5678</li>
              <li>Response time: We aim to respond to accessibility feedback within 48 hours</li>
            </ul>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <p className="text-gray-700">
                <strong>Our Promise:</strong> We are committed to making BlocIQ accessible to everyone. 
                Your feedback helps us improve and create a better experience for all users.
              </p>
            </div>

            <h2 className="text-xl font-semibold text-[#0F5D5D] mt-8 mb-4">Compliance Status</h2>
            <p className="text-gray-700 mb-4">
              This accessibility statement was prepared on {new Date().toLocaleDateString('en-GB')}. 
              It was last reviewed and updated on {new Date().toLocaleDateString('en-GB')}.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mt-8">
              <p className="text-sm text-gray-600">
                <strong>Contact Information:</strong> For accessibility support or feedback, please contact{' '}
                <a href="mailto:support@blociq.co.uk" className="text-teal-600 hover:text-teal-700 underline">
                  support@blociq.co.uk
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