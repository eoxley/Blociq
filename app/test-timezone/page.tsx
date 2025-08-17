'use client';

import { formatToUKTime, formatEventDateUK, testTimezoneConversion } from '@/utils/date';

export default function TestTimezonePage() {
  // Test the timezone conversion
  const testResult = testTimezoneConversion();
  
  // Test various date formats
  const testDates = [
    '2025-08-22T09:00:00Z', // UTC time
    '2025-08-22T09:00:00', // No timezone (assumed UTC)
    '2025-12-22T09:00:00Z', // Winter time (GMT)
    '2025-08-22', // Date only
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Timezone Conversion Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
          <div className="space-y-2">
            <p><strong>UTC Time:</strong> {testResult.utcTime}</p>
            <p><strong>UK Time:</strong> {testResult.ukTime}</p>
            <p><strong>Expected:</strong> {testResult.expected}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Various Date Formats</h2>
          <div className="space-y-4">
            {testDates.map((date, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <p><strong>Input:</strong> {date}</p>
                <p><strong>UK Time:</strong> {formatToUKTime(date)}</p>
                <p><strong>Event Date Format:</strong> {JSON.stringify(formatEventDateUK(date))}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Expected Behavior</h2>
          <ul className="space-y-2 text-blue-800">
            <li>• UTC times should be converted to UK timezone (GMT+1 during BST, GMT during winter)</li>
            <li>• Times without timezone should be assumed UTC and converted</li>
            <li>• Date-only strings should display as dates only</li>
            <li>• All times should show in 24-hour format</li>
            <li>• Format should be "Fri, 22 Aug 2025 at 09:00" for times</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
