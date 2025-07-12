import { createClient } from '@supabase/supabase-js';
import { embeddingService } from './enhancedEmbeddingService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface SearchOptions {
  query: string;
  searchType?: 'hybrid' | 'semantic' | 'keyword' | 'chunk-based';
  maxResults?: number;
  similarityThreshold?: number;
  filters?: {
    type?: string;
    tags?: string[];
    dateRange?: { start: Date; end: Date };
  };
  includeContext?: boolean;
  contextWindow?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  rank: number;
  type: string;
  tags: string[];
  chunkId?: string;
  chunkText?: string;
  citationMetadata: any;
  context?: ChunkContext[];
}

export interface ChunkContext {
  chunkId: string;
  chunkText: string;
  chunkIndex: number;
  metadata: any;
}

export interface RetrievalContext {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchStrategy: string;
  processingTime: number;
  confidence: number;
}

export class EnhancedRagService {
  private readonly DEFAULT_SIMILARITY_THRESHOLD = 0.3;
  private readonly DEFAULT_MAX_RESULTS = 10;
  private readonly DEFAULT_CONTEXT_WINDOW = 2;

  /**
   * Main search method with intelligent routing
   */
  async search(options: SearchOptions): Promise<RetrievalContext> {
    const startTime = Date.now();
    
    try {
      // Classify query intent and determine search strategy
      const searchStrategy = await this.classifySearchIntent(options.query);
      
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(options.query);
      
      let results: SearchResult[] = [];
      let totalResults = 0;
      
      // Execute search based on strategy
      switch (options.searchType || searchStrategy) {
        case 'hybrid':
          results = await this.hybridSearch(options, queryEmbedding.embedding);
          break;
        case 'chunk-based':
          results = await this.chunkBasedSearch(options, queryEmbedding.embedding);
          break;
        case 'semantic':
          results = await this.semanticSearch(options, queryEmbedding.embedding);
          break;
        case 'keyword':
          results = await this.keywordSearch(options);
          break;
        default:
          results = await this.hybridSearch(options, queryEmbedding.embedding);
      }
      
      // Add context for chunks if requested
      if (options.includeContext) {
        results = await this.enrichWithContext(results, options.contextWindow);
      }
      
      // Re-rank results for relevance
      results = await this.reRankResults(results, options.query);
      
      // Calculate confidence score
      const confidence = this.calculateConfidence(results);
      
      const processingTime = Date.now() - startTime;
      
      return {
        query: options.query,
        results,
        totalResults: results.length,
        searchStrategy: options.searchType || searchStrategy,
        processingTime,
        confidence,
      };
      
    } catch (error) {
      console.error('Enhanced RAG search error:', error);
      throw error;
    }
  }

  /**
   * Hybrid search combining vector similarity and text search
   */
  private async hybridSearch(options: SearchOptions, queryEmbedding: number[]): Promise<SearchResult[]> {
    const { data, error } = await supabase.rpc('search_documents_hybrid', {
      query_embedding: queryEmbedding,
      query_text: options.query,
      match_threshold: options.similarityThreshold || this.DEFAULT_SIMILARITY_THRESHOLD,
      match_count: options.maxResults || this.DEFAULT_MAX_RESULTS,
      filter_type: options.filters?.type,
      filter_tags: options.filters?.tags,
    });

    if (error) {
      console.error('Hybrid search error:', error);
      throw error;
    }

    return this.formatSearchResults(data || []);
  }

  /**
   * Chunk-based search for detailed content retrieval
   */
  private async chunkBasedSearch(options: SearchOptions, queryEmbedding: number[]): Promise<SearchResult[]> {
    const { data, error } = await supabase.rpc('search_document_chunks', {
      query_embedding: queryEmbedding,
      similarity_threshold: options.similarityThreshold || this.DEFAULT_SIMILARITY_THRESHOLD,
      max_results: options.maxResults || this.DEFAULT_MAX_RESULTS,
    });

    if (error) {
      console.error('Chunk-based search error:', error);
      throw error;
    }

    return this.formatChunkResults(data || []);
  }

  /**
   * Pure semantic search using embeddings
   */
  private async semanticSearch(options: SearchOptions, queryEmbedding: number[]): Promise<SearchResult[]> {
    let query = supabase
      .from('documents')
      .select('id, title, content_text, type, tags, citation_metadata, embedding')
      .not('embedding', 'is', null);

    // Apply filters
    if (options.filters?.type) {
      query = query.eq('type', options.filters.type);
    }
    
    if (options.filters?.tags) {
      query = query.overlaps('tags', options.filters.tags);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Semantic search error:', error);
      throw error;
    }

    // Calculate similarities and sort
    const results = data
      ?.map(doc => ({
        ...doc,
        similarity: this.calculateCosineSimilarity(queryEmbedding, doc.embedding),
      }))
      .filter(doc => doc.similarity > (options.similarityThreshold || this.DEFAULT_SIMILARITY_THRESHOLD))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.maxResults || this.DEFAULT_MAX_RESULTS) || [];

