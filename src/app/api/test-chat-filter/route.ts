import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';

export async function POST(request: NextRequest) {
  try {
    const { tags, types } = await request.json();
    
    console.log('Testing chat filter with:', { tags, types });
    
    // Build query with filters (same logic as chat API)
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
      return NextResponse.json({ error: filterError.message }, { status: 500 });
    }
    
    const analysis = (filteredDocs || []).map(doc => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      tags: doc.tags,
      hasContent: !!(doc.content_text || doc.transcription),
      hasEmbedding: !!doc.embedding,
      embeddingType: typeof doc.embedding,
      embeddingIsArray: Array.isArray(doc.embedding),
      embeddingLength: doc.embedding?.length || 0
    }));
    
    return NextResponse.json({
      filterCriteria: { tags, types },
      totalFound: filteredDocs?.length || 0,
      documents: analysis,
      wouldPassEmbeddingFilter: analysis.filter(doc => doc.embeddingIsArray).length
    });
    
  } catch (error) {
    console.error('Test filter error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}