/**
 * Test file demonstrating usage of createComplianceReminder function
 * 
 * This file shows various ways to use the createComplianceReminder function
 * and includes error handling examples.
 */

import { 
  createComplianceReminder, 
  createSingleComplianceReminder,
  updateComplianceReminder,
  deleteComplianceReminder,
  type CreateComplianceReminderParams 
} from './createComplianceReminder';

// Mock access token for testing (replace with real token for actual testing)
const MOCK_ACCESS_TOKEN = 'mock-access-token-for-testing';

// Example 1: Create multiple reminders (90, 60, 30 days)
export async function testCreateMultipleReminders() {
  try {
    const result = await createComplianceReminder({
      buildingName: 'Ashwood Court',
      assetName: 'Electrical Installation Condition Report',
      nextDueDate: '2025-06-15',
      outlookAccessToken: MOCK_ACCESS_TOKEN,
      buildingId: 123,
      complianceAssetId: 'eicr-certificate',
      userId: 'user-123'
    });

    if (result.success) {
      console.log('✅ Multiple reminders test passed:', {
        eventsCreated: result.eventsCreated,
        message: result.message,
        reminderType: result.reminderType
      });
    } else {
      console.error('❌ Multiple reminders test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Multiple reminders test error:', error);
  }
}

// Example 2: Create single reminder (30 days)
export async function testCreateSingleReminder() {
  try {
    const result = await createSingleComplianceReminder({
      buildingName: 'Ashwood Court',
      assetName: 'Fire Safety Assessment',
      nextDueDate: '2025-03-20',
      outlookAccessToken: MOCK_ACCESS_TOKEN,
      buildingId: 123,
      complianceAssetId: 'fire-safety-assessment',
      userId: 'user-123'
    });

    if (result.success) {
      console.log('✅ Single reminder test passed:', {
        eventId: result.eventId,
        message: result.message,
        reminderType: result.reminderType
      });
    } else {
      console.error('❌ Single reminder test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Single reminder test error:', error);
  }
}

// Example 3: Test with different compliance assets
export async function testDifferentAssetTypes() {
  const testAssets = [
    {
      name: 'Gas Safety Certificate',
      dueDate: '2025-05-12',
      assetId: 'gas-safety-certificate'
    },
    {
      name: 'Asbestos Survey Report',
      dueDate: '2025-08-30',
      assetId: 'asbestos-survey'
    },
    {
      name: 'Legionella Risk Assessment',
      dueDate: '2025-04-15',
      assetId: 'legionella-assessment'
    }
  ];

  const results = [];

  for (const asset of testAssets) {
    try {
      const result = await createSingleComplianceReminder({
        buildingName: 'Test Building',
        assetName: asset.name,
        nextDueDate: asset.dueDate,
        outlookAccessToken: MOCK_ACCESS_TOKEN,
        buildingId: 123,
        complianceAssetId: asset.assetId,
        userId: 'user-123'
      });

      results.push({
        assetName: asset.name,
        success: result.success,
        message: result.message,
        eventId: result.eventId
      });
    } catch (error) {
      results.push({
        assetName: asset.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  console.log('Different asset types test results:', results);
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`✅ Different asset types test: ${successCount} successful, ${failureCount} failed`);
}

// Example 4: Test error handling with invalid data
export async function testErrorHandling() {
  const testCases = [
    {
      name: 'Missing building name',
      params: {
        buildingName: '',
        assetName: 'Test Asset',
        nextDueDate: '2025-06-15',
        outlookAccessToken: MOCK_ACCESS_TOKEN
      }
    },
    {
      name: 'Invalid date format',
      params: {
        buildingName: 'Test Building',
        assetName: 'Test Asset',
        nextDueDate: '15/06/2025', // Wrong format
        outlookAccessToken: MOCK_ACCESS_TOKEN
      }
    },
    {
      name: 'Past due date',
      params: {
        buildingName: 'Test Building',
        assetName: 'Test Asset',
        nextDueDate: '2020-01-01', // Past date
        outlookAccessToken: MOCK_ACCESS_TOKEN
      }
    },
    {
      name: 'Missing access token',
      params: {
        buildingName: 'Test Building',
        assetName: 'Test Asset',
        nextDueDate: '2025-06-15',
        outlookAccessToken: ''
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      const result = await createSingleComplianceReminder(testCase.params as CreateComplianceReminderParams);
      
      if (result.success) {
        console.log(`❌ ${testCase.name} should have failed but didn't`);
      } else {
        console.log(`✅ ${testCase.name} correctly failed:`, result.error);
      }
    } catch (error) {
      console.log(`✅ ${testCase.name} correctly threw error:`, error instanceof Error ? error.message : error);
    }
  }
}

// Example 5: Test update functionality
export async function testUpdateReminder() {
  try {
    // First create a reminder
    const createResult = await createSingleComplianceReminder({
      buildingName: 'Test Building',
      assetName: 'Test Asset',
      nextDueDate: '2025-06-15',
      outlookAccessToken: MOCK_ACCESS_TOKEN
    });

    if (createResult.success && createResult.eventId) {
      // Then update it
      const updateResult = await updateComplianceReminder({
        eventId: createResult.eventId,
        buildingName: 'Updated Building',
        assetName: 'Updated Asset',
        nextDueDate: '2025-07-15',
        outlookAccessToken: MOCK_ACCESS_TOKEN
      });

      if (updateResult.success) {
        console.log('✅ Update reminder test passed');
      } else {
        console.error('❌ Update reminder test failed:', updateResult.error);
      }
    } else {
      console.error('❌ Could not create reminder for update test');
    }
  } catch (error) {
    console.error('❌ Update reminder test error:', error);
  }
}

// Example 6: Test delete functionality
export async function testDeleteReminder() {
  try {
    // First create a reminder
    const createResult = await createSingleComplianceReminder({
      buildingName: 'Test Building',
      assetName: 'Test Asset for Deletion',
      nextDueDate: '2025-06-15',
      outlookAccessToken: MOCK_ACCESS_TOKEN
    });

    if (createResult.success && createResult.eventId) {
      // Then delete it
      const deleteResult = await deleteComplianceReminder({
        eventId: createResult.eventId,
        outlookAccessToken: MOCK_ACCESS_TOKEN
      });

      if (deleteResult.success) {
        console.log('✅ Delete reminder test passed');
      } else {
        console.error('❌ Delete reminder test failed:', deleteResult.error);
      }
    } else {
      console.error('❌ Could not create reminder for delete test');
    }
  } catch (error) {
    console.error('❌ Delete reminder test error:', error);
  }
}

// Example 7: Integration with real Outlook token
export async function testWithRealOutlookToken() {
  try {
    // Import the real Outlook auth function
    const { getValidAccessToken } = await import('../outlookAuth');
    
    const accessToken = await getValidAccessToken();
    
    if (!accessToken) {
      console.log('⚠️ No Outlook connection available for real token test');
      return;
    }

    const result = await createSingleComplianceReminder({
      buildingName: 'Real Test Building',
      assetName: 'Real Test Asset',
      nextDueDate: '2025-12-31',
      outlookAccessToken: accessToken,
      buildingId: 123,
      complianceAssetId: 'real-test-asset',
      userId: 'real-user-123'
    });

    if (result.success) {
      console.log('✅ Real Outlook token test passed:', {
        eventId: result.eventId,
        message: result.message
      });
    } else {
      console.error('❌ Real Outlook token test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Real Outlook token test error:', error);
  }
}

// Example 8: Batch processing multiple buildings
export async function testBatchProcessing() {
  const buildings = [
    {
      id: 123,
      name: 'Ashwood Court',
      assets: [
        { name: 'EICR Certificate', dueDate: '2025-06-15' },
        { name: 'Fire Safety Assessment', dueDate: '2025-03-20' }
      ]
    },
    {
      id: 124,
      name: 'Maple Gardens',
      assets: [
        { name: 'Gas Safety Certificate', dueDate: '2025-05-12' },
        { name: 'Asbestos Survey', dueDate: '2025-08-30' }
      ]
    }
  ];

  const results = [];

  for (const building of buildings) {
    for (const asset of building.assets) {
      try {
        const result = await createSingleComplianceReminder({
          buildingName: building.name,
          assetName: asset.name,
          nextDueDate: asset.dueDate,
          outlookAccessToken: MOCK_ACCESS_TOKEN,
          buildingId: building.id,
          complianceAssetId: `${asset.name.toLowerCase().replace(/\s+/g, '-')}`,
          userId: 'user-123'
        });

        results.push({
          building: building.name,
          asset: asset.name,
          success: result.success,
          message: result.message
        });
      } catch (error) {
        results.push({
          building: building.name,
          asset: asset.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  console.log('Batch processing results:', results);
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`✅ Batch processing test: ${successCount} successful, ${failureCount} failed`);
}

// Example 9: Test with future dates validation
export async function testFutureDatesValidation() {
  const testDates = [
    { date: '2025-12-31', description: 'Far future date' },
    { date: '2025-01-15', description: 'Near future date' },
    { date: '2024-12-31', description: 'Past date' },
    { date: '2025-02-29', description: 'Invalid leap year date' }
  ];

  for (const testDate of testDates) {
    try {
      const result = await createSingleComplianceReminder({
        buildingName: 'Test Building',
        assetName: 'Test Asset',
        nextDueDate: testDate.date,
        outlookAccessToken: MOCK_ACCESS_TOKEN
      });

      console.log(`${testDate.description} (${testDate.date}):`, {
        success: result.success,
        message: result.message,
        error: result.error
      });
    } catch (error) {
      console.log(`${testDate.description} (${testDate.date}): Error -`, error instanceof Error ? error.message : error);
    }
  }
}

// Run all tests
export async function runAllTests() {
  console.log('🧪 Starting createComplianceReminder tests...\n');
  
  await testCreateMultipleReminders();
  await testCreateSingleReminder();
  await testDifferentAssetTypes();
  await testErrorHandling();
  await testUpdateReminder();
  await testDeleteReminder();
  await testWithRealOutlookToken();
  await testBatchProcessing();
  await testFutureDatesValidation();
  
  console.log('\n🏁 All tests completed');
}

// Uncomment to run tests
// runAllTests().catch(console.error); 