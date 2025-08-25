'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Database, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

interface KnowledgeStats {
  totalDocuments: number;
  totalChunks: number;
  categories: Array<{ name: string; count: number }>;
}

interface KnowledgeCategory {
  id: string;
  name: string;
  description: string;
}

export default function IndustryKnowledgeManager() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadKnowledgeBaseInfo();
  }, []);

  const loadKnowledgeBaseInfo = async () => {
    try {
      const response = await fetch('/api/admin/industry-knowledge/upload');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to load knowledge base info:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setErrorMessage('');
    } else if (file) {
      setErrorMessage('Please select a PDF file');
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title || !category) {
      setErrorMessage('Please fill in all required fields and select a PDF file');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title);
      formData.append('category', category);
      if (subcategory) formData.append('subcategory', subcategory);
      if (tags) formData.append('tags', tags);

      setUploadStatus('processing');
      setUploadProgress(50);

      const response = await fetch('/api/admin/industry-knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadStatus('success');
        setUploadProgress(100);
        
        // Reset form
        setTitle('');
        setCategory('');
        setSubcategory('');
        setTags('');
        setSelectedFile(null);
        
        // Reload stats
        setTimeout(() => {
          loadKnowledgeBaseInfo();
          setUploadStatus('idle');
          setUploadProgress(0);
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Upload className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Uploading PDF...';
      case 'processing':
        return 'Processing PDF and generating embeddings...';
      case 'success':
        return 'PDF processed successfully!';
      case 'error':
        return 'Upload failed';
      default:
        return 'Ready to upload';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Industry Knowledge Library</h1>
          <p className="text-muted-foreground">
            Manage your property management knowledge base to enhance AI responses
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {stats?.totalDocuments || 0} documents
        </Badge>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">
                PDFs in knowledge base
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalChunks}</div>
              <p className="text-xs text-muted-foreground">
                Text segments for AI processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categories.length}</div>
              <p className="text-xs text-muted-foreground">
                Knowledge categories
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New PDF</CardTitle>
          <CardDescription>
            Add a new PDF to the industry knowledge library. The system will automatically process it and make it available for AI responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Fire Safety Regulations 2024"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory} disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="e.g., Fire Safety, Building Regulations"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., fire, safety, regulations, compliance"
                disabled={isUploading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">PDF File *</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Only PDF files are supported. Maximum file size: 50MB
            </p>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Upload Progress */}
          {uploadStatus !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={isUploading || !selectedFile || !title || !category}
            className="w-full"
          >
            {isUploading ? 'Processing...' : 'Upload and Process PDF'}
          </Button>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {stats?.categories && stats.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Knowledge by Category</CardTitle>
            <CardDescription>
              Distribution of documents across different knowledge categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.categories.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={(cat.count / stats.totalDocuments) * 100} 
                      className="w-24" 
                    />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {cat.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
