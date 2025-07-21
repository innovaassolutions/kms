import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface ChunkMetadata {
  start_page?: number;
  end_page?: number;
  section_title?: string;
  chunk_type?: 'text' | 'code' | 'table' | 'list';
  language?: string; // For code chunks
  [key: string]: any;
}

export interface DocumentChunk {
  text: string;
  metadata: ChunkMetadata;
  tokenCount: number;
  index: number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokenCount: number;
}

// Token limits for different models
const MODEL_LIMITS = {
  'text-embedding-3-small': 8191,
  'text-embedding-3-large': 8191,
  'text-embedding-ada-002': 8191,
};

// Chunk size configurations
const CHUNK_CONFIG = {
  targetTokens: 500,
  maxTokens: 1000,
  overlapTokens: 100,
  minChunkSize: 100, // Minimum characters for a chunk
};

export class EnhancedEmbeddingService {
  private model: string;
  private cachingEnabled: boolean;

  constructor(model: string = 'text-embedding-3-small', cachingEnabled: boolean = true) {
    this.model = model;
    this.cachingEnabled = cachingEnabled;
  }

  /**
   * Generate embeddings with caching support
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Check cache first
    if (this.cachingEnabled) {
      const cached = await this.checkEmbeddingCache(text);
      if (cached) {
        return cached;
      }
    }

    // Truncate text if needed
    const truncatedText = this.truncateText(text);
    
    try {
      const response = await openai.embeddings.create({
        model: this.model,
        input: truncatedText,
      });

      const embedding = response.data[0].embedding;
      const tokenCount = response.usage?.total_tokens || 0;

      const result: EmbeddingResult = {
        embedding: Array.from(embedding),
        model: this.model,
        tokenCount,
      };

      // Cache the result
      if (this.cachingEnabled) {
        await this.cacheEmbedding(text, result);
      }

      return result;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // OpenAI allows up to 2048 embeddings per request
    const batchSize = 100;
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const truncatedBatch = batch.map(text => this.truncateText(text));

      try {
        const response = await openai.embeddings.create({
          model: this.model,
          input: truncatedBatch,
        });

        for (let j = 0; j < response.data.length; j++) {
          const embedding = response.data[j].embedding;
          const tokenCount = Math.floor((response.usage?.total_tokens || 0) / response.data.length);

          results.push({
            embedding: Array.from(embedding),
            model: this.model,
            tokenCount,
          });
        }

        // Add delay to respect rate limits
        if (i + batchSize < texts.length) {
          await this.delay(100);
        }
      } catch (error) {
        console.error('Error in batch embedding generation:', error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Intelligent text chunking with overlap
   */
  async chunkDocument(text: string, metadata: any = {}): Promise<DocumentChunk[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const chunks: DocumentChunk[] = [];
    
    // Split by natural boundaries first (paragraphs, sections)
    const sections = this.splitIntoSections(text);
    
    for (const section of sections) {
      const sectionChunks = await this.chunkSection(section.text, section.metadata);
      chunks.push(...sectionChunks);
    }

    // Re-index chunks
    return chunks.map((chunk, index) => ({
      ...chunk,
      index,
    }));
  }

