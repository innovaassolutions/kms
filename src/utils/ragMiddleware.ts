import { enhancedRagService, SearchOptions, RetrievalContext } from './enhancedRagService';
import { LLMService, LLMProvider } from './llmService';

export interface QueryContext {
  originalQuery: string;
  processedQuery: string;
  intent: QueryIntent;
  complexity: QueryComplexity;
  domain: QueryDomain;
  requiresDecomposition: boolean;
  suggestedStrategy: SearchStrategy;
  filters?: QueryFilters;
}

export interface QueryIntent {
  type: 'search' | 'question' | 'summarization' | 'comparison' | 'analysis' | 'extraction';
  confidence: number;
  reasoning: string;
}

export interface QueryComplexity {
  level: 'simple' | 'moderate' | 'complex' | 'multi-step';
  factors: string[];
  estimatedSteps: number;
}

export interface QueryDomain {
  primary: string;
  secondary?: string[];
  technical: boolean;
  confidence: number;
}

export interface QueryFilters {
  documentTypes?: string[];
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  priority?: 'high' | 'medium' | 'low';
}

export type SearchStrategy = 'hybrid' | 'semantic' | 'keyword' | 'chunk-based' | 'multi-step';

export interface MiddlewareResponse {
  context: RetrievalContext;
  queryContext: QueryContext;
  recommendations: string[];
  performance: {
    totalTime: number;
    queryAnalysisTime: number;
    searchTime: number;
    postProcessingTime: number;
  };
}

export class RAGMiddleware {
  private llmService: LLMService;
  
  constructor() {
    // Initialize with OpenAI for query analysis (lightweight tasks)
    this.llmService = new LLMService({
      provider: 'openai' as LLMProvider,
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o-mini', // Fast model for analysis tasks
      maxTokens: 500,
      temperature: 0.1 // Low temperature for consistent analysis
    });
  }

  /**
   * Main middleware entry point for intelligent query processing
   */
  async processQuery(
    query: string, 
    userPreferences: Partial<SearchOptions> = {},
    contextHistory: string[] = []
  ): Promise<MiddlewareResponse> {
    const startTime = Date.now();
    let queryAnalysisTime = 0;
    let searchTime = 0;
    let postProcessingTime = 0;

    try {
      // Step 1: Query Analysis and Intent Classification
      const analysisStart = Date.now();
      const queryContext = await this.analyzeQuery(query, contextHistory);
      queryAnalysisTime = Date.now() - analysisStart;

      // Step 2: Query Decomposition (if needed)
      let searchQueries: string[] = [query];
      if (queryContext.requiresDecomposition) {
        searchQueries = await this.decomposeQuery(query, queryContext);
      }

      // Step 3: Execute Search Strategy
      const searchStart = Date.now();
      const retrievalContext = await this.executeSearchStrategy(
        searchQueries,
        queryContext,
        userPreferences
      );
      searchTime = Date.now() - searchStart;

      // Step 4: Post-processing and Recommendations
      const postProcessStart = Date.now();
      const recommendations = await this.generateRecommendations(queryContext, retrievalContext);
      postProcessingTime = Date.now() - postProcessStart;

      const totalTime = Date.now() - startTime;

      return {
        context: retrievalContext,
        queryContext,
        recommendations,
        performance: {
          totalTime,
          queryAnalysisTime,
          searchTime,
          postProcessingTime,
        },
      };

    } catch (error) {
      console.error('RAG Middleware error:', error);
      throw error;
    }
  }

  /**
   * Analyze query to understand intent, complexity, and optimal strategy
   */
  private async analyzeQuery(query: string, contextHistory: string[] = []): Promise<QueryContext> {
    const analysisPrompt = `Analyze this search query and provide a JSON response with the following structure:

Query: "${query}"
${contextHistory.length > 0 ? `Previous queries: ${contextHistory.slice(-3).join(', ')}` : ''}

Respond with this exact JSON structure:
{
  "intent": {
    "type": "search|question|summarization|comparison|analysis|extraction",
    "confidence": 0.0-1.0,
    "reasoning": "explanation"
  },
  "complexity": {
    "level": "simple|moderate|complex|multi-step",
    "factors": ["factor1", "factor2"],
    "estimatedSteps": 1-5
  },
  "domain": {
    "primary": "general|technical|business|manufacturing|strategy",
    "secondary": ["domain1", "domain2"],
    "technical": true/false,
    "confidence": 0.0-1.0
  },
  "requiresDecomposition": true/false,
  "suggestedStrategy": "hybrid|semantic|keyword|chunk-based|multi-step",
  "filters": {
    "documentTypes": ["type1", "type2"],
    "priority": "high|medium|low"
  }
}

Consider:
- Technical queries (code, APIs, databases) → chunk-based strategy
- Conceptual queries → semantic strategy  
- Exact phrases → keyword strategy
- Complex multi-part questions → multi-step strategy
- Mixed requirements → hybrid strategy`;

    try {
      const response = await this.llmService.generateResponse('', analysisPrompt);
      const analysis = JSON.parse(response.content);
      
      return {
        originalQuery: query,
        processedQuery: this.preprocessQuery(query),
        intent: analysis.intent,
        complexity: analysis.complexity,
        domain: analysis.domain,
        requiresDecomposition: analysis.requiresDecomposition,
        suggestedStrategy: analysis.suggestedStrategy,
        filters: analysis.filters,
      };

    } catch (error) {
      console.error('Query analysis failed, using fallback:', error);
      
      // Fallback to rule-based analysis
      return this.fallbackQueryAnalysis(query);
    }
  }

