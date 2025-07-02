import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5, threshold = 0.7 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Generate embedding for the search query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-3-small',
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search for similar documents using vector similarity
    const { data: searchResults, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) {
      console.error('Vector search error:', error);
      return NextResponse.json(
        { error: 'Search failed', details: error.message },
        { status: 500 }
      );
    }

    // Format the results
    const formattedResults = searchResults?.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      media_type: doc.media_type,
      tags: doc.tags || [],
      similarity: doc.similarity,
      content_preview: doc.content_text ? 
        doc.content_text.substring(0, 200) + (doc.content_text.length > 200 ? '...' : '') :
        doc.transcription ? 
        doc.transcription.substring(0, 200) + (doc.transcription.length > 200 ? '...' : '') :
        'No content available',
      created_at: doc.created_at,
      file_path: doc.file_path
    })) || [];

    return NextResponse.json({
      results: formattedResults,
      total: formattedResults.length,
      query: query
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get all documents for display (without search)
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, title, type, media_type, tags, created_at, content_text, transcription')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    const formattedDocuments = documents?.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      media_type: doc.media_type,
      tags: doc.tags || [],
      content_preview: doc.content_text ? 
        doc.content_text.substring(0, 200) + (doc.content_text.length > 200 ? '...' : '') :
        doc.transcription ? 
        doc.transcription.substring(0, 200) + (doc.transcription.length > 200 ? '...' : '') :
        'No content available',
      created_at: doc.created_at
    })) || [];

    return NextResponse.json({
      documents: formattedDocuments,
      total: formattedDocuments.length
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 