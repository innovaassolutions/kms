-- Monitoring and Logging Tables for Enhanced KMS
-- Execute this SQL in your Supabase SQL Editor

-- System logs table for structured logging
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    level TEXT CHECK (level IN ('debug', 'info', 'warn', 'error')),
    component TEXT NOT NULL,
    action TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    duration INTEGER, -- in milliseconds
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    value FLOAT NOT NULL,
    unit TEXT CHECK (unit IN ('ms', 'count', 'bytes', 'percentage')),
    component TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query analytics table (enhanced from existing)
CREATE TABLE IF NOT EXISTS query_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    query_embedding vector(1536),
    query_type TEXT CHECK (query_type IN ('search', 'chat', 'api', 'intelligent')),
    search_strategy TEXT,
    result_count INTEGER,
    avg_relevance_score FLOAT,
    confidence_score FLOAT,
    response_time_ms INTEGER,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    query_intent JSONB,
    query_complexity JSONB,
    filters_applied JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System health snapshots
CREATE TABLE IF NOT EXISTS system_health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    overall_status TEXT CHECK (overall_status IN ('healthy', 'degraded', 'unhealthy')),
    database_status TEXT CHECK (database_status IN ('healthy', 'degraded', 'unhealthy')),
    search_status TEXT CHECK (search_status IN ('healthy', 'degraded', 'unhealthy')),
    embeddings_status TEXT CHECK (embeddings_status IN ('healthy', 'degraded', 'unhealthy')),
    storage_status TEXT CHECK (storage_status IN ('healthy', 'degraded', 'unhealthy')),
    avg_response_time FLOAT,
    error_rate FLOAT,
    throughput FLOAT,
    component_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error tracking table
CREATE TABLE IF NOT EXISTS error_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    component TEXT NOT NULL,
    action TEXT,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    request_data JSONB,
    environment_info JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity tracking
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    activity_type TEXT NOT NULL,
    component TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component);
CREATE INDEX IF NOT EXISTS idx_system_logs_component_action ON system_logs(component, action);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_component ON performance_metrics(component);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_component_name ON performance_metrics(component, name);

CREATE INDEX IF NOT EXISTS idx_query_analytics_timestamp ON query_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_analytics_type ON query_analytics(query_type);
CREATE INDEX IF NOT EXISTS idx_query_analytics_strategy ON query_analytics(search_strategy);
CREATE INDEX IF NOT EXISTS idx_query_analytics_user ON query_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health_snapshots(overall_status);

CREATE INDEX IF NOT EXISTS idx_error_tracking_timestamp ON error_tracking(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_tracking_component ON error_tracking(component);
CREATE INDEX IF NOT EXISTS idx_error_tracking_resolved ON error_tracking(resolved);
CREATE INDEX IF NOT EXISTS idx_error_tracking_type ON error_tracking(error_type);

CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);

-- Create functions for analytics and reporting

-- Function to get system health over time
CREATE OR REPLACE FUNCTION get_system_health_trend(
    hours_back INT DEFAULT 24,
    sample_interval_minutes INT DEFAULT 60
)
RETURNS TABLE (
    time_bucket TIMESTAMP WITH TIME ZONE,
    avg_response_time FLOAT,
    avg_error_rate FLOAT,
    avg_throughput FLOAT,
    healthy_percentage FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date_trunc('hour', timestamp) as time_bucket,
        AVG(avg_response_time) as avg_response_time,
        AVG(error_rate) as avg_error_rate,
        AVG(throughput) as avg_throughput,
        (COUNT(*) FILTER (WHERE overall_status = 'healthy') * 100.0 / COUNT(*)) as healthy_percentage
    FROM system_health_snapshots
    WHERE timestamp >= NOW() - INTERVAL '1 hour' * hours_back
    GROUP BY date_trunc('hour', timestamp)
    ORDER BY time_bucket DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get error summary
CREATE OR REPLACE FUNCTION get_error_summary(
    hours_back INT DEFAULT 24
)
RETURNS TABLE (
    component TEXT,
    error_type TEXT,
    error_count BIGINT,
    last_occurrence TIMESTAMP WITH TIME ZONE,
    resolved_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        et.component,
        et.error_type,
        COUNT(*) as error_count,
        MAX(et.timestamp) as last_occurrence,
        COUNT(*) FILTER (WHERE et.resolved = TRUE) as resolved_count
    FROM error_tracking et
    WHERE et.timestamp >= NOW() - INTERVAL '1 hour' * hours_back
    GROUP BY et.component, et.error_type
    ORDER BY error_count DESC, last_occurrence DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get performance metrics summary
CREATE OR REPLACE FUNCTION get_performance_summary(
    component_name TEXT DEFAULT NULL,
    hours_back INT DEFAULT 24
)
RETURNS TABLE (
    metric_name TEXT,
    avg_value FLOAT,
    min_value FLOAT,
    max_value FLOAT,
    sample_count BIGINT,
    unit TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.name as metric_name,
        AVG(pm.value) as avg_value,
        MIN(pm.value) as min_value,
        MAX(pm.value) as max_value,
        COUNT(*) as sample_count,
        pm.unit
    FROM performance_metrics pm
    WHERE pm.timestamp >= NOW() - INTERVAL '1 hour' * hours_back
        AND (component_name IS NULL OR pm.component = component_name)
    GROUP BY pm.name, pm.unit
    ORDER BY pm.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get query analytics
CREATE OR REPLACE FUNCTION get_query_analytics_summary(
    hours_back INT DEFAULT 24
)
RETURNS TABLE (
    query_type TEXT,
    search_strategy TEXT,
    total_queries BIGINT,
    avg_response_time FLOAT,
    avg_confidence FLOAT,
    avg_results FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qa.query_type,
        qa.search_strategy,
        COUNT(*) as total_queries,
        AVG(qa.response_time_ms) as avg_response_time,
        AVG(qa.confidence_score) as avg_confidence,
        AVG(qa.result_count) as avg_results
    FROM query_analytics qa
    WHERE qa.created_at >= NOW() - INTERVAL '1 hour' * hours_back
    GROUP BY qa.query_type, qa.search_strategy
    ORDER BY total_queries DESC;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all data
CREATE POLICY "Service role can access all logs" ON system_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all metrics" ON performance_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all analytics" ON query_analytics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all health data" ON system_health_snapshots
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all errors" ON error_tracking
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all activity" ON user_activity
    FOR ALL USING (auth.role() = 'service_role');

-- Create a cleanup function to remove old data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data(
    days_to_keep INT DEFAULT 30
)
RETURNS VOID AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_date := NOW() - INTERVAL '1 day' * days_to_keep;
    
    -- Clean up old logs (keep errors longer)
    DELETE FROM system_logs 
    WHERE created_at < cutoff_date AND level != 'error';
    
    DELETE FROM system_logs 
    WHERE created_at < (cutoff_date - INTERVAL '7 days') AND level = 'error';
    
    -- Clean up old metrics
    DELETE FROM performance_metrics 
    WHERE created_at < cutoff_date;
    
    -- Clean up old health snapshots
    DELETE FROM system_health_snapshots 
    WHERE created_at < cutoff_date;
    
    -- Clean up resolved errors older than cutoff
    DELETE FROM error_tracking 
    WHERE created_at < cutoff_date AND resolved = TRUE;
    
    -- Clean up old user activity
    DELETE FROM user_activity 
    WHERE created_at < cutoff_date;
END;
$$ LANGUAGE plpgsql;