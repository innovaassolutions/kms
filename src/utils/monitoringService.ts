import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  action: string;
  message: string;
  metadata?: any;
  duration?: number;
  userId?: string;
  sessionId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'bytes' | 'percentage';
  component: string;
  timestamp: Date;
  metadata?: any;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: ComponentHealth;
    search: ComponentHealth;
    embeddings: ComponentHealth;
    storage: ComponentHealth;
  };
  metrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
  timestamp: Date;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  errorRate?: number;
  lastChecked: Date;
  errors?: string[];
}

export class MonitoringService {
  private logBuffer: LogEntry[] = [];
  private metricsBuffer: PerformanceMetric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.startBufferFlush();
  }

  /**
   * Log an entry with structured data
   */
  async log(entry: LogEntry): Promise<void> {
    const enrichedEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      id: this.generateId(),
    };

    // Add to buffer for batch processing
    this.logBuffer.push(enrichedEntry);

    // Console log for immediate visibility
    const logMethod = entry.level === 'error' ? console.error : 
                     entry.level === 'warn' ? console.warn : console.log;
    
    logMethod(`[${entry.level.toUpperCase()}] ${entry.component}:${entry.action} - ${entry.message}`, 
              entry.metadata || '');

    // Flush if buffer is full or critical error
    if (this.logBuffer.length >= this.BUFFER_SIZE || entry.level === 'error') {
      await this.flushLogs();
    }
  }

  /**
   * Record a performance metric
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    const enrichedMetric = {
      ...metric,
      timestamp: new Date(),
      id: this.generateId(),
    };

    this.metricsBuffer.push(enrichedMetric);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      await this.flushMetrics();
    }
  }

  /**
   * Time a function execution and record metrics
   */
  async timeFunction<T>(
    name: string, 
    component: string, 
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      await this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        component,
        timestamp: new Date(),
      });

      await this.log({
        level: 'debug',
        component,
        action: name,
        message: `Completed successfully`,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.log({
        level: 'error',
        component,
        action: name,
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        metadata: { error: error instanceof Error ? error.stack : error },
      });

      throw error;
    }
  }

  /**
   * Check system health across all components
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const healthChecks = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkSearchHealth(),
      this.checkEmbeddingsHealth(),
      this.checkStorageHealth(),
    ]);

    const [database, search, embeddings, storage] = healthChecks.map(result =>
      result.status === 'fulfilled' ? result.value : {
        status: 'unhealthy' as const,
        responseTime: 0,
        errorRate: 100,
        lastChecked: new Date(),
        errors: [result.reason?.message || 'Health check failed'],
      }
    );

    // Calculate overall metrics
    const avgResponseTime = [database, search, embeddings, storage]
      .filter(c => c.responseTime)
      .reduce((sum, c) => sum + (c.responseTime || 0), 0) / 4;

    const avgErrorRate = [database, search, embeddings, storage]
      .reduce((sum, c) => sum + (c.errorRate || 0), 0) / 4;

    // Determine overall status
    const componentStatuses = [database.status, search.status, embeddings.status, storage.status];
    const overallStatus = componentStatuses.every(s => s === 'healthy') ? 'healthy' :
                         componentStatuses.some(s => s === 'unhealthy') ? 'unhealthy' : 'degraded';

    const health: SystemHealth = {
      status: overallStatus,
      components: { database, search, embeddings, storage },
      metrics: {
        responseTime: avgResponseTime,
        errorRate: avgErrorRate,
        throughput: await this.calculateThroughput(),
      },
      timestamp: new Date(),
    };

    // Log health status
    await this.log({
      level: overallStatus === 'healthy' ? 'info' : overallStatus === 'degraded' ? 'warn' : 'error',
      component: 'system',
      action: 'health_check',
      message: `System health: ${overallStatus}`,
      metadata: health,
    });

    return health;
  }

  /**
   * Get recent logs with filtering
   */
  async getLogs(
    filters: {
      level?: string;
      component?: string;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters.level) {
        query = query.eq('level', filters.level);
      }
      
      if (filters.component) {
        query = query.eq('component', filters.component);
      }
      
      if (filters.startTime) {
        query = query.gte('timestamp', filters.startTime.toISOString());
      }
      
      if (filters.endTime) {
        query = query.lte('timestamp', filters.endTime.toISOString());
      }

      query = query.limit(filters.limit || 100);

      const { data, error } = await query;
      
      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to retrieve logs:', error);
      return [];
    }
  }

  /**
   * Get performance metrics with aggregation
   */
  async getMetrics(
    filters: {
      component?: string;
      name?: string;
      startTime?: Date;
      endTime?: Date;
      aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
    } = {}
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('performance_metrics')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters.component) {
        query = query.eq('component', filters.component);
      }
      
      if (filters.name) {
        query = query.eq('name', filters.name);
      }
      
      if (filters.startTime) {
        query = query.gte('timestamp', filters.startTime.toISOString());
      }
      
      if (filters.endTime) {
        query = query.lte('timestamp', filters.endTime.toISOString());
      }

      const { data, error } = await query;
      
      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to retrieve metrics:', error);
      return [];
    }
  }

  /**
   * Private methods
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('count(*)')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        throw error;
      }

      return {
        status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy',
        responseTime,
        errorRate: 0,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastChecked: new Date(),
        errors: [error instanceof Error ? error.message : 'Database check failed'],
      };
    }
  }

  private async checkSearchHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Test vector search functionality
      const testEmbedding = Array.from({ length: 1536 }, () => Math.random());
      
      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: testEmbedding,
        match_threshold: 0.1,
        match_count: 1
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        throw error;
      }

      return {
        status: responseTime < 2000 ? 'healthy' : responseTime < 5000 ? 'degraded' : 'unhealthy',
        responseTime,
        errorRate: 0,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastChecked: new Date(),
        errors: [error instanceof Error ? error.message : 'Search check failed'],
      };
    }
  }

  private async checkEmbeddingsHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Test OpenAI embeddings API
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: 'health check',
          model: 'text-embedding-3-small',
        }),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      return {
        status: responseTime < 3000 ? 'healthy' : responseTime < 10000 ? 'degraded' : 'unhealthy',
        responseTime,
        errorRate: 0,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastChecked: new Date(),
        errors: [error instanceof Error ? error.message : 'Embeddings API check failed'],
      };
    }
  }

  private async checkStorageHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Test Supabase storage
      const { data, error } = await supabase.storage
        .from('documents')
        .list('', { limit: 1 });

      const responseTime = Date.now() - startTime;

      if (error) {
        throw error;
      }

      return {
        status: responseTime < 2000 ? 'healthy' : responseTime < 5000 ? 'degraded' : 'unhealthy',
        responseTime,
        errorRate: 0,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastChecked: new Date(),
        errors: [error instanceof Error ? error.message : 'Storage check failed'],
      };
    }
  }

  private async calculateThroughput(): Promise<number> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact' })
        .gte('timestamp', oneDayAgo.toISOString())
        .eq('component', 'api');

      if (error || !data) {
        return 0;
      }

      // Return requests per hour
      return data.length / 24;
    } catch (error) {
      return 0;
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];

      // Create logs table if it doesn't exist
      await this.ensureLogsTableExists();

      const { error } = await supabase
        .from('system_logs')
        .insert(logsToFlush);

      if (error) {
        console.error('Failed to flush logs:', error);
        // Add logs back to buffer for retry
        this.logBuffer.unshift(...logsToFlush);
      }
    } catch (error) {
      console.error('Log flush failed:', error);
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      const metricsToFlush = [...this.metricsBuffer];
      this.metricsBuffer = [];

      // Create metrics table if it doesn't exist
      await this.ensureMetricsTableExists();

      const { error } = await supabase
        .from('performance_metrics')
        .insert(metricsToFlush);

      if (error) {
        console.error('Failed to flush metrics:', error);
        // Add metrics back to buffer for retry
        this.metricsBuffer.unshift(...metricsToFlush);
      }
    } catch (error) {
      console.error('Metrics flush failed:', error);
    }
  }

  private async ensureLogsTableExists(): Promise<void> {
    // This would typically be handled by migrations
    // For now, we'll rely on the table existing
  }

  private async ensureMetricsTableExists(): Promise<void> {
    // This would typically be handled by migrations
    // For now, we'll rely on the table existing
  }

  private startBufferFlush(): void {
    this.flushInterval = setInterval(async () => {
      await Promise.all([
        this.flushLogs(),
        this.flushMetrics(),
      ]);
    }, this.FLUSH_INTERVAL);
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    // Flush remaining data
    this.flushLogs();
    this.flushMetrics();
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();