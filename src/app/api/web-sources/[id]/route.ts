import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';
import { webCrawlerService } from '@/utils/webCrawlerService';
import { monitoringService } from '@/utils/monitoringService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceId = params.id;

    const { data: source, error } = await supabaseServer
      .from('web_sources')
      .select(`
        *,
        crawl_jobs(
          id, job_type, status, priority, started_at, completed_at,
          pages_crawled, pages_processed, pages_failed,
          documents_created, documents_updated, error_message,
          total_duration_ms, created_at
        ),
        web_pages(
          id, url, title, status_code, processing_status,
          content_length, crawled_at, depth
        )
      `)
      .eq('id', sourceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Web source not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Get recent activity summary
    const { data: recentPages, error: pagesError } = await supabaseServer
      .from('web_pages')
      .select('processing_status, crawled_at')
      .eq('source_id', sourceId)
      .order('crawled_at', { ascending: false })
      .limit(100);

    const summary = {
      totalPages: source.web_pages?.length || 0,
      recentActivity: recentPages || [],
      lastCrawlJob: source.crawl_jobs?.[0] || null,
      statusCounts: (recentPages || []).reduce((acc: any, page) => {
        acc[page.processing_status] = (acc[page.processing_status] || 0) + 1;
        return acc;
      }, {}),
    };

    return NextResponse.json({
      success: true,
      data: {
        ...source,
        summary,
      },
    });

  } catch (error) {
    console.error('Get web source error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get web source',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceId = params.id;
    const body = await request.json();

    const {
      title,
      description,
      crawlFrequency,
      maxDepth,
      respectRobotsTxt,
      followRedirects,
      includePatterns,
      excludePatterns,
      contentTypes,
      tags,
      priority,
      extractImages,
      followExternalLinks,
      maxFileSizeMB,
      status,
    } = body;

    await monitoringService.log({
      level: 'info',
      component: 'web_sources',
      action: 'update_source',
      message: `Updating web source: ${sourceId}`,
      metadata: { sourceId, changes: Object.keys(body) },
    });

    const updateData: any = {};
    
    // Only update provided fields
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (crawlFrequency !== undefined) updateData.crawl_frequency = crawlFrequency;
    if (maxDepth !== undefined) updateData.max_depth = maxDepth;
    if (respectRobotsTxt !== undefined) updateData.respect_robots_txt = respectRobotsTxt;
    if (followRedirects !== undefined) updateData.follow_redirects = followRedirects;
    if (includePatterns !== undefined) updateData.include_patterns = includePatterns;
    if (excludePatterns !== undefined) updateData.exclude_patterns = excludePatterns;
    if (contentTypes !== undefined) updateData.content_types = contentTypes;
    if (tags !== undefined) updateData.tags = tags;
    if (priority !== undefined) updateData.priority = priority;
    if (extractImages !== undefined) updateData.extract_images = extractImages;
    if (followExternalLinks !== undefined) updateData.follow_external_links = followExternalLinks;
    if (maxFileSizeMB !== undefined) updateData.max_file_size_mb = maxFileSizeMB;
    if (status !== undefined) updateData.status = status;

    const { data: updatedSource, error } = await supabaseServer
      .from('web_sources')
      .update(updateData)
      .eq('id', sourceId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Web source not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    await monitoringService.log({
      level: 'info',
      component: 'web_sources',
      action: 'source_updated',
      message: `Web source updated successfully: ${sourceId}`,
      metadata: { sourceId, updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json({
      success: true,
      data: updatedSource,
      message: 'Web source updated successfully',
    });

  } catch (error) {
    console.error('Update web source error:', error);

    await monitoringService.log({
      level: 'error',
      component: 'web_sources',
      action: 'update_source_failed',
      message: `Failed to update web source: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: { sourceId: params.id, error },
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to update web source',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceId = params.id;

    await monitoringService.log({
      level: 'info',
      component: 'web_sources',
      action: 'delete_source',
      message: `Deleting web source: ${sourceId}`,
      metadata: { sourceId },
    });

    // Check if source exists and get info
    const { data: source, error: getError } = await supabaseServer
      .from('web_sources')
      .select('url, domain, page_count')
      .eq('id', sourceId)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Web source not found' },
          { status: 404 }
        );
      }
      throw getError;
    }

    // Delete the source (cascade will handle related records)
    const { error: deleteError } = await supabaseServer
      .from('web_sources')
      .delete()
      .eq('id', sourceId);

    if (deleteError) {
      throw deleteError;
    }

    await monitoringService.log({
      level: 'info',
      component: 'web_sources',
      action: 'source_deleted',
      message: `Web source deleted successfully: ${sourceId}`,
      metadata: { 
        sourceId, 
        url: source.url, 
        domain: source.domain,
        pageCount: source.page_count 
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Web source deleted successfully',
    });

  } catch (error) {
    console.error('Delete web source error:', error);

    await monitoringService.log({
      level: 'error',
      component: 'web_sources',
      action: 'delete_source_failed',
      message: `Failed to delete web source: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: { sourceId: params.id, error },
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to delete web source',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}