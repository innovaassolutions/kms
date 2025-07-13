import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Update document (PATCH)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { title, type, tags } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Update the document in the database
    const { data, error } = await supabaseServer
      .from('documents')
      .update({
        title,
        type,
        tags,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Document update error:', error);
      return NextResponse.json(
        { error: 'Failed to update document', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Document updated successfully',
      document: data
    });

  } catch (error) {
    console.error('Document update API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// Delete document (DELETE)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // First get the document to find the file path
    const { data: document, error: fetchError } = await supabaseServer
      .from('documents')
      .select('file_path')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching document:', fetchError);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete the file from storage if it exists
    if (document.file_path) {
      const { error: storageError } = await supabaseServer.storage
        .from('documents')
        .remove([document.file_path]);
      
      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
        // Continue with database deletion even if file deletion fails
      }

      // Also check for and clean up any chunks
      const possibleSessionId = document.file_path.split('_')[0];
      const { data: chunks } = await supabaseServer.storage
        .from('documents')
        .list(`chunks/${possibleSessionId}`, { limit: 1000 });
      
      if (chunks && chunks.length > 0) {
        console.log(`Cleaning up ${chunks.length} chunks for deleted document`);
        const chunkPaths = chunks.map((_, i) => 
          `chunks/${possibleSessionId}/chunk_${(i + 1).toString().padStart(6, '0')}`
        );
        
        const { error: chunkError } = await supabaseServer.storage
          .from('documents')
          .remove(chunkPaths);
        
        if (chunkError) {
          console.warn('Failed to delete chunks:', chunkError);
        }
      }
    }

    // Delete the document from the database
    const { error: deleteError } = await supabaseServer
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Document deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Document deletion API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// Get single document (GET)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const { data: document, error } = await supabaseServer
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Document fetch error:', error);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      document: document
    });

  } catch (error) {
    console.error('Document fetch API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}