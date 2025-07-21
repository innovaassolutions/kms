import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';

export const maxDuration = 60; // 1 minute timeout
export const dynamic = 'force-dynamic';

// Simpler approach: just mark the chunks as ready for manual processing
export async function POST(request: NextRequest) {
  try {
    const { action, sessionId, finalPath, chunkCount, metadata } = await request.json();

    if (action === 'mark_ready') {
      console.log(`Marking ${chunkCount} chunks as ready for processing: ${sessionId}`);
      console.log(`Final path: ${finalPath}, Metadata:`, metadata);
      
      // Verify chunks exist
      const { data: existingChunks, error: listError } = await supabaseServer.storage
        .from('documents')
        .list(`chunks/${sessionId}`, { limit: 1000 });
      
      if (listError) {
        throw new Error(`Failed to list chunks: ${JSON.stringify(listError)}`);
      }
      
      const actualChunkCount = existingChunks?.length || 0;
      console.log(`Found ${actualChunkCount} chunks, expected ${chunkCount}`);
      
      if (actualChunkCount !== chunkCount) {
        throw new Error(`Chunk count mismatch: found ${actualChunkCount}, expected ${chunkCount}`);
      }

      // Create database record for chunked upload with metadata if provided
      if (metadata) {
        console.log('Creating database record for chunked upload...');
        console.log('Final path for DB record:', finalPath);
        const { data: insertData, error: insertError } = await supabaseServer
          .from('documents')
          .insert([{
            title: metadata.title,
            type: metadata.type,
            tags: metadata.tags,
            file_path: finalPath || null,
            uploaded_by: metadata.uploaded_by,
            media_type: metadata.media_type,
            transcription_status: metadata.transcription_status,
            created_at: new Date().toISOString(),
          }])
          .select('id');
        
        if (insertError) {
          console.error('Failed to create database record:', insertError);
          throw new Error(`Failed to create database record: ${insertError.message}`);
        }

        const documentId = insertData?.[0]?.id;
        console.log(`Database record created with ID: ${documentId}`);
      }

      // Return success - the background processing will handle combining
      return NextResponse.json({ 
        success: true, 
        message: `${chunkCount} chunks ready for background processing`,
        chunksPath: `chunks/${sessionId}`,
        finalPath: finalPath
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: mark_ready' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Chunk marking error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'Simple chunk processor ready' });
}