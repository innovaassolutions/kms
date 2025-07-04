import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';
import { embeddingService } from '@/utils/embeddingService';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting embedding fix process...');
    
    // 1. Clear all existing embeddings (they're corrupted as strings)
    const { error: clearError } = await supabaseServer
      .from('documents')
      .update({ embedding: null })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (clearError) {
      throw new Error(`Failed to clear embeddings: ${clearError.message}`);
    }
    
    console.log('Cleared all existing embeddings');

    // 2. Get all documents with content
    const { data: documents, error: fetchError } = await supabaseServer
      .from('documents')
      .select('id, title, content_text, transcription')
      .or('content_text.neq.,transcription.neq.');

    if (fetchError) {
      throw new Error(`Failed to fetch documents: ${fetchError.message}`);
    }

    console.log(`Found ${documents?.length || 0} documents to process`);

    const results = {
      processed: 0,
      errors: 0,
      details: [] as string[]
    };

    // 3. Generate embeddings for each document
    for (const doc of documents || []) {
      try {
        const textToEmbed = doc.content_text || doc.transcription || '';
        
        if (!textToEmbed.trim()) {
          results.details.push(`Skipped ${doc.title}: No content`);
          continue;
        }

        console.log(`Generating embedding for: ${doc.title}`);
        
        // Generate new embedding
        const embedding = await embeddingService.generateEmbedding(textToEmbed);
        
        // Store embedding as proper array
        const { error: updateError } = await supabaseServer
          .from('documents')
          .update({ embedding })
          .eq('id', doc.id);

        if (updateError) {
          throw new Error(`Failed to update ${doc.title}: ${updateError.message}`);
        }

        results.processed++;
        results.details.push(`✅ ${doc.title}: Generated embedding (${embedding.length} dimensions)`);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        results.errors++;
        const errorMsg = `❌ ${doc.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.details.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log('Embedding fix process completed');

    return NextResponse.json({
      success: true,
      message: 'Embedding fix process completed',
      results
    });

  } catch (error) {
    console.error('Embedding fix error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}