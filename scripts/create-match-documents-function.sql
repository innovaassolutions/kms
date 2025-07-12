-- Create the match_documents RPC function for vector similarity search
-- This function should be executed in your Supabase SQL editor

-- First, ensure the pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the match_documents function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  type text,
  media_type text,
  tags text[],
  content_text text,
  transcription text,
  similarity float,
  created_at timestamp,
  file_path text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.title,
    documents.type,
    documents.media_type,
    documents.tags,
    documents.content_text,
    documents.transcription,
    (1 - (documents.embedding <=> query_embedding)) AS similarity,
    documents.created_at,
    documents.file_path
  FROM documents
  WHERE documents.embedding IS NOT NULL
    AND (1 - (documents.embedding <=> query_embedding)) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION match_documents TO anon, authenticated;

-- Create an index on the embedding column for better performance
-- Note: Index creation commented out due to memory constraints on Supabase free tier
-- The search will work without index, just slower
-- CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents 
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Alternative index for different distance metrics (optional)
-- CREATE INDEX IF NOT EXISTS documents_embedding_l2_idx ON documents 
-- USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Verify the function was created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'match_documents';