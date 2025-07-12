-- Manual Schema Migration for Enhanced RAG Capabilities
-- Execute this SQL in your Supabase SQL Editor

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add new columns to documents table for enhanced RAG capabilities
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS processing_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small',
ADD COLUMN IF NOT EXISTS embedding_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_error TEXT,
ADD COLUMN IF NOT EXISTS relevance_score FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS citation_metadata JSONB DEFAULT '{}';

-- Create document chunks table for intelligent chunking
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

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_processing_metadata ON documents USING gin(processing_metadata);

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_documents_content_text_gin 
ON documents USING gin(to_tsvector('english', content_text));

CREATE INDEX IF NOT EXISTS idx_document_chunks_text_gin 
ON document_chunks USING gin(to_tsvector('english', chunk_text));

-- Vector similarity search indexes
CREATE INDEX IF NOT EXISTS idx_documents_embedding_ivfflat 
ON documents USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_ivfflat 
ON document_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create optimized similarity search function with hybrid search
CREATE OR REPLACE FUNCTION search_documents_hybrid(
    query_embedding vector(1536),
    query_text TEXT DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.3,
    match_count INT DEFAULT 10,
    filter_type TEXT DEFAULT NULL,
    filter_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    similarity FLOAT,
    rank FLOAT,
    type TEXT,
    tags TEXT[],
    chunk_id UUID,
    chunk_text TEXT,
    citation_metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH vector_search AS (
        SELECT 
            d.id,
            d.title,
            d.content_text,
            1 - (d.embedding <=> query_embedding) as similarity,
            d.type,
            d.tags,
            NULL::UUID as chunk_id,
            NULL::TEXT as chunk_text,
            d.citation_metadata
        FROM documents d
        WHERE d.embedding IS NOT NULL
            AND 1 - (d.embedding <=> query_embedding) > match_threshold
            AND (filter_type IS NULL OR d.type = filter_type)
            AND (filter_tags IS NULL OR d.tags && filter_tags)
        
        UNION ALL
        
        SELECT 
            d.id,
            d.title,
            d.content_text,
            1 - (dc.embedding <=> query_embedding) as similarity,
            d.type,
            d.tags,
            dc.id as chunk_id,
            dc.chunk_text,
            d.citation_metadata
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE dc.embedding IS NOT NULL
            AND 1 - (dc.embedding <=> query_embedding) > match_threshold
            AND (filter_type IS NULL OR d.type = filter_type)
            AND (filter_tags IS NULL OR d.tags && filter_tags)
    ),
    text_search AS (
        SELECT 
            d.id,
            ts_rank_cd(to_tsvector('english', d.content_text), 
                      plainto_tsquery('english', query_text)) as text_rank
        FROM documents d
        WHERE query_text IS NOT NULL 
            AND to_tsvector('english', d.content_text) @@ plainto_tsquery('english', query_text)
            AND (filter_type IS NULL OR d.type = filter_type)
            AND (filter_tags IS NULL OR d.tags && filter_tags)
    )
    SELECT 
        vs.id,
        vs.title,
        vs.content,
        vs.similarity,
        COALESCE(vs.similarity * 0.7 + ts.text_rank * 0.3, vs.similarity) as rank,
        vs.type,
        vs.tags,
        vs.chunk_id,
        vs.chunk_text,
        vs.citation_metadata
    FROM vector_search vs
    LEFT JOIN text_search ts ON vs.id = ts.id
    ORDER BY rank DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function for chunk-based similarity search
CREATE OR REPLACE FUNCTION search_document_chunks(
    query_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.3,
    max_results INT DEFAULT 20
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    document_title TEXT,
    chunk_text TEXT,
    chunk_index INTEGER,
    similarity FLOAT,
    chunk_metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id as chunk_id,
        dc.document_id,
        d.title as document_title,
        dc.chunk_text,
        dc.chunk_index,
        1 - (dc.embedding <=> query_embedding) as similarity,
        dc.chunk_metadata
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE dc.embedding IS NOT NULL
        AND 1 - (dc.embedding <=> query_embedding) > similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to get document context (surrounding chunks)
CREATE OR REPLACE FUNCTION get_document_context(
    target_chunk_id UUID,
    context_window INT DEFAULT 2
)
RETURNS TABLE (
    chunk_id UUID,
    chunk_text TEXT,
    chunk_index INTEGER,
    chunk_metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH target_chunk AS (
        SELECT document_id, chunk_index
        FROM document_chunks
        WHERE id = target_chunk_id
    )
    SELECT 
        dc.id,
        dc.chunk_text,
        dc.chunk_index,
        dc.chunk_metadata
    FROM document_chunks dc
    JOIN target_chunk tc ON dc.document_id = tc.document_id
    WHERE dc.chunk_index BETWEEN 
        tc.chunk_index - context_window AND 
        tc.chunk_index + context_window
    ORDER BY dc.chunk_index;
END;
$$ LANGUAGE plpgsql;

-- Create embedding cache for frequently accessed content
CREATE TABLE IF NOT EXISTS embedding_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash TEXT UNIQUE NOT NULL,
    content_text TEXT NOT NULL,
    embedding vector(1536),
    embedding_model TEXT,
    usage_count INTEGER DEFAULT 1,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash ON embedding_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_usage ON embedding_cache(usage_count DESC, last_accessed DESC);