    return this.formatSearchResults(results);
  }

  /**
   * Keyword-based search using PostgreSQL full-text search
   */
  private async keywordSearch(options: SearchOptions): Promise<SearchResult[]> {
    let query = supabase
      .from('documents')
      .select('id, title, content_text, type, tags, citation_metadata')
      .textSearch('content_text', options.query, { type: 'websearch' });

    // Apply filters
    if (options.filters?.type) {
      query = query.eq('type', options.filters.type);
    }
    
    if (options.filters?.tags) {
      query = query.overlaps('tags', options.filters.tags);
    }

    query = query.limit(options.maxResults || this.DEFAULT_MAX_RESULTS);

    const { data, error } = await query;

    if (error) {
      console.error('Keyword search error:', error);
      throw error;
    }

    return this.formatSearchResults(data || [], 'keyword');
  }

  /**
   * Classify search intent to determine optimal strategy
   */
  private async classifySearchIntent(query: string): Promise<string> {
    const queryLower = query.toLowerCase();
    
    // Technical/code queries - use chunk-based for detailed retrieval
    if (queryLower.includes('code') || queryLower.includes('function') || 
        queryLower.includes('class') || queryLower.includes('sql') ||
        queryLower.includes('database') || queryLower.includes('api')) {
      return 'chunk-based';
    }
    
    // Exact phrase or keyword queries
    if (query.includes('"') || queryLower.includes('exact') || 
        queryLower.includes('specifically')) {
      return 'keyword';
    }
    
    // Conceptual or semantic queries
    if (queryLower.includes('similar') || queryLower.includes('like') ||
        queryLower.includes('related') || queryLower.includes('about')) {
      return 'semantic';
    }
    
    // Default to hybrid for balanced results
    return 'hybrid';
  }

  /**
   * Enrich results with surrounding context
   */
  private async enrichWithContext(results: SearchResult[], contextWindow = this.DEFAULT_CONTEXT_WINDOW): Promise<SearchResult[]> {
    const enrichedResults: SearchResult[] = [];

    for (const result of results) {
      let enrichedResult = { ...result };
      
      if (result.chunkId) {
        try {
          const { data: contextData, error } = await supabase.rpc('get_document_context', {
            target_chunk_id: result.chunkId,
            context_window: contextWindow,
          });

          if (!error && contextData) {
            enrichedResult.context = contextData.map((chunk: any) => ({
              chunkId: chunk.chunk_id,
              chunkText: chunk.chunk_text,
              chunkIndex: chunk.chunk_index,
              metadata: chunk.chunk_metadata,
            }));
          }
        } catch (error) {
          console.error('Error enriching context for chunk:', result.chunkId, error);
        }
      }
      
      enrichedResults.push(enrichedResult);
    }

    return enrichedResults;
  }

  /**
   * Re-rank results using cross-encoder or other relevance signals
   */
  private async reRankResults(results: SearchResult[], query: string): Promise<SearchResult[]> {
    // For now, implement simple re-ranking based on multiple factors
    return results.map(result => {
      let boost = 1.0;
      
      // Boost recent documents
      if (result.citationMetadata?.created_at) {
        const daysSinceCreation = (Date.now() - new Date(result.citationMetadata.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) boost *= 1.1;
      }
      
      // Boost documents with higher chunk matches
      if (result.chunkText) boost *= 1.05;
      
      // Boost by document type relevance (can be customized)
      const typeBoosts: Record<string, number> = {
        'knowledge': 1.2,
        'sop': 1.15,
        'strategy': 1.1,
      };
      boost *= typeBoosts[result.type] || 1.0;
      
      return {
        ...result,
        rank: result.rank * boost,
      };
    }).sort((a, b) => b.rank - a.rank);
  }

  /**
   * Calculate confidence score for search results
   */
  private calculateConfidence(results: SearchResult[]): number {
    if (results.length === 0) return 0;
    
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
    const topResultSimilarity = results[0]?.similarity || 0;
    const resultCount = Math.min(results.length, 5) / 5; // Normalize to 0-1
    
    // Weighted confidence score
    return (avgSimilarity * 0.4 + topResultSimilarity * 0.4 + resultCount * 0.2);
  }

  /**
   * Format search results from database response
   */
  private formatSearchResults(data: any[], searchType = 'vector'): SearchResult[] {
    return data.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content || item.content_text,
      similarity: item.similarity || 0.8, // Default for keyword search
      rank: item.rank || item.similarity || 0.8,
      type: item.type,
      tags: item.tags || [],
      chunkId: item.chunk_id,
      chunkText: item.chunk_text,
      citationMetadata: item.citation_metadata || {},
    }));
  }

  /**
   * Format chunk-based search results
   */
  private formatChunkResults(data: any[]): SearchResult[] {
    return data.map(item => ({
      id: item.document_id,
      title: item.document_title,
      content: item.chunk_text,
      similarity: item.similarity,
      rank: item.similarity,
      type: 'chunk', // Mark as chunk result
      tags: [],
      chunkId: item.chunk_id,
      chunkText: item.chunk_text,
      citationMetadata: item.chunk_metadata || {},
    }));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get search analytics and performance metrics
   */
  async getSearchAnalytics(timeframe = '7d'): Promise<any> {
    // Implementation for search analytics
    // This could track query patterns, result quality, etc.
    return {
      totalQueries: 0,
      avgResponseTime: 0,
      topQueries: [],
      searchStrategies: {},
    };
  }
}

// Export singleton instance
export const enhancedRagService = new EnhancedRagService();