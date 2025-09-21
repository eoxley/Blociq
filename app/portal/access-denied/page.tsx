import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function PortalAccessDenied() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You do not have permission to access this leaseholder portal.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow px-6 py-8">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Possible reasons:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• The lease ID is invalid or doesn't exist</li>
                <li>• You don't have access to this building</li>
                <li>• Your access permissions have been revoked</li>
                <li>• The lease has been deleted or archived</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What you can do:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Contact your building manager</li>
                <li>• Verify the correct portal URL</li>
                <li>• Check if you're signed in with the correct account</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href="/dashboard"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 text-center"
            >
              Go to Dashboard
            </a>
            <a
              href="/auth/sign-in"
              className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 text-center"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}