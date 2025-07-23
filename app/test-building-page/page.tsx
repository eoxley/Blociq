import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestBuildingPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Building Page Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              This page tests the building detail page with different building IDs.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Valid Building IDs:</h3>
                <div className="space-y-2">
                  <Link href="/buildings/1">
                    <Button variant="outline" className="w-full">
                      Building ID: 1 (Sample House)
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Invalid Building IDs:</h3>
                <div className="space-y-2">
                  <Link href="/buildings/2beeec1d-a94e-4058-b881-213d74cc6830">
                    <Button variant="outline" className="w-full text-red-600">
                      UUID: 2beeec1d-a94e-4058-b881-213d74cc6830
                    </Button>
                  </Link>
                  <Link href="/buildings/999">
                    <Button variant="outline" className="w-full text-red-600">
                      Non-existent: 999
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Link href="/buildings">
                <Button>
                  Back to Buildings List
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 