import { createClient } from '@supabase/supabase-js';
import { enhancedDocumentProcessor } from '../src/utils/enhancedDocumentProcessor';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ReprocessingOptions {
  batchSize?: number;
  includeChunking?: boolean;
  includeEmbeddings?: boolean;
  forceReprocess?: boolean;
  documentTypes?: string[];
  documentIds?: string[];
}

async function getDocumentsToProcess(options: ReprocessingOptions): Promise<any[]> {
  let query = supabase
    .from('documents')
    .select('id, title, type, content_text, file_path, created_at, chunk_count, last_processed_at');

  // Filter by document types if specified
  if (options.documentTypes && options.documentTypes.length > 0) {
    query = query.in('type', options.documentTypes);
  }

  // Filter by specific document IDs if specified
  if (options.documentIds && options.documentIds.length > 0) {
    query = query.in('id', options.documentIds);
  }

  // If not forcing reprocess, only get documents that haven't been chunked
  if (!options.forceReprocess) {
    query = query.or('chunk_count.is.null,chunk_count.eq.0');
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  return data || [];
}

async function reprocessDocuments(options: ReprocessingOptions = {}) {
  const defaultOptions: ReprocessingOptions = {
    batchSize: 5,
    includeChunking: true,
    includeEmbeddings: true,
    forceReprocess: false,
  };

  const opts = { ...defaultOptions, ...options };

  console.log('🚀 Starting enhanced document reprocessing...');
  console.log('Options:', opts);

  try {
    // Get documents to process
    const documents = await getDocumentsToProcess(opts);
    console.log(`📄 Found ${documents.length} documents to process`);

    if (documents.length === 0) {
      console.log('✅ No documents need reprocessing');
      return;
    }

    // Process documents in batches
    const totalBatches = Math.ceil(documents.length / opts.batchSize!);
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < documents.length; i += opts.batchSize!) {
      const batch = documents.slice(i, i + opts.batchSize!);
      const batchNumber = Math.floor(i / opts.batchSize!) + 1;
      
      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} documents)`);
      
      const batchDocIds = batch.map(doc => doc.id);
      
      const results = await enhancedDocumentProcessor.processBatch(batchDocIds, {
        enableChunking: opts.includeChunking,
        generateEmbeddings: opts.includeEmbeddings,
        updateExisting: opts.forceReprocess,
      });

      // Process results
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const document = batch[j];
        
        if (result.success) {
          successCount++;
          console.log(`✅ ${document.title} - ${result.processingStats.chunkCount} chunks, ${result.processingStats.embeddingCount} embeddings`);
        } else {
          errorCount++;
          errors.push({
            documentId: document.id,
            title: document.title,
            error: result.errorMessage,
          });
          console.log(`❌ ${document.title} - Error: ${result.errorMessage}`);
        }
      }

      // Add delay between batches to avoid overwhelming the API
      if (i + opts.batchSize! < documents.length) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log('\n📊 Reprocessing Summary:');
    console.log(`✅ Successfully processed: ${successCount} documents`);
    console.log(`❌ Failed to process: ${errorCount} documents`);
    console.log(`📈 Success rate: ${((successCount / documents.length) * 100).toFixed(1)}%`);

    if (errors.length > 0) {
      console.log('\n❌ Error Details:');
      errors.forEach(error => {
        console.log(`- ${error.title} (${error.documentId}): ${error.error}`);
      });
    }

    // Get final statistics
    const stats = await enhancedDocumentProcessor.getProcessingStats();
    console.log('\n📈 Final Processing Statistics:');
    console.log(`Total documents: ${stats.totalDocuments}`);
    console.log(`Completed documents: ${stats.completedDocuments}`);
    console.log(`Processing rate: ${stats.processingRate.toFixed(1)}%`);
    console.log(`Total chunks: ${stats.totalChunks}`);
    console.log(`Average chunks per document: ${stats.averageChunksPerDoc.toFixed(1)}`);

  } catch (error) {
    console.error('❌ Reprocessing failed:', error);
    throw error;
  }
}

async function cleanupOldChunks() {
  console.log('🧹 Cleaning up orphaned chunks...');
  
  try {
    const { data, error } = await supabase
      .from('document_chunks')
      .delete()
      .is('document_id', null);

    if (error) {
      console.error('Cleanup error:', error);
    } else {
      console.log('✅ Cleanup completed');
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'all':
        await reprocessDocuments({
          forceReprocess: false,
          includeChunking: true,
          includeEmbeddings: true,
        });
        break;

      case 'force-all':
        await reprocessDocuments({
          forceReprocess: true,
          includeChunking: true,
          includeEmbeddings: true,
        });
        break;

      case 'chunks-only':
        await reprocessDocuments({
          forceReprocess: false,
          includeChunking: true,
          includeEmbeddings: false,
        });
        break;

      case 'embeddings-only':
        await reprocessDocuments({
          forceReprocess: false,
          includeChunking: false,
          includeEmbeddings: true,
        });
        break;

      case 'cleanup':
        await cleanupOldChunks();
        break;

      case 'stats':
        const stats = await enhancedDocumentProcessor.getProcessingStats();
        console.log('📈 Processing Statistics:');
        console.log(JSON.stringify(stats, null, 2));
        break;

      default:
        console.log(`
🔧 Enhanced Document Reprocessing Tool

Usage:
  npx tsx scripts/reprocess-documents-enhanced.ts <command>

Commands:
  all              Process all unprocessed documents with chunking and embeddings
  force-all        Reprocess all documents (even if already processed)
  chunks-only      Generate chunks only (no embeddings)
  embeddings-only  Generate embeddings only (no new chunks)
  cleanup          Clean up orphaned chunks
  stats            Show processing statistics

Examples:
  npx tsx scripts/reprocess-documents-enhanced.ts all
  npx tsx scripts/reprocess-documents-enhanced.ts force-all
        `);
        process.exit(0);
    }

    console.log('\n🎉 Reprocessing completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('💥 Reprocessing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { reprocessDocuments, cleanupOldChunks };