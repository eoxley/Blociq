import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Loader2, FileText, Brain, AlertCircle, CheckCircle } from 'lucide-react';

interface DocumentAnalysis {
  summary: string;
  suggested_action: string;
  confidence_level: 'high' | 'medium' | 'low';
  key_findings: string[];
  compliance_status: 'compliant' | 'requires_action' | 'clear' | 'unknown';
}

export default function EnhancedAITest() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysis | null>(null);

  const testQuestions = [
    "What compliance issues need attention in this building?",
    "Summarize the key findings from the recent asbestos survey",
    "What actions are required based on the uploaded documents?",
    "Are there any safety concerns in the building documents?",
    "What are the main points from the latest inspection report?"
  ];

  const handleAskAI = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setResponse('');
    setDocumentAnalysis(null);

    try {
      // This would normally use a real building ID
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: '1', // Test building ID
          prompt: question
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResponse(data.response);
        
        // Extract document analysis from context if available
        if (data.context?.documents) {
          console.log('Document context available:', data.context.documents);
        }
      } else {
        setResponse('Error: Failed to get AI response');
      }
    } catch (error) {
      setResponse('Error: Network or server error');
    } finally {
      setLoading(false);
    }
  };

  const simulateDocumentAnalysis = () => {
    setDocumentAnalysis({
      summary: "This is a simulated document analysis showing how the enhanced AI would analyze uploaded documents. The system would extract key findings, suggest actions, and provide compliance insights.",
      suggested_action: "Review the document findings and schedule follow-up inspections as recommended. Update compliance records and notify relevant stakeholders.",
      confidence_level: "high",
      key_findings: [
        "Document contains compliance requirements",
        "Safety recommendations identified",
        "Follow-up actions required"
      ],
      compliance_status: "requires_action"
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Enhanced AI Assistant Test
          </CardTitle>
          <CardDescription>
            Test the enhanced AI assistant with document analysis capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ask a question about your building or documents:</label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What compliance issues need attention in this building?"
              rows={3}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {testQuestions.map((q, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => setQuestion(q)}
              >
                {q.substring(0, 30)}...
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleAskAI} 
              disabled={loading || !question.trim()}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Ask AI Assistant
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={simulateDocumentAnalysis}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Simulate Document Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{response}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {documentAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Analysis Results
            </CardTitle>
            <CardDescription>
              Enhanced AI analysis of uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Summary</h4>
                <p className="text-sm text-gray-600">{documentAnalysis.summary}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Suggested Action</h4>
                <p className="text-sm text-gray-600">{documentAnalysis.suggested_action}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <h4 className="font-medium mb-2">Confidence Level</h4>
                <Badge 
                  variant={
                    documentAnalysis.confidence_level === 'high' ? 'default' :
                    documentAnalysis.confidence_level === 'medium' ? 'secondary' : 'destructive'
                  }
                >
                  {documentAnalysis.confidence_level}
                </Badge>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Compliance Status</h4>
                <Badge 
                  variant={
                    documentAnalysis.compliance_status === 'compliant' ? 'default' :
                    documentAnalysis.compliance_status === 'clear' ? 'secondary' :
                    documentAnalysis.compliance_status === 'requires_action' ? 'destructive' : 'outline'
                  }
                  className="flex items-center gap-1"
                >
                  {documentAnalysis.compliance_status === 'compliant' && <CheckCircle className="h-3 w-3" />}
                  {documentAnalysis.compliance_status === 'requires_action' && <AlertCircle className="h-3 w-3" />}
                  {documentAnalysis.compliance_status}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Key Findings</h4>
              <ul className="space-y-1">
                {documentAnalysis.key_findings.map((finding, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Enhanced Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Document Intelligence</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Automatic text extraction from PDFs</li>
                <li>• Smart document classification</li>
                <li>• Key findings identification</li>
                <li>• Compliance status assessment</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">AI Analysis</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Context-aware responses</li>
                <li>• Actionable recommendations</li>
                <li>• Confidence level assessment</li>
                <li>• Professional property management tone</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 