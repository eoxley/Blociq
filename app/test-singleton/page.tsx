'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/client'

export default function TestSingletonPage() {
  const [testResults, setTestResults] = useState<string[]>([])

  useEffect(() => {
    const runTests = async () => {
      const results: string[] = []
      
      try {
        // Test 1: Check if singleton works
        const client1 = createClient()
        const client2 = createClient()
        const client3 = supabase
        
        const isSingleton = client1 === client2 && client2 === client3
        results.push(`✅ Singleton test: ${isSingleton ? 'PASSED' : 'FAILED'}`)
        
        // Test 2: Check if auth works
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          results.push(`❌ Auth test: ${error.message}`)
        } else if (user) {
          results.push(`✅ Auth test: User logged in (${user.email})`)
        } else {
          results.push(`ℹ️ Auth test: No user logged in`)
        }
        
        // Test 3: Check if database connection works
        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1)
        
        if (dbError) {
          results.push(`❌ Database test: ${dbError.message}`)
        } else {
          results.push(`✅ Database test: Connection successful`)
        }
        
      } catch (error) {
        results.push(`❌ Test error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      setTestResults(results)
    }
    
    runTests()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Singleton Test</h1>
      <div className="space-y-2">
        {testResults.map((result, index) => (
          <div key={index} className="p-2 bg-gray-100 rounded">
            {result}
          </div>
        ))}
      </div>
    </div>
  )
}
