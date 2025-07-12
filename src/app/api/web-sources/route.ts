import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';
import { webCrawlerService } from '@/utils/webCrawlerService';
import { monitoringService } from '@/utils/monitoringService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const domain = searchParams.get('domain');
    const offset = (page - 1) * limit;

    let query = supabaseServer
      .from('web_sources')
      .select(`
        *,
        crawl_jobs(
          id, status, started_at, completed_at, 
          pages_crawled, pages_processed, error_message
        )
      `)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (domain) {
      query = query.eq('domain', domain);
    }

    const { data: sources, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get summary statistics
    const { data: stats, error: statsError } = await supabaseServer
      .from('web_sources')
      .select('status, domain')
      .then(result => {
        if (result.error) throw result.error;
        
        const statusCounts = result.data.reduce((acc: any, source) => {
          acc[source.status] = (acc[source.status] || 0) + 1;
          return acc;
        }, {});

        const domainCounts = result.data.reduce((acc: any, source) => {
          acc[source.domain] = (acc[source.domain] || 0) + 1;
          return acc;
        }, {});

        return {
          data: {
            statusCounts,
            domainCounts,
            totalSources: result.data.length,
          },
          error: null,
        };
      });

    if (statsError) {
      console.error('Failed to get stats:', statsError);
    }

    return NextResponse.json({
      success: true,
      data: {
        sources: sources || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
        stats: stats || {
          statusCounts: {},
          domainCounts: {},
          totalSources: 0,
        },
      },
    });

  } catch (error) {
    console.error('Get web sources error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get web sources',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      url,
      title,
      description,
      crawlFrequency = '24 hours',
      maxDepth = 3,
      respectRobotsTxt = true,
      followRedirects = true,
      includePatterns = [],
      excludePatterns = [],
      contentTypes = ['text/html'],
      tags = [],
      priority = 5,
      extractImages = false,
      followExternalLinks = false,
      maxFileSizeMB = 50,
      startCrawlImmediately = false,
    } = body;

    // Validate required fields
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const domain = parsedUrl.hostname;

    await monitoringService.log({
      level: 'info',
      component: 'web_sources',
      action: 'create_source',
      message: `Creating new web source: ${url}`,
      metadata: { url, domain, priority },
    });

    // Create web source
    const { data: webSource, error: createError } = await supabaseServer
      .from('web_sources')
      .insert({
        url: parsedUrl.href,
        domain,
        title,
        description,
        crawl_frequency: crawlFrequency,
        max_depth: maxDepth,
        follow_redirects: followRedirects,
        respect_robots_txt: respectRobotsTxt,
        include_patterns: includePatterns,
        exclude_patterns: excludePatterns,
        content_types: contentTypes,
        tags,
        priority,
        extract_images: extractImages,
        follow_external_links: followExternalLinks,
        max_file_size_mb: maxFileSizeMB,
        next_crawl: startCrawlImmediately ? new Date() : new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active',
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Start immediate crawl if requested
    if (startCrawlImmediately) {
      // Don't await - run in background
      webCrawlerService.crawlWebSource(webSource.id, webSource.url, {
        maxDepth,
        respectRobotsTxt,
        followRedirects,
        includePatterns,
        excludePatterns,
        contentTypes,
        extractImages,
        followExternalLinks,
        maxFileSizeMB,
      }).catch(error => {
        console.error('Background crawl failed:', error);
      });
    }

    await monitoringService.log({
      level: 'info',
      component: 'web_sources',
      action: 'source_created',
      message: `Web source created successfully: ${webSource.id}`,
      metadata: { sourceId: webSource.id, url, startCrawlImmediately },
    });

    return NextResponse.json({
      success: true,
      data: webSource,
      message: startCrawlImmediately 
        ? 'Web source created and crawl started' 
        : 'Web source created successfully',
    });

  } catch (error) {
    console.error('Create web source error:', error);

    await monitoringService.log({
      level: 'error',
      component: 'web_sources',
      action: 'create_source_failed',
      message: `Failed to create web source: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: { error },
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to create web source',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}