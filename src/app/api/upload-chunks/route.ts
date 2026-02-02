import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';
import { Readable } from 'stream';

export const maxDuration = 300; // 5 minutes (Vercel hobby plan max)
export const dynamic = 'force-dynamic'; // Ensure this runs in Node.js runtime

// API to handle chunked uploads more efficiently
export async function POST(request: NextRequest) {
  try {
    const { action, sessionId, finalPath, chunkCount } = await request.json();

    if (action === 'combine') {
      // Combine chunks on the server side
      console.log(`Combining ${chunkCount} chunks for session ${sessionId}`);
      
      // Get all chunk paths
      const chunkPaths: string[] = [];
      for (let i = 1; i <= chunkCount; i++) {
        chunkPaths.push(`chunks/${sessionId}/chunk_${i.toString().padStart(6, '0')}`);
      }

      // First, verify all chunks exist
      console.log(`Verifying ${chunkCount} chunks exist for session ${sessionId}`);
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

      // Create a readable stream to combine chunks without loading all into memory
      const { Readable } = require('stream');
      
      class ChunkCombinerStream extends Readable {
        private currentChunkIndex = 0;
        private chunkPaths: string[];
        private chunkCount: number;
        
        constructor(chunkPaths: string[], chunkCount: number) {
          super();
          this.chunkPaths = chunkPaths;
          this.chunkCount = chunkCount;
        }
        
        async _read() {
          if (this.currentChunkIndex >= this.chunkCount) {
            this.push(null); // End of stream
            return;
          }
          
          try {
            const chunkPath = this.chunkPaths[this.currentChunkIndex];
            console.log(`Streaming chunk ${this.currentChunkIndex + 1}/${this.chunkCount}: ${chunkPath}`);
            
            const { data, error } = await supabaseServer.storage
              .from('documents')
              .download(chunkPath);
              
            if (error) {
              this.emit('error', new Error(`Failed to download chunk ${chunkPath}: ${JSON.stringify(error)}`));
              return;
            }
            
            if (!data) {
              this.emit('error', new Error(`No data received for chunk ${chunkPath}`));
              return;
            }
            
            // Convert blob to buffer and push to stream
            const arrayBuffer = await data.arrayBuffer();
            const chunkBuffer = Buffer.from(arrayBuffer);
            console.log(`Chunk ${this.currentChunkIndex + 1} size: ${chunkBuffer.length} bytes`);
            
            this.push(chunkBuffer);
            this.currentChunkIndex++;
          } catch (error) {
            this.emit('error', error);
          }
        }
      }
      
      // Create the stream
      const chunkStream = new ChunkCombinerStream(chunkPaths, chunkCount);
      
      // Convert stream to buffer (still need this for Supabase upload)
      const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      };
      
      console.log('Combining chunks via streaming...');
      const combinedBuffer = await streamToBuffer(chunkStream as unknown as Readable);
      
      console.log(`Combined buffer size: ${combinedBuffer.length} bytes (${(combinedBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      // Force garbage collection if available
      if (global.gc) {
        console.log('Running garbage collection before upload...');
        global.gc();
      }
      
      // Upload combined file
      console.log(`Uploading combined file to ${finalPath}`);
      const { error: uploadError } = await supabaseServer.storage
        .from('documents')
        .upload(finalPath, combinedBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/octet-stream' // Will be overridden by actual file type
        });
        
      if (uploadError) {
        throw new Error(`Failed to upload combined file: ${uploadError.message || JSON.stringify(uploadError)}`);
      }
      
      console.log('Combined file uploaded successfully');
      
      // Clean up chunks
      await supabaseServer.storage
        .from('documents')
        .remove(chunkPaths);
      
      return NextResponse.json({ 
        success: true, 
        path: finalPath,
        message: `Successfully combined ${chunkCount} chunks into ${finalPath}`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Chunk processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// GET endpoint to check chunk status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // List all chunks for this session
    const { data: files, error } = await supabaseServer.storage
      .from('documents')
      .list(`chunks/${sessionId}`, {
        limit: 1000,
        offset: 0
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      sessionId,
      chunkCount: files?.length || 0,
      chunks: files || []
    });
  } catch (error) {
    console.error('Error checking chunk status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}