  /**
   * Fallback rule-based query analysis
   */
  private fallbackQueryAnalysis(query: string): QueryContext {
    const queryLower = query.toLowerCase();
    
    // Determine intent
    let intent: QueryIntent;
    if (queryLower.includes('how') || queryLower.includes('what') || queryLower.includes('why')) {
      intent = { type: 'question', confidence: 0.8, reasoning: 'Question words detected' };
    } else if (queryLower.includes('compare') || queryLower.includes('difference')) {
      intent = { type: 'comparison', confidence: 0.7, reasoning: 'Comparison keywords detected' };
    } else if (queryLower.includes('summarize') || queryLower.includes('summary')) {
      intent = { type: 'summarization', confidence: 0.8, reasoning: 'Summary keywords detected' };
    } else {
      intent = { type: 'search', confidence: 0.6, reasoning: 'Default search intent' };
    }

    // Determine complexity
    const complexity: QueryComplexity = {
      level: query.split(/[.?!]/).length > 1 ? 'complex' : 'simple',
      factors: [],
      estimatedSteps: 1,
    };

    // Determine domain
    const technical = /\b(code|api|database|sql|function|class|technical|system)\b/i.test(query);
    const domain: QueryDomain = {
      primary: technical ? 'technical' : 'general',
      technical,
      confidence: 0.6,
    };

    // Suggest strategy
    let suggestedStrategy: SearchStrategy = 'hybrid';
    if (technical) suggestedStrategy = 'chunk-based';
    if (queryLower.includes('"')) suggestedStrategy = 'keyword';
    if (queryLower.includes('similar') || queryLower.includes('like')) suggestedStrategy = 'semantic';

    return {
      originalQuery: query,
      processedQuery: this.preprocessQuery(query),
      intent,
      complexity,
      domain,
      requiresDecomposition: false,
      suggestedStrategy,
    };
  }

  /**
   * Decompose complex queries into simpler sub-queries
   */
  private async decomposeQuery(query: string, context: QueryContext): Promise<string[]> {
    if (!context.requiresDecomposition) {
      return [query];
    }

    const decompositionPrompt = `Decompose this complex query into 2-4 simpler sub-queries that can be searched independently:

Original query: "${query}"
Complexity: ${context.complexity.level}
Estimated steps: ${context.complexity.estimatedSteps}

Return a JSON array of sub-queries:
["sub-query 1", "sub-query 2", "sub-query 3"]

Guidelines:
- Each sub-query should be searchable independently
- Maintain the original intent
- Order by priority/dependency
- Keep original context where needed`;

    try {
      const response = await this.llmService.generateResponse('', decompositionPrompt);
      const subQueries = JSON.parse(response.content);
      
      if (Array.isArray(subQueries) && subQueries.length > 0) {
        return subQueries;
      }
    } catch (error) {
      console.error('Query decomposition failed:', error);
    }

    return [query]; // Fallback to original query
  }

  /**
   * Execute the determined search strategy
   */
  private async executeSearchStrategy(
    queries: string[],
    queryContext: QueryContext,
    userPreferences: Partial<SearchOptions>
  ): Promise<RetrievalContext> {
    
    if (queries.length === 1) {
      // Single query execution
      const searchOptions: SearchOptions = {
        query: queries[0],
        searchType: queryContext.suggestedStrategy,
        maxResults: userPreferences.maxResults || this.getDefaultMaxResults(queryContext),
        similarityThreshold: userPreferences.similarityThreshold || this.getDefaultThreshold(queryContext),
        filters: {
          ...queryContext.filters,
          ...userPreferences.filters,
        },
        includeContext: true,
        contextWindow: 2,
      };

      return await enhancedRagService.search(searchOptions);
    } else {
      // Multi-query execution and result merging
      return await this.executeMultiQuerySearch(queries, queryContext, userPreferences);
    }
  }

