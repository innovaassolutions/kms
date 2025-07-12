import { NextRequest, NextResponse } from 'next/server';
import { enhancedRagService, SearchOptions } from '@/utils/enhancedRagService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query, 
      searchType = 'hybrid',
      maxResults = 10,
      similarityThreshold = 0.3,
      filters = {},
      includeContext = false,
      contextWindow = 2 
    } = body;

    // Validate required parameters
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate search type
    const validSearchTypes = ['hybrid', 'semantic', 'keyword', 'chunk-based'];
    if (!validSearchTypes.includes(searchType)) {
      return NextResponse.json(
        { error: `Invalid search type. Must be one of: ${validSearchTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Prepare search options
    const searchOptions: SearchOptions = {
      query: query.trim(),
      searchType,
      maxResults: Math.min(Math.max(1, maxResults), 50), // Limit between 1-50
      similarityThreshold: Math.min(Math.max(0.1, similarityThreshold), 0.9), // Limit between 0.1-0.9
      filters: {
        type: filters.type,
        tags: Array.isArray(filters.tags) ? filters.tags : undefined,
        dateRange: filters.dateRange ? {
          start: new Date(filters.dateRange.start),
          end: new Date(filters.dateRange.end)
        } : undefined,
      },
      includeContext: Boolean(includeContext),
      contextWindow: Math.min(Math.max(1, contextWindow), 5), // Limit between 1-5
    };

    // Execute search
    const searchResults = await enhancedRagService.search(searchOptions);

    // Return results with metadata
    return NextResponse.json({
      success: true,
      data: searchResults,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '2.0.0', // Enhanced RAG version
      }
    });

  } catch (error) {
    console.error('Enhanced search API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during search',
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
    const searchType = searchParams.get('type') || 'hybrid';
    const maxResults = parseInt(searchParams.get('limit') || '10');
    const similarityThreshold = parseFloat(searchParams.get('threshold') || '0.3');
    const includeContext = searchParams.get('context') === 'true';
    
    // Parse filters from query parameters
    const filters: any = {};
    if (searchParams.get('docType')) {
      filters.type = searchParams.get('docType');
    }
    if (searchParams.get('tags')) {
      filters.tags = searchParams.get('tags')?.split(',').map(tag => tag.trim());
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter (q or query) is required' },
        { status: 400 }
      );
    }

    const searchOptions: SearchOptions = {
      query,
      searchType: searchType as any,
      maxResults,
      similarityThreshold,
      filters,
      includeContext,
    };

    const searchResults = await enhancedRagService.search(searchOptions);

    return NextResponse.json({
      success: true,
      data: searchResults,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '2.0.0',
      }
    });

  } catch (error) {
    console.error('Enhanced search GET error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during search',
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