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
      contextHistory = [],
      useMultiModal = true,
      includeWebSources = true,
      maxResults = 15
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
          maxResults: maxResults,
          similarityThreshold: 0.3, // Increased for better relevance
          filters: {
            type: types && types.length > 0 ? types[0] : undefined, // Take first type for now
            tags: tags && tags.length > 0 ? tags : undefined,
          },
          includeContext: true,
          contextWindow: 3, // Increased context window
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
            .filter(doc => doc !== null && doc.similarity > 0.3) // Increased threshold
            .sort((a, b) => (b?.similarity || 0) - (a?.similarity || 0))
            .slice(0, maxResults);
            
          relevantDocs = docsWithSimilarity;
        }
      } else {
        // No tag filtering, use regular vector search
        const { data: vectorDocs, error: vectorError } = await supabaseServer.rpc('match_documents', {
          query_embedding: messageEmbedding,
          match_threshold: 0.3, // Increased for better relevance
          match_count: maxResults
        });
        
        relevantDocs = vectorDocs;
        searchError = vectorError;
      }
    }

    if (searchError) {
      console.error('Search error:', searchError);
    }

    // Multi-modal search integration
    let multiModalResults: any[] = [];
    let webSourceResults: any[] = [];
    
    if (useMultiModal) {
      try {
        const multiModalResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || 'http://localhost:3001'}/kms/api/search-multimodal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: message,
            searchMode: 'multimodal',
            maxResults: Math.floor(maxResults / 2), // Reserve half for documents
            filters: {
              documentTypes: types,
              tags: tags,
            },
            includeFrameContext: true,
          }),
        });

        if (multiModalResponse.ok) {
          const multiModalData = await multiModalResponse.json();
          if (multiModalData.success && multiModalData.data?.results) {
            multiModalResults = multiModalData.data.results;
            console.log('Multi-modal search found:', multiModalResults.length, 'results');
          }
        }
      } catch (error) {
        console.error('Multi-modal search error:', error);
      }
    }

    // Web sources search integration
    if (includeWebSources) {
      try {
        // Search for crawled web pages
        const { data: webPages, error: webError } = await supabaseServer
          .from('crawled_pages')
          .select('id, url, title, content, domain, crawled_at, embedding')
          .not('embedding', 'is', null)
          .limit(Math.floor(maxResults / 3)); // Reserve third for web sources
        
        if (!webError && webPages && webPages.length > 0) {
          // Calculate similarities for web pages
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

          if (embeddingResponse.ok) {
            const embeddingData = await embeddingResponse.json();
            const messageEmbedding = embeddingData.data[0].embedding;
            
            webSourceResults = webPages
              .map(page => {
                const similarity = calculateCosineSimilarity(messageEmbedding, page.embedding);
                return {
                  id: page.id,
                  title: page.title || page.url,
                  type: 'web_page',
                  content: page.content,
                  url: page.url,
                  domain: page.domain,
                  similarity,
                  crawledAt: page.crawled_at,
                };
              })
              .filter(page => page.similarity > 0.3) // Higher threshold for web content
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, 5);
              
            console.log('Web sources found:', webSourceResults.length, 'relevant pages');
          }
        }
      } catch (error) {
        console.error('Web sources search error:', error);
      }
    }

    // Combine all results
    const allResults = [
      ...(relevantDocs || []),
      ...multiModalResults.map((result: any) => ({
        id: result.id,
        title: result.title,
        type: result.type,
        content_text: result.content,
        transcription: result.type === 'video_frame' ? `Frame at ${result.timestamp}s: ${result.content}` : result.content,
        similarity: result.similarity,
        frameUrl: result.frameUrl,
        timestamp: result.timestamp,
        tags: result.tags || [],
      })),
      ...webSourceResults.map((result: any) => ({
        id: result.id,
        title: result.title,
        type: 'web_source',
        content_text: result.content,
        transcription: '',
        similarity: result.similarity,
        url: result.url,
        domain: result.domain,
        tags: [],
      })),
    ];

    // Sort by similarity and limit to maxResults
    relevantDocs = allResults
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, maxResults);

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
    
    const systemPrompt = `You are an advanced AI assistant with access to a comprehensive knowledge base including documents, video content, and web resources. Your role is to provide intelligent, helpful, and accurate responses based primarily on the provided sources.${contextFilterInfo}

${context.length > 0 ? `Context from your knowledge base:
${context.map((doc: any, index: number) => {
  let sourceInfo = `Document ${index + 1}: ${doc.title} (${doc.type})`;
  if (doc.type === 'video_frame') {
    sourceInfo += ` - Video frame at ${doc.timestamp || 'N/A'}s`;
  } else if (doc.type === 'web_source') {
    sourceInfo += ` - Web page from ${doc.domain || 'N/A'}`;
  }
  return `
${sourceInfo}
Content: ${doc.content}
${doc.fullContentLength > 50000 ? `\n[Note: This document was ${doc.fullContentLength} characters long and has been truncated for analysis]` : ''}
${doc.frameUrl ? `Visual content: ${doc.frameUrl}` : ''}
${doc.url ? `Source URL: ${doc.url}` : ''}
Relevance: ${Math.round(doc.similarity * 100)}%
`;
}).join('\n')}` : 'No directly relevant documents found in the knowledge base for this specific query.'}

RESPONSE GUIDELINES:
- Prioritize information from the provided sources above, citing specific documents, video timestamps, or web sources when relevant
- You may use your general knowledge to provide helpful context, explanations, and additional insights that enhance understanding
- When information from sources seems incomplete, you can provide additional context while clearly distinguishing between source content and general knowledge
- For technical topics, provide comprehensive explanations that combine source material with broader technical understanding
- If sources contain code, diagrams, or technical content, analyze and explain them thoroughly
- Be conversational and helpful, avoiding overly restrictive or robotic responses
- When sources are limited, acknowledge this but still provide the most helpful response possible
- For visual content from videos, describe what was detected and its relevance to the query`;

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
      maxTokens: 4000, // Increased for more comprehensive responses
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