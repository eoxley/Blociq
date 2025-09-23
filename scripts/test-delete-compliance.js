// Test script for compliance deletion functionality
// Run with: node scripts/test-delete-compliance.js

const buildingId = "2beeec1d-a94e-4058-b881-213d74cc6830"

async function testDeleteComplianceAnalysis() {
  try {
    console.log('🗑️ Testing compliance analysis deletion...')

    const response = await fetch('http://localhost:3000/api/compliance/delete-analysis', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        buildingId: buildingId,
        deleteType: 'actions_only' // Test deleting just action items
      })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ Success:', result)
      console.log(`🎯 Deleted items:`, result.deleted_items)
    } else {
      console.error('❌ Error:', result)
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

async function testFullDelete() {
  try {
    console.log('🗑️ Testing full compliance deletion...')

    const response = await fetch('http://localhost:3000/api/compliance/delete-analysis', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        buildingId: buildingId,
        deleteType: 'analysis_only'
      })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ Success:', result)
      console.log(`🎯 Deleted items:`, result.deleted_items)
    } else {
      console.error('❌ Error:', result)
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

// Auto-run if this file is executed directly
if (typeof window === 'undefined') {
  console.log('Testing compliance deletion functionality...')

  // Run tests
  testDeleteComplianceAnalysis()
    .then(() => {
      console.log('\n---\n')
      return testFullDelete()
    })
}

module.exports = { testDeleteComplianceAnalysis, testFullDelete }