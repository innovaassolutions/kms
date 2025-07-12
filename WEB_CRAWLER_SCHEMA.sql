-- Web Crawler Database Schema for Phase 3 Implementation
-- Execute this SQL in your Supabase SQL Editor

-- Web sources table for tracking crawled websites
CREATE TABLE IF NOT EXISTS web_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT UNIQUE NOT NULL,
    domain TEXT NOT NULL,
    title TEXT,
    description TEXT,
    crawl_frequency INTERVAL DEFAULT '24 hours',
    max_depth INTEGER DEFAULT 3,
    follow_redirects BOOLEAN DEFAULT TRUE,
    respect_robots_txt BOOLEAN DEFAULT TRUE,
    
    -- Status and configuration
    status TEXT CHECK (status IN ('active', 'paused', 'error', 'completed')) DEFAULT 'active',
    last_crawled TIMESTAMP WITH TIME ZONE,
    next_crawl TIMESTAMP WITH TIME ZONE,
    last_success TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Content tracking
    content_hash TEXT,
    page_count INTEGER DEFAULT 0,
    total_documents INTEGER DEFAULT 0,
    
    -- Crawl configuration
    user_agent TEXT DEFAULT 'KMS-Crawler/1.0',
    rate_limit_ms INTEGER DEFAULT 1000,
    timeout_ms INTEGER DEFAULT 30000,
    include_patterns TEXT[],
    exclude_patterns TEXT[],
    content_types TEXT[] DEFAULT ARRAY['text/html', 'application/pdf'],
    
    -- Metadata
    tags TEXT[],
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Advanced options
    extract_images BOOLEAN DEFAULT FALSE,
    extract_links BOOLEAN DEFAULT TRUE,
    follow_external_links BOOLEAN DEFAULT FALSE,
    max_file_size_mb INTEGER DEFAULT 50
);

-- Web pages table for individual crawled pages
CREATE TABLE IF NOT EXISTS web_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES web_sources(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    parent_url TEXT,
    depth INTEGER NOT NULL DEFAULT 0,
    
    -- Content information
    title TEXT,
    meta_description TEXT,
    content_text TEXT,
    content_html TEXT,
    content_hash TEXT,
    content_length INTEGER,
    
    -- HTTP response data
    status_code INTEGER,
    response_headers JSONB,
    content_type TEXT,
    charset TEXT DEFAULT 'utf-8',
    language TEXT,
    
    -- Processing status
    processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'error', 'skipped')) DEFAULT 'pending',
    document_id UUID REFERENCES documents(id),
    embedding_generated BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_modified TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Extracted metadata
    author TEXT,
    published_date TIMESTAMP WITH TIME ZONE,
    keywords TEXT[],
    extracted_links TEXT[],
    images JSONB,
    
    -- Performance metrics
    crawl_duration_ms INTEGER,
    processing_duration_ms INTEGER,
    
    UNIQUE(source_id, url)
);

-- Content versions for change tracking
CREATE TABLE IF NOT EXISTS web_content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES web_pages(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    content_text TEXT,
    content_html TEXT,
    
    -- Change detection
    changes_detected JSONB,
    change_percentage FLOAT,
    significant_change BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content_length INTEGER,
    word_count INTEGER,
    
    UNIQUE(page_id, version_number)
);

-- Crawl jobs for scheduling and queue management
CREATE TABLE IF NOT EXISTS crawl_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES web_sources(id) ON DELETE CASCADE,
    job_type TEXT CHECK (job_type IN ('scheduled', 'manual', 'retry', 'one_time')) DEFAULT 'scheduled',
    
    -- Job configuration
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    max_pages INTEGER,
    specific_urls TEXT[],
    
    -- Status tracking
    status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Results
    pages_crawled INTEGER DEFAULT 0,
    pages_processed INTEGER DEFAULT 0,
    pages_failed INTEGER DEFAULT 0,
    documents_created INTEGER DEFAULT 0,
    documents_updated INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Performance metrics
    total_duration_ms INTEGER,
    avg_page_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link extraction and relationship tracking
