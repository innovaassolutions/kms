-- Video Frames Database Schema for Phase 2 Multi-Modal Processing (FIXED)
-- Execute this SQL in your Supabase SQL Editor

-- Video frames table for storing extracted frame metadata
CREATE TABLE IF NOT EXISTS video_frames (
    id TEXT PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    timestamp FLOAT NOT NULL, -- seconds from start of video
    frame_number INTEGER NOT NULL,
    frame_url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
    metadata JSONB DEFAULT '{}',
    
    -- OCR and Vision Analysis Results
    ocr_text TEXT,
    ocr_confidence FLOAT,
    ocr_bounding_boxes JSONB,
    ocr_language TEXT,
    
    -- Visual Analysis
    scene_change_score FLOAT,
    motion_score FLOAT,
    brightness FLOAT,
    contrast FLOAT,
    dominant_colors JSONB,
    detected_objects JSONB,
    
    -- Technical Content Detection
    contains_code BOOLEAN DEFAULT FALSE,
    contains_diagrams BOOLEAN DEFAULT FALSE,
    contains_text BOOLEAN DEFAULT FALSE,
    contains_ui_elements BOOLEAN DEFAULT FALSE,
    
    -- Embeddings for multi-modal search
    visual_embedding vector(1536),
    text_embedding vector(1536),
    combined_embedding vector(1536),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(document_id, frame_number)
);

-- Frame analysis results table for detailed vision API results
CREATE TABLE IF NOT EXISTS frame_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frame_id TEXT REFERENCES video_frames(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL, -- 'ocr', 'object_detection', 'scene_analysis', 'technical_content'
    provider TEXT NOT NULL, -- 'gpt4v', 'claude_vision', 'google_vision', 'azure_vision'
    confidence FLOAT,
    raw_response JSONB,
    extracted_data JSONB,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scene detection and grouping
CREATE TABLE IF NOT EXISTS video_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    scene_number INTEGER NOT NULL,
    start_timestamp FLOAT NOT NULL,
    end_timestamp FLOAT NOT NULL,
    duration FLOAT GENERATED ALWAYS AS (end_timestamp - start_timestamp) STORED,
    representative_frame_id TEXT REFERENCES video_frames(id),
    scene_description TEXT,
    scene_type TEXT, -- 'code', 'presentation', 'demonstration', 'discussion', 'diagram'
    key_topics TEXT[],
    technical_concepts TEXT[],
    confidence_score FLOAT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(document_id, scene_number)
);

