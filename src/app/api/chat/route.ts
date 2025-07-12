import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';
import { LLMService, LLMProvider } from '@/utils/llmService';
import { enhancedRagService } from '@/utils/enhancedRagService';
import { ragMiddleware } from '@/utils/ragMiddleware';

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  // Validate inputs
  if (!vectorA || !vectorB || !Array.isArray(vectorA) || !Array.isArray(vectorB)) {
    return 0;
  }
  
  if (vectorA.length !== vectorB.length) {
    console.warn(`Vector length mismatch: ${vectorA.length} vs ${vectorB.length}`);
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

export async function POST(request: NextRequest) {
  try {
    const { 
      message, 
      conversationId, 
      tags, 
      types, 
      provider = 'openai', 
      model, 
      useEnhancedRag = true,
      useIntelligentMiddleware = true,
      contextHistory = []
    } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    let relevantDocs = [];
    let searchContext = null;
    let middlewareResponse = null;
    let searchError = null;

    // Use intelligent middleware if enabled (highest priority)
    if (useIntelligentMiddleware) {
      try {
        const userPreferences = {
          maxResults: 5,
          filters: {
            type: types && types.length > 0 ? types[0] : undefined,
            tags: tags && tags.length > 0 ? tags : undefined,
          },
        };

        middlewareResponse = await ragMiddleware.processQuery(
          message,
          userPreferences,
          contextHistory
        );

        searchContext = middlewareResponse.context;
        
        // Convert middleware results to legacy format
        relevantDocs = middlewareResponse.context.results.map(result => ({
          id: result.id,
          title: result.title,
          type: result.type,
          content_text: result.content,
          transcription: result.chunkText || '',
          tags: result.tags,
          similarity: result.similarity,
          chunkId: result.chunkId,
          context: result.context,
        }));

        console.log('Intelligent middleware completed:', {
          query: message,
          strategy: middlewareResponse.context.searchStrategy,
          queryIntent: middlewareResponse.queryContext.intent.type,
          complexity: middlewareResponse.queryContext.complexity.level,
          resultsCount: middlewareResponse.context.results.length,
          confidence: middlewareResponse.context.confidence,
          totalTime: middlewareResponse.performance.totalTime,
        });

      } catch (error) {
        console.error('Intelligent middleware error:', error);
        searchError = error;
        // Fall back to enhanced RAG
      }
    }
    
    // Fall back to enhanced RAG service if middleware failed or disabled
    if (!useIntelligentMiddleware || (searchError && useEnhancedRag)) {
      try {
        const searchOptions = {
          query: message,
          searchType: 'hybrid' as const,
          maxResults: 5,
          similarityThreshold: 0.1,
          filters: {
            type: types && types.length > 0 ? types[0] : undefined, // Take first type for now
            tags: tags && tags.length > 0 ? tags : undefined,
          },
          includeContext: true,
          contextWindow: 2,
        };

        searchContext = await enhancedRagService.search(searchOptions);
        
        // Convert enhanced search results to legacy format
        relevantDocs = searchContext.results.map(result => ({
          id: result.id,
          title: result.title,
          type: result.type,
          content_text: result.content,
          transcription: result.chunkText || '',
          tags: result.tags,
          similarity: result.similarity,
          chunkId: result.chunkId,
          context: result.context,
        }));

        console.log('Enhanced RAG search completed:', {
          query: message,
          strategy: searchContext.searchStrategy,
          resultsCount: searchContext.results.length,
          confidence: searchContext.confidence,
          processingTime: searchContext.processingTime,
        });

      } catch (error) {
        console.error('Enhanced RAG search error:', error);
        searchError = error;
        // Fall back to legacy search
      }
    }

    // Fall back to legacy search if all enhanced methods failed
    if ((!useIntelligentMiddleware && !useEnhancedRag) || (searchError && !middlewareResponse)) {
      console.log('Using legacy search method');
      
      // Generate embedding for the user's message to find relevant documents
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: message,
          model: 'text-embedding-3-small',
        }),
      });

      if (!embeddingResponse.ok) {
        throw new Error('Failed to generate message embedding');
      }

      const embeddingData = await embeddingResponse.json();
      const messageEmbedding = embeddingData.data[0].embedding;
      
      if ((tags && tags.length > 0) || (types && types.length > 0)) {
        // Build query with filters
        let query = supabaseServer
          .from('documents')
          .select('id, title, type, content_text, transcription, tags, created_at, embedding');
        
        // Add tag filter if provided
        if (tags && tags.length > 0) {
          query = query.overlaps('tags', tags);
        }
        
        // Add type filter if provided
        if (types && types.length > 0) {
          query = query.in('type', types);
        }
        
        const { data: filteredDocs, error: filterError } = await query;
          
        if (filterError) {
          console.error('Document filtering error:', filterError);
          searchError = filterError;
        } else if (filteredDocs && filteredDocs.length > 0) {
          // Calculate similarity for filtered documents
          const docsWithSimilarity = filteredDocs
            .filter(doc => doc.embedding) // Only docs with embeddings
            .map(doc => {
              try {
                // Handle embedding whether it's array or string
                let embedding;
                if (Array.isArray(doc.embedding)) {
                  embedding = doc.embedding;
                } else if (typeof doc.embedding === 'string') {
                  try {
                    embedding = JSON.parse(doc.embedding);
                  } catch {
                    console.warn(`Failed to parse embedding for doc ${doc.id}`);
                    return null;
                  }
                } else {
                  console.warn(`Invalid embedding type for doc ${doc.id}: ${typeof doc.embedding}`);
                  return null;
                }
                
                // Calculate cosine similarity
                const similarity = calculateCosineSimilarity(messageEmbedding, embedding);
                
                return {
                  ...doc,
                  similarity
                };
              } catch (error) {
                console.warn(`Error calculating similarity for doc ${doc.id}:`, error);
                return null;
              }
            })
            .filter(doc => doc !== null && doc.similarity > 0.1)
            .sort((a, b) => (b?.similarity || 0) - (a?.similarity || 0))
            .slice(0, 5);
            
          relevantDocs = docsWithSimilarity;
        }
      } else {
        // No tag filtering, use regular vector search
        const { data: vectorDocs, error: vectorError } = await supabaseServer.rpc('match_documents', {
          query_embedding: messageEmbedding,
          match_threshold: 0.1,
          match_count: 5
        });
        
        relevantDocs = vectorDocs;
        searchError = vectorError;
      }
    }

    if (searchError) {
      console.error('Search error:', searchError);
    }

    // Debug logging
    console.log('=== CHAT API DEBUG ===');
    console.log('User message:', message);
    console.log('Filter tags:', tags);
    console.log('Filter types:', types);
    console.log('Relevant docs found:', relevantDocs?.length || 0);
    
    if (relevantDocs && relevantDocs.length > 0) {
      console.log('Doc details:', relevantDocs.map((doc: any) => ({
        title: doc.title,
        type: doc.type,
        hasContent: !!(doc.content_text || doc.transcription),
        contentLength: (doc.content_text || doc.transcription || '').length,
        similarity: doc.similarity,
        hasEmbedding: !!(doc.embedding && (Array.isArray(doc.embedding) || typeof doc.embedding === 'string'))
      })));
    }

    // Prepare context from relevant documents with smart chunking
    const context = relevantDocs?.map((doc: any) => {
      const fullContent = doc.content_text || doc.transcription || '';
      // Limit content to ~50K characters to avoid token limits
      const maxContentLength = 50000;
      const content = fullContent.length > maxContentLength 
        ? fullContent.substring(0, maxContentLength) + '\n\n[Content truncated due to length - showing first 50,000 characters]'
        : fullContent;
      
      return {
        title: doc.title,
        type: doc.type,
        content,
        similarity: doc.similarity,
        fullContentLength: fullContent.length
      };
    }) || [];
    
    console.log('Context prepared:', context.length, 'documents');
    console.log('Context content preview:', context.map((c: any) => ({
      title: c.title,
      contentLength: c.content.length,
      contentPreview: c.content.substring(0, 200) + '...'
    })));
    console.log('=== END DEBUG ===');

    // Build system prompt with context
    const filterInfo = [];
    if (tags && tags.length > 0) {
      filterInfo.push(`tags: ${tags.join(', ')}`);
    }
    if (types && types.length > 0) {
      filterInfo.push(`document types: ${types.join(', ')}`);
    }
    
    const contextFilterInfo = filterInfo.length > 0 
      ? `\n\n[Context Filter: This conversation is focused on documents with ${filterInfo.join(' and ')}. All provided documents have been filtered to match these criteria.]`
      : '';
    
    const systemPrompt = `You are an intelligent knowledge management assistant. You MUST ONLY use information from the provided document context below. DO NOT use any external knowledge or make assumptions beyond what is explicitly stated in the documents.${contextFilterInfo}

${context.length > 0 ? `Context from documents:
${context.map((doc: any, index: number) => `
Document ${index + 1}: ${doc.title} (${doc.type})
Content: ${doc.content}
${doc.fullContentLength > 50000 ? `\n[Note: This document was ${doc.fullContentLength} characters long and has been truncated for analysis]` : ''}
Similarity: ${Math.round(doc.similarity * 100)}%
`).join('\n')}` : 'No relevant documents found in the knowledge base.'}

CRITICAL INSTRUCTIONS:
- ONLY use information from the provided documents above
- If no relevant documents are provided, clearly state that no relevant information was found
- DO NOT make up information or use external knowledge
- DO NOT reference organizations, projects, or concepts not mentioned in the provided documents
- When citing information, always reference the specific document title
- If asked about something not covered in the documents, explicitly state "This information is not available in the provided documents"
- Focus on analyzing and summarizing ONLY what is explicitly stated in the document content`;

    // Determine which API key to use based on provider
    const apiKey = provider === 'claude' 
      ? process.env.ANTHROPIC_API_KEY 
      : process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(`API key not configured for provider: ${provider}`);
    }

    // Initialize LLM service with selected provider
    const llmService = new LLMService({
      provider: provider as LLMProvider,
      apiKey,
      model,
      maxTokens: 2000,
      temperature: 0.7
    });

    // Generate response using selected LLM provider
    const llmResponse = await llmService.generateResponse(systemPrompt, message);
    const aiResponse = llmResponse.content;

    // Store conversation in database (optional - you can add a conversations table)
    // For now, we'll just return the response with context

    return NextResponse.json({
      response: aiResponse,
      context: context,
      conversationId: conversationId || `conv_${Date.now()}`,
      timestamp: new Date().toISOString(),
      provider: provider,
      model: llmResponse.model,
      usage: llmResponse.usage,
      enhanced: useEnhancedRag ? {
        searchStrategy: searchContext?.searchStrategy,
        confidence: searchContext?.confidence,
        processingTime: searchContext?.processingTime,
        totalResults: searchContext?.totalResults,
      } : null,
      intelligent: useIntelligentMiddleware && middlewareResponse ? {
        queryIntent: middlewareResponse.queryContext.intent,
        complexity: middlewareResponse.queryContext.complexity,
        domain: middlewareResponse.queryContext.domain,
        searchStrategy: middlewareResponse.context.searchStrategy,
        confidence: middlewareResponse.context.confidence,
        recommendations: middlewareResponse.recommendations,
        performance: middlewareResponse.performance,
      } : null
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}