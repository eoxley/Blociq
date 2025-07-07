// compliance/components/Compliance.tsx

import React from 'react';

const Compliance = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Compliance Tracker</h2>
      
      {/* Example content for the compliance tracker */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-lg">Compliance Item 1</span>
          <span className="px-2 py-1 text-sm bg-green-200 text-green-800 rounded-md">Compliant</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-lg">Compliance Item 2</span>
          <span className="px-2 py-1 text-sm bg-yellow-200 text-yellow-800 rounded-md">Pending</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-lg">Compliance Item 3</span>
          <span className="px-2 py-1 text-sm bg-red-200 text-red-800 rounded-md">Non-Compliant</span>
        </div>
      </div>
    </div>
  );
};

export default Compliance;