-- Technical content extraction from frames
CREATE TABLE IF NOT EXISTS frame_technical_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frame_id TEXT REFERENCES video_frames(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- 'code', 'sql', 'diagram', 'flowchart', 'ui_mockup', 'architecture'
    programming_language TEXT,
    extracted_code TEXT,
    code_description TEXT,
    diagram_type TEXT,
    diagram_description TEXT,
    ui_elements JSONB,
    technical_terms TEXT[],
    confidence FLOAT,
    bounding_box JSONB, -- coordinates of the technical content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_video_frames_document_id ON video_frames(document_id);
CREATE INDEX IF NOT EXISTS idx_video_frames_timestamp ON video_frames("timestamp");
CREATE INDEX IF NOT EXISTS idx_video_frames_processing_status ON video_frames(processing_status);
CREATE INDEX IF NOT EXISTS idx_video_frames_contains_flags ON video_frames(contains_code, contains_diagrams, contains_text);

-- Vector similarity search indexes
CREATE INDEX IF NOT EXISTS idx_video_frames_visual_embedding 
ON video_frames USING ivfflat (visual_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_video_frames_text_embedding 
ON video_frames USING ivfflat (text_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_video_frames_combined_embedding 
ON video_frames USING ivfflat (combined_embedding vector_cosine_ops) WITH (lists = 100);

-- Frame analysis indexes
CREATE INDEX IF NOT EXISTS idx_frame_analysis_frame_id ON frame_analysis(frame_id);
CREATE INDEX IF NOT EXISTS idx_frame_analysis_type ON frame_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_frame_analysis_provider ON frame_analysis(provider);

-- Scene indexes
CREATE INDEX IF NOT EXISTS idx_video_scenes_document_id ON video_scenes(document_id);
CREATE INDEX IF NOT EXISTS idx_video_scenes_timestamps ON video_scenes(start_timestamp, end_timestamp);
CREATE INDEX IF NOT EXISTS idx_video_scenes_type ON video_scenes(scene_type);

-- Technical content indexes
CREATE INDEX IF NOT EXISTS idx_frame_technical_content_frame_id ON frame_technical_content(frame_id);
CREATE INDEX IF NOT EXISTS idx_frame_technical_content_type ON frame_technical_content(content_type);
CREATE INDEX IF NOT EXISTS idx_frame_technical_content_language ON frame_technical_content(programming_language);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_video_frames_ocr_text_gin 
ON video_frames USING gin(to_tsvector('english', ocr_text));

CREATE INDEX IF NOT EXISTS idx_frame_technical_content_code_gin 
ON frame_technical_content USING gin(to_tsvector('english', extracted_code));

-- Functions for video frame search and analysis

-- Search video frames by visual similarity
CREATE OR REPLACE FUNCTION search_video_frames_visual(
    query_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.3,
    max_results INT DEFAULT 20,
    document_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
    frame_id TEXT,
    document_id UUID,
    frame_timestamp FLOAT,
    frame_url TEXT,
    similarity FLOAT,
    ocr_text TEXT,
    scene_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vf.id as frame_id,
        vf.document_id,
        vf."timestamp" as frame_timestamp,
        vf.frame_url,
        1 - (vf.visual_embedding <=> query_embedding) as similarity,
        vf.ocr_text,
        vs.scene_type
    FROM video_frames vf
    LEFT JOIN video_scenes vs ON vf.document_id = vs.document_id 
        AND vf."timestamp" BETWEEN vs.start_timestamp AND vs.end_timestamp
    WHERE vf.visual_embedding IS NOT NULL
        AND 1 - (vf.visual_embedding <=> query_embedding) > similarity_threshold
        AND (document_ids IS NULL OR vf.document_id = ANY(document_ids))
    ORDER BY vf.visual_embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Search frames by combined visual and text similarity
CREATE OR REPLACE FUNCTION search_video_frames_multimodal(
    visual_embedding vector(1536) DEFAULT NULL,
    text_embedding vector(1536) DEFAULT NULL,
    visual_weight FLOAT DEFAULT 0.5,
    text_weight FLOAT DEFAULT 0.5,
    similarity_threshold FLOAT DEFAULT 0.3,
    max_results INT DEFAULT 20,
    content_filters TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    frame_id TEXT,
    document_id UUID,
    frame_timestamp FLOAT,
    frame_url TEXT,
    visual_similarity FLOAT,
    text_similarity FLOAT,
    combined_score FLOAT,
    ocr_text TEXT,
    contains_code BOOLEAN,
    contains_diagrams BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vf.id as frame_id,
        vf.document_id,
        vf."timestamp" as frame_timestamp,
        vf.frame_url,
        CASE WHEN visual_embedding IS NOT NULL 
             THEN 1 - (vf.visual_embedding <=> visual_embedding) 
             ELSE 0 END as visual_similarity,
        CASE WHEN text_embedding IS NOT NULL 
             THEN 1 - (vf.text_embedding <=> text_embedding) 
             ELSE 0 END as text_similarity,
        CASE 
            WHEN visual_embedding IS NOT NULL AND text_embedding IS NOT NULL THEN
                (1 - (vf.visual_embedding <=> visual_embedding)) * visual_weight +
                (1 - (vf.text_embedding <=> text_embedding)) * text_weight
            WHEN visual_embedding IS NOT NULL THEN
                1 - (vf.visual_embedding <=> visual_embedding)
            WHEN text_embedding IS NOT NULL THEN
                1 - (vf.text_embedding <=> text_embedding)
            ELSE 0
        END as combined_score,
        vf.ocr_text,
        vf.contains_code,
        vf.contains_diagrams
    FROM video_frames vf
    WHERE (visual_embedding IS NULL OR vf.visual_embedding IS NOT NULL)
        AND (text_embedding IS NULL OR vf.text_embedding IS NOT NULL)
        AND (content_filters IS NULL OR 
             (('code' = ANY(content_filters) AND vf.contains_code) OR
              ('diagrams' = ANY(content_filters) AND vf.contains_diagrams) OR
              ('text' = ANY(content_filters) AND vf.contains_text) OR
              ('ui' = ANY(content_filters) AND vf.contains_ui_elements)))
    HAVING combined_score > similarity_threshold
    ORDER BY combined_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Get video timeline with frame summaries
CREATE OR REPLACE FUNCTION get_video_timeline(
    target_document_id UUID,
    frame_interval FLOAT DEFAULT 30.0
)
RETURNS TABLE (
    frame_timestamp FLOAT,
    frame_id TEXT,
    frame_url TEXT,
    ocr_text TEXT,
    scene_description TEXT,
    technical_content_summary TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH frame_intervals AS (
        SELECT 
            (FLOOR("timestamp" / frame_interval) * frame_interval) as time_bucket,
            MIN("timestamp") as min_timestamp
        FROM video_frames 
        WHERE document_id = target_document_id
        GROUP BY FLOOR("timestamp" / frame_interval)
    ),
    representative_frames AS (
        SELECT DISTINCT ON (FLOOR(vf."timestamp" / frame_interval))
            vf.id,
            vf."timestamp",
            vf.frame_url,
            vf.ocr_text
        FROM video_frames vf
        JOIN frame_intervals fi ON FLOOR(vf."timestamp" / frame_interval) * frame_interval = fi.time_bucket
        WHERE vf.document_id = target_document_id
        ORDER BY FLOOR(vf."timestamp" / frame_interval), ABS(vf."timestamp" - fi.min_timestamp)
    )
    SELECT 
        rf."timestamp" as frame_timestamp,
        rf.id as frame_id,
        rf.frame_url,
        rf.ocr_text,
        vs.scene_description,
        STRING_AGG(DISTINCT ftc.extracted_code, ' | ') as technical_content_summary
    FROM representative_frames rf
    LEFT JOIN video_scenes vs ON vs.document_id = target_document_id 
        AND rf."timestamp" BETWEEN vs.start_timestamp AND vs.end_timestamp
    LEFT JOIN frame_technical_content ftc ON ftc.frame_id = rf.id
    GROUP BY rf."timestamp", rf.id, rf.frame_url, rf.ocr_text, vs.scene_description
    ORDER BY rf."timestamp";
END;
$$ LANGUAGE plpgsql;

-- Function to find similar technical content across videos
CREATE OR REPLACE FUNCTION find_similar_technical_content(
    content_type TEXT,
    search_terms TEXT[],
    similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    frame_id TEXT,
    document_id UUID,
    document_title TEXT,
    frame_timestamp FLOAT,
    frame_url TEXT,
    extracted_code TEXT,
    confidence FLOAT,
    programming_language TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ftc.frame_id,
        vf.document_id,
        d.title as document_title,
        vf."timestamp" as frame_timestamp,
        vf.frame_url,
        ftc.extracted_code,
        ftc.confidence,
        ftc.programming_language
    FROM frame_technical_content ftc
    JOIN video_frames vf ON vf.id = ftc.frame_id
    JOIN documents d ON d.id = vf.document_id
    WHERE ftc.content_type = find_similar_technical_content.content_type
        AND (search_terms IS NULL OR ftc.technical_terms && search_terms)
        AND ftc.confidence > similarity_threshold
    ORDER BY ftc.confidence DESC, vf."timestamp";
END;
$$ LANGUAGE plpgsql;

-- Update trigger to set updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_video_frames_updated_at BEFORE UPDATE ON video_frames
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security
ALTER TABLE video_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_technical_content ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role can access all video frames" ON video_frames
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all frame analysis" ON frame_analysis
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all video scenes" ON video_scenes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all technical content" ON frame_technical_content
    FOR ALL USING (auth.role() = 'service_role');