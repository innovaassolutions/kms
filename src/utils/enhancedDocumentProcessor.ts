import { createClient } from '@supabase/supabase-js';
import { embeddingService, DocumentChunk } from './enhancedEmbeddingService';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import * as fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface ProcessingOptions {
  enableChunking?: boolean;
  generateEmbeddings?: boolean;
  updateExisting?: boolean;
  priority?: number;
}

export interface ProcessingResult {
  success: boolean;
  document: any;
  chunks: DocumentChunk[];
  errorMessage?: string;
  processingStats: {
    textLength: number;
    chunkCount: number;
    embeddingCount: number;
    processingTime: number;
  };
}

export class EnhancedDocumentProcessor {
  
  /**
   * Process a document with enhanced capabilities
   */
  async processDocument(
    documentId: string, 
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const defaultOptions = {
      enableChunking: true,
      generateEmbeddings: true,
      updateExisting: false,
      priority: 0,
    };
    
    const opts = { ...defaultOptions, ...options };
    
    try {
      // Get document details
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (docError || !document) {
        throw new Error(`Document not found: ${documentId}`);
      }
      
      // Update processing status
      await this.updateProcessingStatus(documentId, 'processing');
      
      // Extract text if not already done
      let contentText = document.content_text;
      if (!contentText) {
        contentText = await this.extractText(document);
        if (contentText) {
          await this.updateDocumentContent(documentId, contentText);
        }
      }
      
      if (!contentText) {
        throw new Error('No text content could be extracted');
      }
      
      let chunks: DocumentChunk[] = [];
      let embeddingCount = 0;
      
      if (opts.enableChunking) {
        // Generate chunks
        chunks = await embeddingService.chunkDocument(contentText, {
          document_id: documentId,
          document_type: document.type,
          document_title: document.title,
        });
        
        // Store chunks in database
        await this.storeDocumentChunks(documentId, chunks);
        
        if (opts.generateEmbeddings) {
          // Generate embeddings for chunks
          embeddingCount = await this.generateChunkEmbeddings(documentId, chunks);
        }
      }
      
      // Generate document-level embedding if not chunking or as fallback
      if (!opts.enableChunking || chunks.length === 0) {
        const docEmbedding = await embeddingService.generateEmbedding(contentText);
        await this.updateDocumentEmbedding(documentId, docEmbedding.embedding);
        embeddingCount = 1;
      }
      
      // Update processing metadata
      await this.updateProcessingMetadata(documentId, {
        chunk_count: chunks.length,
        embedding_count: embeddingCount,
        processing_completed_at: new Date().toISOString(),
        content_length: contentText.length,
      });
      
      // Update processing status to completed
      await this.updateProcessingStatus(documentId, 'completed');
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        document,
        chunks,
        processingStats: {
          textLength: contentText.length,
          chunkCount: chunks.length,
          embeddingCount,
          processingTime,
        },
      };
      
    } catch (error) {
      console.error(`Error processing document ${documentId}:`, error);
      
      await this.updateProcessingStatus(documentId, 'error', error.message);
      
      return {
        success: false,
        document: null,
        chunks: [],
        errorMessage: error.message,
        processingStats: {
          textLength: 0,
          chunkCount: 0,
          embeddingCount: 0,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }
  
  /**
   * Extract text from various document formats
   */
  private async extractText(document: any): Promise<string> {
    if (!document.file_path) {
      return document.content_text || '';
    }
    
    try {
      // Download file from Supabase storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path);
      
      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`);
      }
      
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const fileName = document.file_path.toLowerCase();
      
      if (fileName.endsWith('.pdf')) {
        return await this.extractTextFromPdf(buffer);
      } else if (fileName.endsWith('.docx')) {
        return await this.extractTextFromDocx(buffer);
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        return buffer.toString('utf-8');
      } else {
        throw new Error(`Unsupported file format: ${fileName}`);
      }
      
    } catch (error) {
      console.error('Text extraction error:', error);
      throw error;
    }
  }
  
  /**
   * Extract text from PDF
   */
  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }
  
  /**
   * Extract text from DOCX
   */
  private async extractTextFromDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('DOCX extraction error:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }
  
  /**
   * Store document chunks in database
   */
  private async storeDocumentChunks(documentId: string, chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    
    // Delete existing chunks
    await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);
    
    // Insert new chunks
    const chunkInserts = chunks.map(chunk => ({
      document_id: documentId,
      chunk_index: chunk.index,
      chunk_text: chunk.text,
      chunk_metadata: chunk.metadata,
      token_count: chunk.tokenCount,
      start_page: chunk.metadata.start_page,
      end_page: chunk.metadata.end_page,
    }));
    
    const { error } = await supabase
      .from('document_chunks')
      .insert(chunkInserts);
    
    if (error) {
      throw new Error(`Failed to store chunks: ${error.message}`);
    }
  }
  
  /**
   * Generate and store embeddings for chunks
   */
  private async generateChunkEmbeddings(documentId: string, chunks: DocumentChunk[]): Promise<number> {
    if (chunks.length === 0) return 0;
    
    const chunkTexts = chunks.map(chunk => chunk.text);
    const embeddings = await embeddingService.generateBatchEmbeddings(chunkTexts);
    
    // Update chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddings[i];
      if (embedding) {
        const { error } = await supabase
          .from('document_chunks')
          .update({
            embedding: embedding.embedding,
            embedding_model: embedding.model,
          })
          .eq('document_id', documentId)
          .eq('chunk_index', chunks[i].index);
        
        if (error) {
          console.error(`Failed to update chunk ${i} embedding:`, error);
        }
      }
    }
    
    return embeddings.length;
  }
  
  /**
   * Update document with extracted content
   */
  private async updateDocumentContent(documentId: string, contentText: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({
        content_text: contentText,
        last_processed_at: new Date().toISOString(),
      })
      .eq('id', documentId);
    
    if (error) {
      throw new Error(`Failed to update document content: ${error.message}`);
    }
  }
  
  /**
   * Update document with embedding
   */
  private async updateDocumentEmbedding(documentId: string, embedding: number[]): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({
        embedding: embedding,
        embedding_model: 'text-embedding-3-small',
        embedding_version: 1,
      })
      .eq('id', documentId);
    
    if (error) {
      throw new Error(`Failed to update document embedding: ${error.message}`);
    }
  }
  
  /**
   * Update processing metadata
   */
  private async updateProcessingMetadata(documentId: string, metadata: any): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({
        processing_metadata: metadata,
        chunk_count: metadata.chunk_count,
        last_processed_at: new Date().toISOString(),
      })
      .eq('id', documentId);
    
    if (error) {
      throw new Error(`Failed to update processing metadata: ${error.message}`);
    }
  }
  
  /**
   * Update processing status
   */
  private async updateProcessingStatus(
    documentId: string, 
    status: 'pending' | 'processing' | 'completed' | 'error',
    errorMessage?: string
  ): Promise<void> {
    const updates: any = {
      transcription_status: status, // Reusing this field for now
      last_processed_at: new Date().toISOString(),
    };
    
    if (errorMessage) {
      updates.processing_error = errorMessage;
    }
    
    const { error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId);
    
    if (error) {
      console.error(`Failed to update processing status: ${error.message}`);
    }
  }
  
  /**
   * Process multiple documents in batch
   */
  async processBatch(
    documentIds: string[], 
    options: ProcessingOptions = {},
    concurrency: number = 3
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < documentIds.length; i += concurrency) {
      const batch = documentIds.slice(i, i + concurrency);
      
      const batchPromises = batch.map(docId => 
        this.processDocument(docId, options)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            document: null,
            chunks: [],
            errorMessage: result.reason?.message || 'Unknown error',
            processingStats: {
              textLength: 0,
              chunkCount: 0,
              embeddingCount: 0,
              processingTime: 0,
            },
          });
        }
      }
      
      // Add delay between batches
      if (i + concurrency < documentIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
  
  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<any> {
    const { data: stats, error } = await supabase
      .from('documents')
      .select('processing_metadata, chunk_count, transcription_status')
      .not('processing_metadata', 'is', null);
    
    if (error) {
      throw new Error(`Failed to get processing stats: ${error.message}`);
    }
    
    const totalDocs = stats?.length || 0;
    const completedDocs = stats?.filter(s => s.transcription_status === 'completed').length || 0;
    const totalChunks = stats?.reduce((sum, s) => sum + (s.chunk_count || 0), 0) || 0;
    
    return {
      totalDocuments: totalDocs,
      completedDocuments: completedDocs,
      processingRate: totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0,
      totalChunks,
      averageChunksPerDoc: totalDocs > 0 ? totalChunks / totalDocs : 0,
    };
  }
}

// Export singleton instance
export const enhancedDocumentProcessor = new EnhancedDocumentProcessor();