import Link from 'next/link';
import { ArrowRight, CheckCircle, Clock, FileText, Users, Building2, Shield, Calendar } from 'lucide-react';

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            BlocIQ Onboarding
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get your property portfolio set up and running with BlocIQ in just a few simple steps
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Onboarding Steps */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Step 1: Initial Consultation</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Schedule a 30-minute call with our team to understand your portfolio and requirements.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Portfolio assessment
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Compliance requirements review
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Implementation timeline
                </li>
              </ul>
              <div className="mt-6">
                <Link 
                  href="mailto:hello@blociq.co.uk?subject=BlocIQ%20Onboarding%20Consultation"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  Schedule Consultation <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Step 2: Portfolio Setup</h3>
              </div>
              <p className="text-gray-600 mb-4">
                We'll set up your buildings, units, and leaseholders in the system.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Building information upload
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Unit and leaseholder data
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Compliance asset configuration
                </li>
              </ul>
              <div className="mt-6">
                <span className="text-sm text-gray-500">We'll handle this for you</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Step 3: Document Upload</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Upload your existing compliance documents and we'll process them through our AI system.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  EICR certificates
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Fire risk assessments
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Insurance certificates
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Lease agreements
                </li>
              </ul>
              <div className="mt-6">
                <span className="text-sm text-gray-500">Secure document processing</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                  <Shield className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Step 4: Compliance Setup</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Configure compliance tracking, reminders, and reporting for your portfolio.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Compliance asset configuration
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Due date tracking
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Automated reminders
                </li>
              </ul>
              <div className="mt-6">
                <span className="text-sm text-gray-500">Tailored to your needs</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl p-8 shadow-lg mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Implementation Timeline</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Week 1</h3>
                <p className="text-sm text-gray-600">Initial consultation and portfolio assessment</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Week 2</h3>
                <p className="text-sm text-gray-600">System setup and data configuration</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Week 3</h3>
                <p className="text-sm text-gray-600">Document processing and AI training</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Week 4</h3>
                <p className="text-sm text-gray-600">Training and go-live</p>
              </div>
            </div>
          </div>


          {/* CTA */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Join the growing number of property managers who trust BlocIQ to handle their compliance and operational needs.
            </p>
            <div className="flex justify-center">
              <Link 
                href="mailto:hello@blociq.co.uk?subject=BlocIQ%20Onboarding%20Enquiry"
                className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Onboarding <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