  /**
   * Execute multiple queries and merge results intelligently
   */
  private async executeMultiQuerySearch(
    queries: string[],
    queryContext: QueryContext,
    userPreferences: Partial<SearchOptions>
  ): Promise<RetrievalContext> {
    const allResults = [];
    let totalProcessingTime = 0;

    for (const query of queries) {
      const searchOptions: SearchOptions = {
        query,
        searchType: queryContext.suggestedStrategy,
        maxResults: Math.ceil((userPreferences.maxResults || 10) / queries.length),
        similarityThreshold: userPreferences.similarityThreshold || 0.3,
        filters: {
          ...queryContext.filters,
          ...userPreferences.filters,
        },
        includeContext: true,
      };

      const result = await enhancedRagService.search(searchOptions);
      allResults.push(...result.results);
      totalProcessingTime += result.processingTime;
    }

    // Merge and deduplicate results
    const uniqueResults = this.deduplicateResults(allResults);
    const rankedResults = this.reRankMergedResults(uniqueResults, queryContext.originalQuery);

    return {
      query: queryContext.originalQuery,
      results: rankedResults.slice(0, userPreferences.maxResults || 10),
      totalResults: rankedResults.length,
      searchStrategy: 'multi-step',
      processingTime: totalProcessingTime,
      confidence: this.calculateMergedConfidence(rankedResults),
    };
  }

  /**
   * Generate recommendations for improving search results
   */
  private async generateRecommendations(
    queryContext: QueryContext,
    retrievalContext: RetrievalContext
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Low confidence recommendations
    if (retrievalContext.confidence < 0.3) {
      recommendations.push('Consider rephrasing your query or using different keywords');
      recommendations.push('Try searching for broader terms or concepts');
    }

    // No results recommendations
    if (retrievalContext.results.length === 0) {
      recommendations.push('No documents found. Try broader search terms');
      recommendations.push('Check if documents exist for this topic in your knowledge base');
    }

    // Strategy-specific recommendations
    if (queryContext.suggestedStrategy === 'chunk-based' && retrievalContext.results.length < 3) {
      recommendations.push('Try semantic search for better conceptual matches');
    }

    // Domain-specific recommendations
    if (queryContext.domain.technical && retrievalContext.confidence < 0.5) {
      recommendations.push('Consider searching for specific technical terms or code examples');
    }

    return recommendations;
  }

  /**
   * Preprocess query for better matching
   */
  private preprocessQuery(query: string): string {
    return query
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase();
  }

  /**
   * Get default max results based on query context
   */
  private getDefaultMaxResults(context: QueryContext): number {
    switch (context.complexity.level) {
      case 'simple': return 5;
      case 'moderate': return 10;
      case 'complex': return 15;
      case 'multi-step': return 20;
      default: return 10;
    }
  }

  /**
   * Get default similarity threshold based on query context
   */
  private getDefaultThreshold(context: QueryContext): number {
    switch (context.intent.type) {
      case 'search': return 0.3;
      case 'question': return 0.25;
      case 'analysis': return 0.4;
      case 'extraction': return 0.5;
      default: return 0.3;
    }
  }

  /**
   * Deduplicate search results by document ID
   */
  private deduplicateResults(results: any[]): any[] {
    const seen = new Set();
    return results.filter(result => {
      const key = result.chunkId || result.id;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Re-rank merged results from multiple queries
   */
  private reRankMergedResults(results: any[], originalQuery: string): any[] {
    // Simple re-ranking based on similarity and relevance to original query
    return results.sort((a, b) => {
      // Boost results that appear more relevant to the original query
      const aRelevance = this.calculateQueryRelevance(a, originalQuery);
      const bRelevance = this.calculateQueryRelevance(b, originalQuery);
      
      return (b.similarity * bRelevance) - (a.similarity * aRelevance);
    });
  }

  /**
   * Calculate how relevant a result is to the original query
   */
  private calculateQueryRelevance(result: any, query: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const resultText = (result.title + ' ' + result.content).toLowerCase();
    
    const matchingWords = queryWords.filter(word => 
      word.length > 2 && resultText.includes(word)
    );
    
    return matchingWords.length / queryWords.length;
  }

  /**
   * Calculate confidence for merged results
   */
  private calculateMergedConfidence(results: any[]): number {
    if (results.length === 0) return 0;
    
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
    const topSimilarity = results[0]?.similarity || 0;
    const resultCountFactor = Math.min(results.length / 5, 1); // Normalize to 0-1
    
    return (avgSimilarity * 0.4 + topSimilarity * 0.4 + resultCountFactor * 0.2);
  }
}

// Export singleton instance
export const ragMiddleware = new RAGMiddleware();