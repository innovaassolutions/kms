import { supabaseServer } from './supabase/serverClients';

// Utility to recover stuck uploads and fix missing files
export async function recoverStuckUploads() {
  try {
    console.log('Starting upload recovery process...');
    
    // Find documents that might be stuck
    const { data: stuckDocuments, error } = await supabaseServer
      .from('documents')
      .select('*')
      .or('content_text.is.null,transcription_status.eq.pending')
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours
    
    if (error) {
      console.error('Error fetching stuck documents:', error);
      return;
    }
    
    console.log(`Found ${stuckDocuments?.length || 0} potentially stuck documents`);
    
    for (const doc of stuckDocuments || []) {
      console.log(`Checking document ${doc.id} - ${doc.title}`);
      
      // Check if the file exists at the expected path
      const { data: fileData, error: downloadError } = await supabaseServer.storage
        .from('documents')
        .download(doc.file_path);
      
      if (downloadError) {
        console.error(`File not found at path ${doc.file_path} for document ${doc.id}`);
        
        // Check if there are chunks for this file
        const possibleSessionId = doc.file_path.split('_')[0]; // Extract timestamp as session ID
        const { data: chunks } = await supabaseServer.storage
          .from('documents')
          .list(`chunks/${possibleSessionId}`, {
            limit: 1000
          });
        
        if (chunks && chunks.length > 0) {
          console.log(`Found ${chunks.length} chunks for document ${doc.id}`);
          
          // Attempt to recover by combining chunks
          try {
            await combineChunksForDocument(doc.id, possibleSessionId, doc.file_path, chunks.length);
            console.log(`Successfully recovered document ${doc.id}`);
          } catch (recoverError) {
            console.error(`Failed to recover document ${doc.id}:`, recoverError);
            
            // Mark document as error
            await supabaseServer
              .from('documents')
              .update({ 
                transcription_status: 'error',
                content_text: `Error: Failed to recover file. Original error: ${recoverError}`
              })
              .eq('id', doc.id);
          }
        } else {
          // No chunks found, mark as error
          await supabaseServer
            .from('documents')
            .update({ 
              transcription_status: 'error',
              content_text: 'Error: File not found and no chunks available for recovery'
            })
            .eq('id', doc.id);
        }
      } else {
        console.log(`File exists for document ${doc.id}, triggering reprocessing`);
        // File exists, just needs processing
        // The auto-process daemon should pick it up
      }
    }
    
    console.log('Upload recovery process completed');
  } catch (error) {
    console.error('Upload recovery failed:', error);
  }
}

async function combineChunksForDocument(
  documentId: string, 
  sessionId: string, 
  finalPath: string, 
  chunkCount: number
) {
  // Get all chunk paths
  const chunkPaths: string[] = [];
  for (let i = 1; i <= chunkCount; i++) {
    chunkPaths.push(`chunks/${sessionId}/chunk_${i.toString().padStart(6, '0')}`);
  }

  // Download all chunks
  const chunkBuffers: Buffer[] = [];
  for (const chunkPath of chunkPaths) {
    const { data, error } = await supabaseServer.storage
      .from('documents')
      .download(chunkPath);
      
    if (error) {
      throw new Error(`Failed to download chunk ${chunkPath}: ${error.message}`);
    }
    
    // Convert blob to buffer
    const arrayBuffer = await data.arrayBuffer();
    chunkBuffers.push(Buffer.from(arrayBuffer));
  }
  
  // Combine all buffers
  const combinedBuffer = Buffer.concat(chunkBuffers);
  
  // Upload combined file
  const { error: uploadError } = await supabaseServer.storage
    .from('documents')
    .upload(finalPath, combinedBuffer, {
      cacheControl: '3600',
      upsert: true
    });
    
  if (uploadError) {
    throw new Error(`Failed to upload combined file: ${uploadError.message}`);
  }
  
  // Clean up chunks
  await supabaseServer.storage
    .from('documents')
    .remove(chunkPaths);
  
  console.log(`Successfully combined ${chunkCount} chunks for document ${documentId}`);
}

// Export for use in scripts
export default recoverStuckUploads;