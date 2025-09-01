// components/DocumentAnalysisErrorBoundary.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, FileText } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface DocumentAnalysisErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: Error | null; retry: () => void}>;
}

export class DocumentAnalysisErrorBoundary extends React.Component<
  DocumentAnalysisErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: DocumentAnalysisErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Document analysis UI error:', error, errorInfo);
    
    // Log the specific Scale error
    if (error.message.includes('Scale')) {
      console.error('Missing Scale component - check data visualization imports');
    }

    // Log other common errors
    if (error.message.includes('Cannot read properties')) {
      console.error('Data structure error - likely missing or malformed analysis result');
    }

    if (error.message.includes('JSON')) {
      console.error('JSON parsing error - likely malformed API response');
    }

    this.setState({
      error,
      errorInfo,
      hasError: true
    });
  }
  
  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      // Default error UI
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Document Analysis Temporarily Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-red-700">
              <p className="mb-2">We're having trouble displaying the analysis results.</p>
              <p className="text-sm text-red-600">
                This could be due to a missing component, data formatting issue, or temporary system error.
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            </div>

            {/* Technical Details (collapsible) */}
            <details className="mt-4">
              <summary className="text-sm font-medium text-red-800 cursor-pointer hover:text-red-900">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-red-100 rounded border border-red-200">
                <div className="text-sm text-red-800 font-mono">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
                  </div>
                  {this.state.error?.stack && (
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="text-xs mt-1 overflow-x-auto whitespace-pre-wrap">
                        {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="text-xs mt-1 overflow-x-auto whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack.split('\n').slice(0, 5).join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </details>

            {/* Common Solutions */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Common Solutions
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Try uploading the document again</li>
                <li>• Ensure your document is a valid PDF or image file</li>
                <li>• Check your internet connection</li>
                <li>• Try refreshing the page</li>
                {this.state.error?.message.includes('Scale') && (
                  <li>• Data visualization component error - please report this</li>
                )}
                {this.state.error?.message.includes('JSON') && (
                  <li>• Document processing error - try a different document format</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
export function DocumentAnalysisErrorBoundaryWrapper({ 
  children, 
  fallback 
}: DocumentAnalysisErrorBoundaryProps) {
  return (
    <DocumentAnalysisErrorBoundary fallback={fallback}>
      {children}
    </DocumentAnalysisErrorBoundary>
  );
}

// Custom fallback components
export function MinimalErrorFallback({ error, retry }: { error: Error | null; retry: () => void }) {
  return (
    <div className="text-center py-8">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Error</h3>
      <p className="text-gray-600 mb-4">Unable to display document analysis results.</p>
      <Button onClick={retry} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}

export function DetailedErrorFallback({ error, retry }: { error: Error | null; retry: () => void }) {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertCircle className="h-5 w-5" />
          Document Analysis Error
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-orange-700">
            The document analysis system encountered an error while processing your request.
          </p>
          
          <div className="bg-orange-100 border border-orange-200 rounded p-3">
            <h4 className="font-medium text-orange-800 mb-2">Error Details:</h4>
            <code className="text-sm text-orange-900 block">
              {error?.message || 'Unknown error occurred'}
            </code>
          </div>

          <div className="flex gap-2">
            <Button onClick={retry} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Analysis
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              size="sm" 
              variant="outline"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DocumentAnalysisErrorBoundary;