CREATE TABLE IF NOT EXISTS web_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_page_id UUID REFERENCES web_pages(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    target_page_id UUID REFERENCES web_pages(id) ON DELETE SET NULL,
    
    -- Link metadata
    anchor_text TEXT,
    link_type TEXT CHECK (link_type IN ('internal', 'external', 'subdomain')),
    rel_attributes TEXT[],
    
    -- Position and context
    position_index INTEGER,
    surrounding_text TEXT,
    
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_web_sources_status ON web_sources(status);
CREATE INDEX IF NOT EXISTS idx_web_sources_next_crawl ON web_sources(next_crawl) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_web_sources_domain ON web_sources(domain);
CREATE INDEX IF NOT EXISTS idx_web_sources_priority ON web_sources(priority, next_crawl);

CREATE INDEX IF NOT EXISTS idx_web_pages_source_id ON web_pages(source_id);
CREATE INDEX IF NOT EXISTS idx_web_pages_url ON web_pages(url);
CREATE INDEX IF NOT EXISTS idx_web_pages_processing_status ON web_pages(processing_status);
CREATE INDEX IF NOT EXISTS idx_web_pages_crawled_at ON web_pages(crawled_at);
CREATE INDEX IF NOT EXISTS idx_web_pages_content_hash ON web_pages(content_hash);

CREATE INDEX IF NOT EXISTS idx_web_content_versions_page_id ON web_content_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_web_content_versions_crawled_at ON web_content_versions(crawled_at);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs(status);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_source_id ON crawl_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_priority ON crawl_jobs(priority, created_at);

CREATE INDEX IF NOT EXISTS idx_web_links_source_page ON web_links(source_page_id);
CREATE INDEX IF NOT EXISTS idx_web_links_target_url ON web_links(target_url);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_web_pages_content_gin 
ON web_pages USING gin(to_tsvector('english', content_text));

CREATE INDEX IF NOT EXISTS idx_web_pages_title_gin 
ON web_pages USING gin(to_tsvector('english', title));

-- Functions for web crawler operations

-- Get next sources to crawl
CREATE OR REPLACE FUNCTION get_sources_to_crawl(
    max_sources INT DEFAULT 10
)
RETURNS TABLE (
    source_id UUID,
    url TEXT,
    domain TEXT,
    crawl_frequency INTERVAL,
    last_crawled TIMESTAMP WITH TIME ZONE,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ws.id as source_id,
        ws.url,
        ws.domain,
        ws.crawl_frequency,
        ws.last_crawled,
        ws.priority
    FROM web_sources ws
    WHERE ws.status = 'active'
        AND (ws.next_crawl IS NULL OR ws.next_crawl <= NOW())
        AND NOT EXISTS (
            SELECT 1 FROM crawl_jobs cj 
            WHERE cj.source_id = ws.id 
            AND cj.status IN ('pending', 'running')
        )
    ORDER BY 
        ws.priority DESC,
        COALESCE(ws.last_crawled, '1970-01-01'::timestamp) ASC
    LIMIT max_sources;
END;
$$ LANGUAGE plpgsql;

-- Search web content
CREATE OR REPLACE FUNCTION search_web_content(
    search_query TEXT,
    domain_filter TEXT DEFAULT NULL,
    max_results INT DEFAULT 20,
    min_similarity FLOAT DEFAULT 0.1
)
RETURNS TABLE (
    page_id UUID,
    source_id UUID,
    url TEXT,
    title TEXT,
    content_snippet TEXT,
    crawled_at TIMESTAMP WITH TIME ZONE,
    rank FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wp.id as page_id,
        wp.source_id,
        wp.url,
        wp.title,
        SUBSTRING(wp.content_text, 1, 300) as content_snippet,
        wp.crawled_at,
        ts_rank(to_tsvector('english', wp.content_text), plainto_tsquery('english', search_query)) as rank
    FROM web_pages wp
    JOIN web_sources ws ON wp.source_id = ws.id
    WHERE wp.processing_status = 'completed'
        AND wp.content_text IS NOT NULL
        AND to_tsvector('english', wp.content_text) @@ plainto_tsquery('english', search_query)
        AND (domain_filter IS NULL OR ws.domain = domain_filter)
    ORDER BY rank DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Detect content changes
CREATE OR REPLACE FUNCTION detect_content_changes(
    target_page_id UUID,
    new_content_hash TEXT,
    new_content TEXT
)
RETURNS TABLE (
    has_changes BOOLEAN,
    change_percentage FLOAT,
    significant_change BOOLEAN,
    version_number INTEGER
) AS $$
DECLARE
    latest_version INTEGER;
    latest_hash TEXT;
    latest_content TEXT;
    change_pct FLOAT := 0;
    is_significant BOOLEAN := FALSE;
BEGIN
    -- Get latest version
    SELECT 
        COALESCE(MAX(version_number), 0),
        content_hash,
        content_text
    INTO latest_version, latest_hash, latest_content
    FROM web_content_versions 
    WHERE page_id = target_page_id
    GROUP BY content_hash, content_text
    ORDER BY version_number DESC
    LIMIT 1;

    -- If no previous version, this is the first
    IF latest_version = 0 THEN
        RETURN QUERY SELECT TRUE, 100.0, TRUE, 1;
        RETURN;
    END IF;

    -- Check if content hash has changed
    IF latest_hash = new_content_hash THEN
        RETURN QUERY SELECT FALSE, 0.0, FALSE, latest_version;
        RETURN;
    END IF;

    -- Calculate change percentage (simplified)
    change_pct := CASE 
        WHEN latest_content IS NULL OR new_content IS NULL THEN 100.0
        ELSE ABS(LENGTH(new_content) - LENGTH(latest_content))::FLOAT / GREATEST(LENGTH(latest_content), 1) * 100
    END;

    -- Determine if change is significant (>10% change or >1000 chars difference)
    is_significant := change_pct > 10.0 OR ABS(LENGTH(new_content) - LENGTH(COALESCE(latest_content, ''))) > 1000;

    RETURN QUERY SELECT TRUE, change_pct, is_significant, latest_version + 1;
END;
$$ LANGUAGE plpgsql;

-- Update triggers
CREATE OR REPLACE FUNCTION update_web_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_web_sources_updated_at_trigger
    BEFORE UPDATE ON web_sources
    FOR EACH ROW EXECUTE PROCEDURE update_web_sources_updated_at();

CREATE OR REPLACE FUNCTION update_crawl_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crawl_jobs_updated_at_trigger
    BEFORE UPDATE ON crawl_jobs
    FOR EACH ROW EXECUTE PROCEDURE update_crawl_jobs_updated_at();

-- Row Level Security
ALTER TABLE web_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_links ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access for backend operations)
CREATE POLICY "Service role can access all web sources" ON web_sources
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all web pages" ON web_pages
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all content versions" ON web_content_versions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all crawl jobs" ON crawl_jobs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all web links" ON web_links
    FOR ALL USING (auth.role() = 'service_role');

-- User policies (authenticated users can view their own data)
CREATE POLICY "Users can view their web sources" ON web_sources
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create web sources" ON web_sources
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their web sources" ON web_sources
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their web sources" ON web_sources
    FOR DELETE USING (auth.uid() = created_by);