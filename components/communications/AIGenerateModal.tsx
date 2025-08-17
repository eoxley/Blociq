"use client";
import { useState } from "react";
import { 
  Brain, 
  X, 
  Sparkles, 
  MessageSquare, 
  Users, 
  Building2, 
  FileText, 
  Mail,
  Loader2,
  Copy,
  CheckCircle
} from "lucide-react";

interface AIGenerateModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (subject: string, content: string) => void;
  messageType: 'email' | 'letter';
  recipientCount: number;
}

export default function AIGenerateModal({
  open,
  onClose,
  onGenerate,
  messageType,
  recipientCount
}: AIGenerateModalProps) {
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSubject, setGeneratedSubject] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    
    setIsGenerating(true);
    try {
      // Simulate AI generation - replace with actual AI API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate content based on description
      const subject = `Re: ${description.split(' ').slice(0, 5).join(' ')}...`;
      const content = `Dear ${recipientCount > 1 ? 'Residents' : 'Resident'},

${description}

This communication is being sent to ${recipientCount} ${recipientCount === 1 ? 'recipient' : 'recipients'}.

Best regards,
Property Management Team`;

      setGeneratedSubject(subject);
      setGeneratedContent(content);
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseGenerated = () => {
    onGenerate(generatedSubject, generatedContent);
    onClose();
    // Reset form
    setDescription("");
    setGeneratedSubject("");
    setGeneratedContent("");
    setCopied(false);
  };

  const handleCopy = () => {
    const textToCopy = `Subject: ${generatedSubject}\n\n${generatedContent}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          
          {/* Hero Banner Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Brain className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">AI Communication Generator</h2>
                    <p className="text-orange-100">Generate professional {messageType}s with AI assistance</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Recipient Info */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                  <Users className="h-4 w-4" />
                  <span>{recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                  {messageType === 'email' ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span>{messageType.charAt(0).toUpperCase() + messageType.slice(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Describe what you want to communicate:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Remind residents about upcoming maintenance work on the heating system next week..."
                rows={4}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!description.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 px-6 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate {messageType.charAt(0).toUpperCase() + messageType.slice(1)}
                </>
              )}
            </button>

            {/* Generated Content */}
            {generatedSubject && generatedContent && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Generated Content
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subject:</label>
                    <div className="text-sm text-gray-900 font-medium">{generatedSubject}</div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Message:</label>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">{generatedContent}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleUseGenerated}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 text-sm font-medium"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Use This Content
                  </button>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips for better results:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Be specific about the purpose and timing</li>
                <li>• Mention any important details or requirements</li>
                <li>• Include contact information if needed</li>
                <li>• Specify if it's urgent or routine</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
