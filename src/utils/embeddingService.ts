import { supabase } from './supabase/client';

// Embedding service using OpenAI text-embedding-3-small
export class EmbeddingService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Embeddings will not work.');
    }
  }

  // Generate embedding for text using OpenAI
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-3-small',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Embedding generation failed: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process document for embedding generation
  async processDocumentForEmbedding(documentId: string): Promise<void> {
    try {
      // 1. Get document metadata
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError || !document) {
        throw new Error('Document not found');
      }

      // 2. Check if document has content to embed
      if (!document.content_text && !document.transcription) {
        throw new Error('Document has no content to embed');
      }

      // 3. Use content_text or transcription for embedding
      const textToEmbed = document.content_text || document.transcription || '';
      
      if (!textToEmbed.trim()) {
        throw new Error('No text content available for embedding');
      }

      // 4. Generate embedding
      const embedding = await this.generateEmbedding(textToEmbed);

      // 5. Update document with embedding
      const { error: updateError } = await supabase
        .from('documents')
        .update({ 
          embedding: embedding
        })
        .eq('id', documentId);

      if (updateError) {
        throw updateError;
      }

      console.log(`Successfully generated embedding for document: ${document.title}`);
    } catch (error) {
      console.error('Error processing document for embedding:', error);
      throw error;
    }
  }

  // Get documents that need embedding generation
  async getDocumentsForEmbedding(): Promise<any[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .or('content_text.neq.,transcription.neq.')
      .is('embedding', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching documents for embedding:', error);
      return [];
    }

    return data || [];
  }

  // Process all documents that need embedding
  async processAllDocumentsForEmbedding(): Promise<void> {
    const documents = await this.getDocumentsForEmbedding();
    
    for (const document of documents) {
      try {
        await this.processDocumentForEmbedding(document.id);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to generate embedding for document ${document.id}:`, error);
      }
    }
  }

  // Search documents using vector similarity
  async searchDocuments(query: string, limit: number = 5): Promise<any[]> {
    try {
      // 1. Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // 2. Search for similar documents using vector similarity
      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit
      });

      if (error) {
        console.error('Vector search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService(); 