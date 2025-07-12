import { NextRequest, NextResponse } from 'next/server';
import { ragMiddleware } from '@/utils/ragMiddleware';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query, 
      userPreferences = {},
      contextHistory = [],
      includeAnalysis = true 
    } = body;

    // Validate required parameters
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate context history
    if (!Array.isArray(contextHistory)) {
      return NextResponse.json(
        { error: 'contextHistory must be an array of strings' },
        { status: 400 }
      );
    }

    // Process query through intelligent middleware
    const middlewareResponse = await ragMiddleware.processQuery(
      query.trim(),
      userPreferences,
      contextHistory
    );

    // Prepare response based on includeAnalysis flag
    const response: any = {
      success: true,
      data: {
        query: middlewareResponse.queryContext.originalQuery,
        results: middlewareResponse.context.results,
        totalResults: middlewareResponse.context.totalResults,
        searchStrategy: middlewareResponse.context.searchStrategy,
        confidence: middlewareResponse.context.confidence,
        recommendations: middlewareResponse.recommendations,
        performance: middlewareResponse.performance,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '3.0.0', // Intelligent middleware version
      }
    };

    // Include detailed analysis if requested
    if (includeAnalysis) {
      response.data.analysis = {
        queryContext: middlewareResponse.queryContext,
        processingSteps: [
          {
            step: 'Query Analysis',
            duration: middlewareResponse.performance.queryAnalysisTime,
            output: {
              intent: middlewareResponse.queryContext.intent,
              complexity: middlewareResponse.queryContext.complexity,
              domain: middlewareResponse.queryContext.domain,
            }
          },
          {
            step: 'Search Execution',
            duration: middlewareResponse.performance.searchTime,
            output: {
              strategy: middlewareResponse.context.searchStrategy,
              resultsFound: middlewareResponse.context.totalResults,
            }
          },
          {
            step: 'Post Processing',
            duration: middlewareResponse.performance.postProcessingTime,
            output: {
              recommendationsGenerated: middlewareResponse.recommendations.length,
            }
          }
        ]
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Intelligent search API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during intelligent search',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query');
    const includeAnalysis = searchParams.get('analysis') !== 'false';
    
    // Parse user preferences from query parameters
    const userPreferences: any = {};
    
    if (searchParams.get('maxResults')) {
      userPreferences.maxResults = parseInt(searchParams.get('maxResults')!);
    }
    
    if (searchParams.get('threshold')) {
      userPreferences.similarityThreshold = parseFloat(searchParams.get('threshold')!);
    }
    
    // Parse filters
    const filters: any = {};
    if (searchParams.get('type')) {
      filters.type = searchParams.get('type');
    }
    if (searchParams.get('tags')) {
      filters.tags = searchParams.get('tags')?.split(',').map(tag => tag.trim());
    }
    if (Object.keys(filters).length > 0) {
      userPreferences.filters = filters;
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter (q or query) is required' },
        { status: 400 }
      );
    }

    const middlewareResponse = await ragMiddleware.processQuery(
      query,
      userPreferences,
      [] // No context history for GET requests
    );

    const response = {
      success: true,
      data: {
        query: middlewareResponse.queryContext.originalQuery,
        results: middlewareResponse.context.results,
        totalResults: middlewareResponse.context.totalResults,
        searchStrategy: middlewareResponse.context.searchStrategy,
        confidence: middlewareResponse.context.confidence,
        recommendations: middlewareResponse.recommendations,
        performance: middlewareResponse.performance,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '3.0.0',
      }
    };

    if (includeAnalysis) {
      (response.data as any).analysis = {
        intent: middlewareResponse.queryContext.intent,
        complexity: middlewareResponse.queryContext.complexity,
        domain: middlewareResponse.queryContext.domain,
        suggestedStrategy: middlewareResponse.queryContext.suggestedStrategy,
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Intelligent search GET error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during intelligent search',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS support
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}