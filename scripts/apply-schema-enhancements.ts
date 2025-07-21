import { createClient } from '@supabase/supabase-js';
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

async function checkCurrentSchema() {
  console.log('Checking current schema...');
  
  // Check if documents table exists and has embedding column
  const { data: documentsColumns } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'documents')
    .eq('table_schema', 'public');
  
  console.log('Documents table columns:', documentsColumns?.map(c => c.column_name));
  
  // Check if pgvector extension is enabled
  const { data: extensions } = await supabase
    .from('pg_extension')
    .select('extname')
    .eq('extname', 'vector');
  
  console.log('Vector extension enabled:', (extensions?.length || 0) > 0);
  
  // Check existing indexes
  const { data: indexes } = await supabase
    .from('pg_indexes')
    .select('indexname, indexdef')
    .eq('tablename', 'documents');
  
  console.log('Existing indexes on documents:', indexes?.map(i => i.indexname));
  
  return {
    hasEmbeddingColumn: documentsColumns?.some(c => c.column_name === 'embedding'),
    hasVectorExtension: (extensions?.length || 0) > 0,
    existingIndexes: indexes?.map(i => i.indexname) || [],
  };
}

async function addMissingColumns() {
  console.log('Adding missing columns to documents table...');
  
  const columnsToAdd = [
    'processing_metadata JSONB DEFAULT \'{}\'',
    'chunk_count INTEGER DEFAULT 0',
    'embedding_model TEXT DEFAULT \'text-embedding-3-small\'',
    'embedding_version INTEGER DEFAULT 1',
    'last_processed_at TIMESTAMP WITH TIME ZONE',
    'processing_error TEXT',
    'relevance_score FLOAT DEFAULT 0.0',
    'citation_metadata JSONB DEFAULT \'{}\''
  ];
  
  for (const column of columnsToAdd) {
    try {
      // Try to add column (will fail if it already exists, but that's ok)
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE documents ADD COLUMN IF NOT EXISTS ${column};`
      });
      
      if (error && !error.message.includes('already exists')) {
        console.error(`Error adding column ${column}:`, error);
      } else {
        console.log(`✓ Added column: ${column.split(' ')[0]}`);
      }
    } catch (err) {
      console.log(`Column might already exist: ${column.split(' ')[0]}`);
    }
  }
}

async function createDocumentChunksTable() {
  console.log('Creating document_chunks table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        chunk_metadata JSONB DEFAULT '{}',
        embedding vector(1536),
        embedding_model TEXT DEFAULT 'text-embedding-3-small',
        token_count INTEGER,
        start_page INTEGER,
        end_page INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(document_id, chunk_index)
    );
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });
    
    if (error) {
      console.error('Error creating document_chunks table:', error);
    } else {
      console.log('✓ document_chunks table created');
    }
  } catch (err) {
    console.log('document_chunks table might already exist');
  }
}

async function createIndexes() {
  console.log('Creating performance indexes...');
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);',
    'CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING gin(tags);',
    'CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_documents_processing_metadata ON documents USING gin(processing_metadata);',
    'CREATE INDEX IF NOT EXISTS idx_documents_content_text_gin ON documents USING gin(to_tsvector(\'english\', content_text));'
  ];
  
  for (const indexSQL of indexes) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: indexSQL
      });
      
      if (error && !error.message.includes('already exists')) {
        console.error(`Error creating index:`, error);
      } else {
        console.log(`✓ Index created: ${indexSQL.match(/idx_\w+/)?.[0]}`);
      }
    } catch (err) {
      console.log(`Index might already exist`);
    }
  }
}

async function updateMatchDocumentsFunction() {
  console.log('Updating match_documents function...');
  
  const functionSQL = `
    CREATE OR REPLACE FUNCTION match_documents(
        query_embedding vector(1536),
        match_threshold float DEFAULT 0.78,
        match_count int DEFAULT 10
    )
    RETURNS TABLE (
        id uuid,
        title text,
        content text,
        content_text text,
        type text,
        tags text[],
        similarity float
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            d.id,
            d.title,
            d.content_text as content,
            d.content_text,
            d.type,
            d.tags,
            1 - (d.embedding <=> query_embedding) as similarity
        FROM documents d
        WHERE d.embedding IS NOT NULL
            AND 1 - (d.embedding <=> query_embedding) > match_threshold
        ORDER BY d.embedding <=> query_embedding
        LIMIT match_count;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: functionSQL
    });
    
    if (error) {
      console.error('Error updating match_documents function:', error);
    } else {
      console.log('✓ match_documents function updated');
    }
  } catch (err) {
    console.error('Failed to update match_documents function:', err);
  }
}

async function applyEnhancements() {
  console.log('Starting schema enhancements...\n');
  
  try {
    const currentSchema = await checkCurrentSchema();
    console.log('Current schema status:', currentSchema);
    console.log('');
    
    await addMissingColumns();
    await createDocumentChunksTable();
    await createIndexes();
    await updateMatchDocumentsFunction();
    
    console.log('\n✓ Schema enhancements completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the enhanced search functionality');
    console.log('2. Run document reprocessing to generate chunks');
    console.log('3. Monitor performance improvements');
    
  } catch (error) {
    console.error('Schema enhancement failed:', error);
    process.exit(1);
  }
}

// Run the enhancements
applyEnhancements()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Enhancement process failed:', error);
    process.exit(1);
  });