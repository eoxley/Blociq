'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function OCRDebugPage() {
  const [file, setFile] = useState<File | null>(null)
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResults(null)
      setError(null)
    }
  }

  const runOCRTest = async () => {
    if (!file) return

    setTesting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/test-ocr-comparison', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setTesting(false)
    }
  }

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">OCR Debug & Comparison Tool</h1>
        <p className="text-gray-600">
          Test different OCR methods to debug document extraction issues and compare results.
        </p>
      </div>

      {/* File Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            {file && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button 
                  onClick={runOCRTest} 
                  disabled={testing}
                  className="ml-4"
                >
                  {testing ? 'Testing...' : 'Run OCR Test'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200">
          <CardContent className="pt-6">
            <div className="text-red-600">
              <strong>Error:</strong> {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Best Method</p>
                  <p className="font-semibold">{results.summary.bestMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Best Text Length</p>
                  <p className="font-semibold">{results.summary.bestTextLength.toLocaleString()} chars</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="font-semibold">
                    {results.summary.successfulMethods}/{results.summary.totalMethods}
                  </p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800">Recommendation:</p>
                <p className="text-blue-700">{results.summary.recommendation}</p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <div className="grid gap-4">
            {results.results.map((result: any, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{result.method}</CardTitle>
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <Badge className={getScoreColor(result.score)}>
                          {result.score}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {result.success ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Text Length</p>
                          <p className="font-medium">{result.textLength.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Word Count</p>
                          <p className="font-medium">{result.wordCount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Duration</p>
                          <p className="font-medium">{(result.duration / 1000).toFixed(1)}s</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Property Terms</p>
                          <p className="font-medium">{result.hasPropertyTerms ? '✅ Yes' : '❌ No'}</p>
                        </div>
                      </div>
                      
                      {result.source && (
                        <div>
                          <p className="text-sm text-gray-600">Source: {result.source}</p>
                        </div>
                      )}
                      
                      {result.confidence && (
                        <div>
                          <p className="text-sm text-gray-600">Confidence: {result.confidence}</p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Preview:</p>
                        <div className="bg-gray-50 p-3 rounded text-sm font-mono max-h-32 overflow-y-auto">
                          {result.preview}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-600">
                      <p><strong>Error:</strong> {result.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