  /**
   * Split text into logical sections
   */
  private splitIntoSections(text: string): Array<{ text: string; metadata: any }> {
    const sections: Array<{ text: string; metadata: any }> = [];
    
    // Try to detect markdown headers
    const markdownSections = text.split(/^#{1,6}\s+(.+)$/gm);
    
    if (markdownSections.length > 1) {
      for (let i = 0; i < markdownSections.length; i += 2) {
        const content = markdownSections[i];
        const title = markdownSections[i + 1] || '';
        
        if (content.trim()) {
          sections.push({
            text: content,
            metadata: { section_title: title },
          });
        }
      }
    } else {
      // Fall back to paragraph-based splitting
      const paragraphs = text.split(/\n\n+/);
      const combinedParagraphs: string[] = [];
      let currentCombined = '';
      
      for (const para of paragraphs) {
        if ((currentCombined + para).length < CHUNK_CONFIG.maxTokens * 4) {
          currentCombined += (currentCombined ? '\n\n' : '') + para;
        } else {
          if (currentCombined) {
            combinedParagraphs.push(currentCombined);
          }
          currentCombined = para;
        }
      }
      
      if (currentCombined) {
        combinedParagraphs.push(currentCombined);
      }
      
      sections.push(...combinedParagraphs.map(text => ({
        text,
        metadata: {},
      })));
    }
    
    return sections;
  }

  /**
   * Chunk a section of text with overlap
   */
  private async chunkSection(text: string, metadata: any = {}): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const words = text.split(/\s+/);
    
    if (words.length === 0) {
      return chunks;
    }

    // Estimate tokens (rough approximation: 1 word ≈ 1.3 tokens)
    const estimatedTokensPerWord = 1.3;
    const targetWordCount = Math.floor(CHUNK_CONFIG.targetTokens / estimatedTokensPerWord);
    const overlapWordCount = Math.floor(CHUNK_CONFIG.overlapTokens / estimatedTokensPerWord);
    
    let chunkIndex = 0;
    let i = 0;
    
    while (i < words.length) {
      const chunkWords: string[] = [];
      let tokenCount = 0;
      
      // Add words up to target token count
      while (i < words.length && tokenCount < CHUNK_CONFIG.targetTokens) {
        chunkWords.push(words[i]);
        tokenCount += estimatedTokensPerWord;
        i++;
      }
      
      // Look for sentence boundary
      while (i < words.length && tokenCount < CHUNK_CONFIG.maxTokens) {
        chunkWords.push(words[i]);
        tokenCount += estimatedTokensPerWord;
        
        if (words[i].match(/[.!?]$/)) {
          i++;
          break;
        }
        i++;
      }
      
      const chunkText = chunkWords.join(' ');
      
      if (chunkText.length >= CHUNK_CONFIG.minChunkSize) {
        chunks.push({
          text: chunkText,
          metadata: {
            ...metadata,
            chunk_type: this.detectChunkType(chunkText),
          },
          tokenCount: Math.floor(tokenCount),
          index: chunkIndex++,
        });
      }
      
      // Move back for overlap (if not at end)
      if (i < words.length) {
        i = Math.max(i - overlapWordCount, 0);
      }
    }
    
    return chunks;
  }

  /**
   * Detect the type of content in a chunk
   */
  private detectChunkType(text: string): string {
    // Check for code patterns
    if (text.match(/```[\s\S]*```/) || text.match(/^\s*(function|class|def|interface|const|let|var)\s+/m)) {
      return 'code';
    }
    
    // Check for table patterns
    if (text.match(/\|.*\|.*\|/) || text.match(/^\s*\+[-+]+\+\s*$/m)) {
      return 'table';
    }
    
    // Check for list patterns
    if (text.match(/^[\s]*[-*+•]\s+/m) || text.match(/^[\s]*\d+\.\s+/m)) {
      return 'list';
    }
    
    return 'text';
  }

  /**
   * Truncate text to fit within model limits
   */
  private truncateText(text: string): string {
    const limit = MODEL_LIMITS[this.model as keyof typeof MODEL_LIMITS] || 8191;
    const estimatedTokens = text.length / 4; // Rough estimate
    
    if (estimatedTokens <= limit * 0.9) {
      return text;
    }
    
    // Truncate to approximately 90% of limit
    const targetLength = Math.floor(limit * 0.9 * 4);
    return text.substring(0, targetLength);
  }

  /**
   * Check embedding cache
   */
  private async checkEmbeddingCache(text: string): Promise<EmbeddingResult | null> {
    const hash = this.hashText(text);
    
    try {
      const { data, error } = await supabase
        .from('embedding_cache')
        .select('embedding, embedding_model, usage_count')
        .eq('content_hash', hash)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      // Update usage count and last accessed
      await supabase
        .from('embedding_cache')
        .update({ 
          usage_count: (data.usage_count || 0) + 1,
          last_accessed: new Date().toISOString()
        })
        .eq('content_hash', hash);
      
      return {
        embedding: data.embedding,
        model: data.embedding_model,
        tokenCount: 0, // Not stored in cache
      };
    } catch (error) {
      console.error('Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Cache embedding result
   */
  private async cacheEmbedding(text: string, result: EmbeddingResult): Promise<void> {
    const hash = this.hashText(text);
    
    try {
      await supabase
        .from('embedding_cache')
        .upsert({
          content_hash: hash,
          content_text: text.substring(0, 1000), // Store first 1000 chars for reference
          embedding: result.embedding,
          embedding_model: result.model,
          usage_count: 1,
          last_accessed: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  /**
   * Generate hash for text
   */
  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean old cache entries
   */
  async cleanCache(daysOld: number = 30, minUsageCount: number = 2): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    try {
      const { error } = await supabase
        .from('embedding_cache')
        .delete()
        .lt('last_accessed', cutoffDate.toISOString())
        .lt('usage_count', minUsageCount);
      
      if (error) {
        console.error('Cache cleanup error:', error);
      }
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const embeddingService = new EnhancedEmbeddingService();