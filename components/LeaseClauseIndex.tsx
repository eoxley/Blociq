// components/LeaseClauseIndex.tsx
// React components for the Lease Clause Index & Summary feature

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  Copy,
  BarChart3,
  Hash,
  AlertCircle,
  CheckCircle,
  Info,
  BookOpen,
  Scale,
  Building,
  PoundSterling,
  Wrench,
  Shield,
  Bell,
  UserCheck
} from 'lucide-react';

import { LeaseClauseIndexer, LeaseClause, ClauseSummary } from '@/lib/document-analysis/lease-clause-indexer';

interface LeaseClauseIndexProps {
  documentText: string;
  onClauseSelect?: (clause: LeaseClause) => void;
}

interface ClauseCardProps {
  clause: LeaseClause;
  onSelect?: () => void;
}

// 2. REACT COMPONENT FOR CLAUSE INDEX DISPLAY
export function LeaseClauseIndex({ documentText, onClauseSelect }: LeaseClauseIndexProps) {
  const [indexer, setIndexer] = useState<LeaseClauseIndexer | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('number');
  const [showSummary, setShowSummary] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    if (documentText) {
      setIsLoading(true);
      try {
        const clauseIndexer = new LeaseClauseIndexer(documentText);
        setIndexer(clauseIndexer);
      } catch (error) {
        console.error('Error creating clause indexer:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [documentText]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Analyzing lease structure...</p>
        </div>
      </div>
    );
  }

  if (!indexer) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Unable to analyze lease structure</p>
      </div>
    );
  }
  
  const allClauses = indexer.getAllClauses();
  const summary = indexer.getClauseSummary();
  
  // Filter and search logic
  let displayClauses = allClauses;
  
  if (filter !== 'all') {
    if (['high', 'medium', 'low'].includes(filter)) {
      displayClauses = displayClauses.filter(c => c.importance === filter);
    } else {
      displayClauses = displayClauses.filter(c => c.category === filter || c.type === filter);
    }
  }
  
  if (searchTerm) {
    displayClauses = indexer.searchClauses(searchTerm);
  }
  
  // Sort logic
  if (sortBy === 'importance') {
    const importanceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    displayClauses.sort((a, b) => importanceOrder[b.importance] - importanceOrder[a.importance]);
  } else if (sortBy === 'category') {
    displayClauses.sort((a, b) => a.category.localeCompare(b.category));
  }
  
  return (
    <div className="space-y-6">
      {showSummary && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Lease Structure Overview
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSummary(false)}
              >
                Hide Summary
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">{summary.totalClauses}</div>
                <div className="text-sm text-gray-600">Total Clauses</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-green-600">{summary.mainClauses}</div>
                <div className="text-sm text-gray-600">Main Clauses</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-purple-600">{summary.schedules}</div>
                <div className="text-sm text-gray-600">Schedules</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-orange-600">{summary.covenants}</div>
                <div className="text-sm text-gray-600">Covenants</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Importance Breakdown</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>High Priority</span>
                  </div>
                  <Badge variant="secondary">{summary.importance.high}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>Medium Priority</span>
                  </div>
                  <Badge variant="secondary">{summary.importance.medium}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span>Low Priority</span>
                  </div>
                  <Badge variant="secondary">{summary.importance.low}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!showSummary && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowSummary(true)}
          className="mb-4"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Show Summary
        </Button>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            Filter & Search Clauses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search clauses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clauses</option>
              <option value="high">High Importance</option>
              <option value="medium">Medium Importance</option>
              <option value="low">Low Importance</option>
              <option value="financial">Financial</option>
              <option value="maintenance">Maintenance</option>
              <option value="use_restrictions">Use Restrictions</option>
              <option value="assignment">Assignment</option>
              <option value="main_clause">Main Clauses</option>
              <option value="schedule">Schedules</option>
              <option value="covenant">Covenants</option>
            </select>
            
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="number">By Number</option>
              <option value="importance">By Importance</option>
              <option value="category">By Category</option>
            </select>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-3">
        {displayClauses.map((clause, index) => (
          <ClauseCard
            key={`${clause.number}-${index}`}
            clause={clause}
            onSelect={() => onClauseSelect && onClauseSelect(clause)}
          />
        ))}
        
        {displayClauses.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No clauses found matching your criteria.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// 3. INDIVIDUAL CLAUSE CARD COMPONENT
function ClauseCard({ clause, onSelect }: ClauseCardProps) {
  const [expanded, setExpanded] = useState<boolean>(false);
  
  const getImportanceColor = (importance: string): string => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getCategoryIcon = (category: string) => {
    const iconProps = { className: "h-4 w-4" };
    switch (category) {
      case 'financial': return <PoundSterling {...iconProps} className="h-4 w-4 text-green-600" />;
      case 'maintenance': return <Wrench {...iconProps} className="h-4 w-4 text-blue-600" />;
      case 'use_restrictions': return <Building {...iconProps} className="h-4 w-4 text-purple-600" />;
      case 'assignment': return <FileText {...iconProps} className="h-4 w-4 text-indigo-600" />;
      case 'insurance': return <Shield {...iconProps} className="h-4 w-4 text-cyan-600" />;
      case 'notices': return <Bell {...iconProps} className="h-4 w-4 text-yellow-600" />;
      case 'enforcement': return <Scale {...iconProps} className="h-4 w-4 text-red-600" />;
      case 'schedule': return <BookOpen {...iconProps} className="h-4 w-4 text-emerald-600" />;
      case 'covenant': return <UserCheck {...iconProps} className="h-4 w-4 text-teal-600" />;
      case 'definition': return <Info {...iconProps} className="h-4 w-4 text-gray-600" />;
      default: return <FileText {...iconProps} className="h-4 w-4 text-gray-600" />;
    }
  };

  const getBorderColor = (importance: string): string => {
    switch (importance) {
      case 'high': return 'border-l-red-400';
      case 'medium': return 'border-l-orange-400';
      case 'low': return 'border-l-gray-400';
      default: return 'border-l-gray-400';
    }
  };
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(clause.content);
      // Could show toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <Card className={`border-l-4 ${getBorderColor(clause.importance)} hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getCategoryIcon(clause.category)}
            <div>
              <div className="font-semibold text-blue-600">{clause.number}</div>
              <div className="text-gray-900 font-medium">{clause.title}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getImportanceColor(clause.importance)}>
              {clause.importance}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {clause.category.replace('_', ' ')}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 italic">
          {clause.summary}
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <div className="bg-gray-50 p-4 rounded-lg border text-sm leading-relaxed">
                {clause.content.length > 500 ? 
                  clause.content.substring(0, 500) + '...' : 
                  clause.content
                }
              </div>
            </div>
            
            {clause.obligations && clause.obligations.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Key Obligations:</h5>
                <ul className="space-y-1">
                  {clause.obligations.map((obligation, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      {obligation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {clause.terms && clause.terms.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Defined Terms:</h5>
                <div className="flex flex-wrap gap-2">
                  {clause.terms.map((term, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-2 border-t">
              {onSelect && (
                <Button onClick={onSelect} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Hash className="h-4 w-4 mr-2" />
                  Summarise This Clause
                </Button>
              )}
              <Button onClick={handleCopy} size="sm" variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Copy Text
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default LeaseClauseIndex;