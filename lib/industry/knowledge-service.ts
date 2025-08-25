import { supabase } from '@/lib/supabaseClient'

export interface IndustryGuidance {
  id: string
  category: string
  title: string
  description: string
  content: string
  source: string
  version: string
  last_updated: string
  relevance_score: number
  tags: string[]
}

export interface IndustryStandard {
  id: string
  name: string
  category: string
  description: string
  requirements: string[]
  frequency: string
  legal_basis: string
  guidance_notes: string
}

export class IndustryKnowledgeService {
  private static instance: IndustryKnowledgeService
  private guidanceCache: Map<string, IndustryGuidance[]> = new Map()
  private standardsCache: Map<string, IndustryStandard[]> = new Map()

  static getInstance(): IndustryKnowledgeService {
    if (!IndustryKnowledgeService.instance) {
      IndustryKnowledgeService.instance = new IndustryKnowledgeService()
    }
    return IndustryKnowledgeService.instance
  }

  /**
   * Get relevant industry guidance for a specific category or query
   */
  async getGuidanceForCategory(category: string): Promise<IndustryGuidance[]> {
    // Check cache first
    if (this.guidanceCache.has(category)) {
      return this.guidanceCache.get(category)!
    }

    try {
      const { data, error } = await supabase
        .from('industry_guidance')
        .select('*')
        .eq('category', category)
        .order('relevance_score', { ascending: false })

      if (error) {
        console.error('Error fetching industry guidance:', error)
        return []
      }

      // Cache the results
      this.guidanceCache.set(category, data || [])
      return data || []
    } catch (error) {
      console.error('Error fetching industry guidance:', error)
      return []
    }
  }

  /**
   * Get industry standards for a specific category
   */
  async getStandardsForCategory(category: string): Promise<IndustryStandard[]> {
    // Check cache first
    if (this.standardsCache.has(category)) {
      return this.standardsCache.get(category)!
    }

    try {
      const { data, error } = await supabase
        .from('industry_standards')
        .select('*')
        .eq('category', category)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching industry standards:', error)
        return []
      }

      // Cache the results
      this.standardsCache.set(category, data || [])
      return data || []
    } catch (error) {
      console.error('Error fetching industry standards:', error)
      return []
    }
  }

  /**
   * Search industry knowledge by keywords
   */
  async searchIndustryKnowledge(query: string): Promise<{
    guidance: IndustryGuidance[]
    standards: IndustryStandard[]
  }> {
    try {
      // Search guidance
      const { data: guidanceData, error: guidanceError } = await supabase
        .from('industry_guidance')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`)
        .order('relevance_score', { ascending: false })

      // Search standards
      const { data: standardsData, error: standardsError } = await supabase
        .from('industry_standards')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,requirements.ilike.%${query}%`)
        .order('name', { ascending: true })

      if (guidanceError || standardsError) {
        console.error('Error searching industry knowledge:', { guidanceError, standardsError })
        return { guidance: [], standards: [] }
      }

      return {
        guidance: guidanceData || [],
        standards: standardsData || []
      }
    } catch (error) {
      console.error('Error searching industry knowledge:', error)
      return { guidance: [], standards: [] }
    }
  }

  /**
   * Get comprehensive industry context for AI responses
   */
  async getIndustryContext(category: string, query?: string): Promise<string> {
    const [guidance, standards] = await Promise.all([
      this.getGuidanceForCategory(category),
      this.getStandardsForCategory(category)
    ])

    let context = `INDUSTRY KNOWLEDGE FOR ${category.toUpperCase()}:\n\n`

    // Add relevant standards
    if (standards.length > 0) {
      context += `RELEVANT STANDARDS:\n`
      standards.forEach(standard => {
        context += `• ${standard.name}: ${standard.description}\n`
        context += `  Requirements: ${standard.requirements.join(', ')}\n`
        context += `  Frequency: ${standard.frequency}\n`
        context += `  Legal Basis: ${standard.legal_basis}\n\n`
      })
    }

    // Add relevant guidance
    if (guidance.length > 0) {
      context += `PROFESSIONAL GUIDANCE:\n`
      guidance.forEach(g => {
        context += `• ${g.title} (${g.source} v${g.version})\n`
        context += `  ${g.description}\n\n`
      })
    }

    // Add specific query context if provided
    if (query) {
      const searchResults = await this.searchIndustryKnowledge(query)
      if (searchResults.guidance.length > 0 || searchResults.standards.length > 0) {
        context += `SPECIFIC GUIDANCE FOR YOUR QUERY:\n`
        searchResults.standards.forEach(standard => {
          context += `• ${standard.name}: ${standard.guidance_notes}\n`
        })
        searchResults.guidance.forEach(g => {
          context += `• ${g.title}: ${g.content.substring(0, 200)}...\n`
        })
      }
    }

    return context
  }

  /**
   * Get industry best practices for a category
   */
  async getBestPractices(category: string): Promise<string[]> {
    const standards = await this.getStandardsForCategory(category)
    const guidance = await this.getGuidanceForCategory(category)

    const bestPractices: string[] = []

    // Extract best practices from standards
    standards.forEach(standard => {
      bestPractices.push(...standard.requirements)
      if (standard.guidance_notes) {
        bestPractices.push(standard.guidance_notes)
      }
    })

    // Extract best practices from guidance
    guidance.forEach(g => {
      if (g.content) {
        // Extract key points from content
        const sentences = g.content.split('. ').filter(s => s.length > 20)
        bestPractices.push(...sentences.slice(0, 3)) // Take first 3 meaningful sentences
      }
    })

    return bestPractices.filter((practice, index, arr) => 
      arr.indexOf(practice) === index && practice.length > 10
    )
  }

  /**
   * Validate a response against industry standards
   */
  async validateResponseAgainstStandards(
    response: string, 
    category: string
  ): Promise<{
    isValid: boolean
    issues: string[]
    suggestions: string[]
    standardsReferenced: string[]
  }> {
    const standards = await this.getStandardsForCategory(category)
    const issues: string[] = []
    const suggestions: string[] = []
    const standardsReferenced: string[] = []

    // Check if response references relevant standards
    standards.forEach(standard => {
      if (response.toLowerCase().includes(standard.name.toLowerCase())) {
        standardsReferenced.push(standard.name)
      } else {
        suggestions.push(`Consider referencing ${standard.name} for ${category} best practices`)
      }
    })

    // Check for common industry issues
    const commonIssues = [
      'should follow industry standards',
      'best practice recommends',
      'industry guidance suggests',
      'professional standards require',
      'market practice indicates'
    ]

    commonIssues.forEach(issue => {
      if (response.toLowerCase().includes(issue)) {
        suggestions.push(`Ensure alignment with ${issue} requirements`)
      }
    })

    // Determine if response is valid
    const isValid = standardsReferenced.length > 0 && issues.length === 0

    return {
      isValid,
      issues,
      suggestions,
      standardsReferenced
    }
  }

  /**
   * Clear cache (useful for development/testing)
   */
  clearCache(): void {
    this.guidanceCache.clear()
    this.standardsCache.clear()
  }
}

export default IndustryKnowledgeService
