import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';
import { webCrawlerService } from '@/utils/webCrawlerService';
import { monitoringService } from '@/utils/monitoringService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceId = params.id;
    const body = await request.json();
    const {
      priority = 5,
      maxPages,
      specificUrls = [],
      jobType = 'manual',
      overrideOptions = {},
    } = body;

    await monitoringService.log({
      level: 'info',
      component: 'web_crawler',
      action: 'manual_crawl_start',
      message: `Starting manual crawl for source: ${sourceId}`,
      metadata: { sourceId, jobType, maxPages },
    });

    // Get source configuration
    const { data: source, error: sourceError } = await supabaseServer
      .from('web_sources')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (sourceError) {
      if (sourceError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Web source not found' },
          { status: 404 }
        );
      }
      throw sourceError;
    }

    if (source.status !== 'active') {
      return NextResponse.json(
        { error: 'Web source is not active' },
        { status: 400 }
      );
    }

    // Check if there's already a running crawl job
    const { data: runningJobs, error: jobsError } = await supabaseServer
      .from('crawl_jobs')
      .select('id, status')
      .eq('source_id', sourceId)
      .in('status', ['pending', 'running'])
      .limit(1);

    if (jobsError) {
      throw jobsError;
    }

    if (runningJobs && runningJobs.length > 0) {
      return NextResponse.json(
        { error: 'A crawl job is already running for this source' },
        { status: 409 }
      );
    }

    // Create crawl job
    const { data: crawlJob, error: createJobError } = await supabaseServer
      .from('crawl_jobs')
      .insert({
        source_id: sourceId,
        job_type: jobType,
        priority,
        max_pages: maxPages,
        specific_urls: specificUrls.length > 0 ? specificUrls : null,
        status: 'pending',
      })
      .select()
      .single();

    if (createJobError) {
      throw createJobError;
    }

    // Prepare crawl options
    const crawlOptions = {
      maxDepth: source.max_depth,
      maxPages: maxPages || 100,
      respectRobotsTxt: source.respect_robots_txt,
      followRedirects: source.follow_redirects,
      includePatterns: source.include_patterns,
      excludePatterns: source.exclude_patterns,
      contentTypes: source.content_types,
      extractImages: source.extract_images,
      followExternalLinks: source.follow_external_links,
      maxFileSizeMB: source.max_file_size_mb,
      rateLimit: priority > 7 ? 500 : 1000, // Faster for high priority
      ...overrideOptions, // Allow overriding specific options
    };

    // Start crawling (don't await - run in background)
    const crawlPromise = webCrawlerService.crawlWebSource(
      sourceId,
      specificUrls.length > 0 ? specificUrls[0] : source.url,
      crawlOptions
    );

    // Handle background crawl completion
    crawlPromise
      .then(async (result) => {
        await supabaseServer
          .from('crawl_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            pages_crawled: result.pagesCrawled,
            pages_processed: result.pagesProcessed,
            documents_created: result.documentsCreated,
            documents_updated: result.documentsUpdated,
            total_duration_ms: result.duration,
          })
          .eq('id', crawlJob.id);

        await monitoringService.log({
          level: 'info',
          component: 'web_crawler',
          action: 'manual_crawl_complete',
          message: `Manual crawl completed for source: ${sourceId}`,
          metadata: { 
            sourceId, 
            jobId: crawlJob.id,
            pagesCrawled: result.pagesCrawled,
            pagesProcessed: result.pagesProcessed,
            duration: result.duration,
          },
        });
      })
      .catch(async (error) => {
        await supabaseServer
          .from('crawl_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', crawlJob.id);

        await monitoringService.log({
          level: 'error',
          component: 'web_crawler',
          action: 'manual_crawl_failed',
          message: `Manual crawl failed for source: ${sourceId}`,
          metadata: { sourceId, jobId: crawlJob.id, error },
        });
      });

    // Update job status to running
    await supabaseServer
      .from('crawl_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', crawlJob.id);

    return NextResponse.json({
      success: true,
      data: {
        jobId: crawlJob.id,
        sourceId,
        status: 'running',
        crawlOptions,
        estimatedPages: maxPages || 'unlimited',
      },
      message: 'Crawl job started successfully',
    });

  } catch (error) {
    console.error('Start crawl error:', error);

    await monitoringService.log({
      level: 'error',
      component: 'web_crawler',
      action: 'manual_crawl_start_failed',
      message: `Failed to start manual crawl: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: { sourceId: params.id, error },
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to start crawl job',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get recent crawl jobs for this source
    const { data: crawlJobs, error } = await supabaseServer
      .from('crawl_jobs')
      .select('*')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    // Get current running job if any
    const runningJob = crawlJobs?.find(job => job.status === 'running');

    // Get job statistics
    const stats = {
      totalJobs: crawlJobs?.length || 0,
      completedJobs: crawlJobs?.filter(job => job.status === 'completed').length || 0,
      failedJobs: crawlJobs?.filter(job => job.status === 'failed').length || 0,
      runningJobs: crawlJobs?.filter(job => job.status === 'running').length || 0,
      pendingJobs: crawlJobs?.filter(job => job.status === 'pending').length || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        crawlJobs: crawlJobs || [],
        currentJob: runningJob || null,
        stats,
      },
    });

  } catch (error) {
    console.error('Get crawl jobs error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get crawl jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}