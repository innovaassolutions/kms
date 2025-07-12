import { createHash } from 'crypto';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { embeddingService } from './enhancedEmbeddingService';
import { monitoringService } from './monitoringService';
import { supabaseServer } from './supabase/serverClients';

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  respectRobotsTxt?: boolean;
  followRedirects?: boolean;
  rateLimit?: number;
  timeout?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  contentTypes?: string[];
  extractImages?: boolean;
  followExternalLinks?: boolean;
  maxFileSizeMB?: number;
}

export interface CrawlResult {
  success: boolean;
  pagesCrawled: number;
  pagesProcessed: number;
  documentsCreated: number;
  documentsUpdated: number;
  errors: string[];
  duration: number;
}

export interface WebPageContent {
  url: string;
  title: string;
  content: string;
  html: string;
  author?: string;
  publishedDate?: Date;
  keywords: string[];
  description?: string;
  links: string[];
  images: Array<{ src: string; alt: string; caption?: string }>;
  language?: string;
  contentHash: string;
  contentLength: number;
  wordCount: number;
}

export interface RobotsTxt {
  isAllowed: (url: string, userAgent?: string) => boolean;
  crawlDelay: number;
  sitemaps: string[];
}

export class WebCrawlerService {
  private readonly userAgent = 'KMS-Crawler/1.0 (+https://your-domain.com/crawler)';
  private readonly defaultRateLimit = 1000; // ms between requests
  private readonly defaultTimeout = 30000; // 30 seconds
  private robotsCache = new Map<string, RobotsTxt>();
  private visitedUrls = new Set<string>();

  /**
   * Crawl a web source and process all discovered pages
   */
  async crawlWebSource(
    sourceId: string,
    startUrl: string,
    options: CrawlOptions = {}
  ): Promise<CrawlResult> {
    const startTime = Date.now();
    const result: CrawlResult = {
      success: false,
      pagesCrawled: 0,
      pagesProcessed: 0,
      documentsCreated: 0,
      documentsUpdated: 0,
      errors: [],
      duration: 0,
    };

    try {
      await monitoringService.log({
        level: 'info',
        component: 'web_crawler',
        action: 'crawl_start',
        message: `Starting crawl for source ${sourceId}`,
        metadata: { sourceId, startUrl, options },
      });

      // Initialize crawl job
      const { data: crawlJob, error: jobError } = await supabaseServer
        .from('crawl_jobs')
        .insert({
          source_id: sourceId,
          job_type: 'manual',
          status: 'running',
          started_at: new Date().toISOString(),
          max_pages: options.maxPages,
        })
        .select()
        .single();

      if (jobError || !crawlJob) {
        throw new Error(`Failed to create crawl job: ${jobError?.message}`);
      }

      // Reset visited URLs for this crawl
      this.visitedUrls.clear();

      // Get robots.txt if respecting it
      let robotsTxt: RobotsTxt | null = null;
      if (options.respectRobotsTxt !== false) {
        robotsTxt = await this.getRobotsTxt(startUrl);
      }

      // Start recursive crawling
      const urlQueue = [{ url: startUrl, depth: 0, parentUrl: null }];
      const maxDepth = options.maxDepth || 3;
      const maxPages = options.maxPages || 100;

      while (urlQueue.length > 0 && result.pagesCrawled < maxPages) {
        const { url, depth, parentUrl } = urlQueue.shift()!;

        // Skip if already visited
        if (this.visitedUrls.has(url)) continue;

        // Skip if depth exceeded
        if (depth > maxDepth) continue;

        // Check robots.txt
        if (robotsTxt && !robotsTxt.isAllowed(url)) {
          console.log(`Robots.txt disallows crawling: ${url}`);
          continue;
        }

        try {
          // Apply rate limiting
          if (result.pagesCrawled > 0) {
            const delay = robotsTxt?.crawlDelay || options.rateLimit || this.defaultRateLimit;
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // Crawl the page
          const pageContent = await this.crawlPage(url, options);
          if (!pageContent) continue;

          this.visitedUrls.add(url);
          result.pagesCrawled++;

          // Store page in database
          const { data: webPage, error: pageError } = await supabaseServer
            .from('web_pages')
            .upsert({
              source_id: sourceId,
              url,
              parent_url: parentUrl,
              depth,
              title: pageContent.title,
              meta_description: pageContent.description,
              content_text: pageContent.content,
              content_html: pageContent.html,
              content_hash: pageContent.contentHash,
              content_length: pageContent.contentLength,
              status_code: 200,
              content_type: 'text/html',
              language: pageContent.language,
              author: pageContent.author,
              published_date: pageContent.publishedDate?.toISOString(),
              keywords: pageContent.keywords,
              extracted_links: pageContent.links,
              images: pageContent.images,
              crawled_at: new Date().toISOString(),
              processing_status: 'pending',
            })
            .select()
            .single();

          if (pageError) {
            result.errors.push(`Failed to store page ${url}: ${pageError.message}`);
            continue;
          }

          // Process content and create document
          await this.processWebPageContent(webPage.id, pageContent, sourceId);
          result.pagesProcessed++;

          // Add discovered links to queue
          if (depth < maxDepth && options.followExternalLinks !== false) {
            const newUrls = this.filterAndNormalizeUrls(
              pageContent.links,
              url,
              options
            );

            for (const newUrl of newUrls) {
              if (!this.visitedUrls.has(newUrl) && !urlQueue.some(item => item.url === newUrl)) {
                urlQueue.push({ url: newUrl, depth: depth + 1, parentUrl: url });
              }
            }
          }

          // Update crawl job progress
          await supabaseServer
            .from('crawl_jobs')
            .update({
              pages_crawled: result.pagesCrawled,
              pages_processed: result.pagesProcessed,
              updated_at: new Date().toISOString(),
            })
            .eq('id', crawlJob.id);

        } catch (error) {
          const errorMsg = `Failed to crawl ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Update source statistics
      await supabaseServer
        .from('web_sources')
        .update({
          last_crawled: new Date().toISOString(),
          last_success: new Date().toISOString(),
          page_count: result.pagesCrawled,
          total_documents: result.pagesProcessed,
          next_crawl: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default 24h
          error_count: 0,
        })
        .eq('id', sourceId);

      // Complete crawl job
      result.duration = Date.now() - startTime;
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

      result.success = true;

      await monitoringService.log({
        level: 'info',
        component: 'web_crawler',
        action: 'crawl_complete',
        message: `Crawl completed for source ${sourceId}`,
        metadata: {
          sourceId,
          pagesCrawled: result.pagesCrawled,
          pagesProcessed: result.pagesProcessed,
          duration: result.duration,
        },
      });

    } catch (error) {
      const errorMsg = `Crawl failed for source ${sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      result.duration = Date.now() - startTime;

      await monitoringService.log({
        level: 'error',
        component: 'web_crawler',
        action: 'crawl_failed',
        message: errorMsg,
        metadata: { sourceId, error },
      });

      // Update source with error
      await supabaseServer
        .from('web_sources')
        .update({
          last_error: errorMsg,
          error_count: 1, // Will be incremented by trigger
        })
        .eq('id', sourceId);
    }

    return result;
  }

  /**
   * Crawl a single web page and extract content
   */
  async crawlPage(url: string, options: CrawlOptions = {}): Promise<WebPageContent | null> {
    try {
      const timeout = options.timeout || this.defaultTimeout;
      const maxSize = (options.maxFileSizeMB || 50) * 1024 * 1024;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        signal: controller.signal,
        redirect: options.followRedirects !== false ? 'follow' : 'manual',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`HTTP ${response.status} for ${url}`);
        return null;
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        console.log(`Skipping non-HTML content: ${url} (${contentType})`);
        return null;
      }

      // Check content size
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > maxSize) {
        console.warn(`Content too large: ${url} (${contentLength} bytes)`);
        return null;
      }

      const html = await response.text();
      
      // Check actual size after download
      if (html.length > maxSize) {
        console.warn(`Content too large after download: ${url} (${html.length} bytes)`);
        return null;
      }

      return this.extractContentFromHtml(html, url);

    } catch (error) {
      console.error(`Failed to crawl page ${url}:`, error);
      return null;
    }
  }

  /**
   * Extract structured content from HTML
   */
  private extractContentFromHtml(html: string, url: string): WebPageContent {
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Use Readability for main content extraction
    const reader = new Readability(document);
    const article = reader.parse();

    // Extract metadata
    const title = article?.title || 
                 document.querySelector('title')?.textContent?.trim() || 
                 document.querySelector('h1')?.textContent?.trim() || 
                 'Untitled';

    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                       document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                       '';

    const author = document.querySelector('meta[name="author"]')?.getAttribute('content') ||
                  document.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
                  document.querySelector('[rel="author"]')?.textContent?.trim();

    const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || [];

    const language = document.documentElement.lang || 
                    document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ||
                    'en';

    // Extract published date
    let publishedDate: Date | undefined;
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'time[datetime]',
      '[datetime]'
    ];

    for (const selector of dateSelectors) {
      const element = document.querySelector(selector);
      const dateStr = element?.getAttribute('content') || element?.getAttribute('datetime');
      if (dateStr) {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          publishedDate = parsed;
          break;
        }
      }
    }

    // Extract links
    const links: string[] = [];
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, url).href;
          links.push(absoluteUrl);
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });

    // Extract images
    const images: Array<{ src: string; alt: string; caption?: string }> = [];
    document.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt') || '';
      if (src) {
        try {
          const absoluteUrl = new URL(src, url).href;
          images.push({ src: absoluteUrl, alt });
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });

    // Get clean content
    const content = article?.textContent || document.body?.textContent || '';
    const cleanContent = content.replace(/\s+/g, ' ').trim();

    // Generate content hash
    const contentHash = createHash('sha256').update(cleanContent).digest('hex');

    // Count words
    const wordCount = cleanContent.split(/\s+/).filter(word => word.length > 0).length;

    return {
      url,
      title: title.substring(0, 500), // Limit title length
      content: cleanContent,
      html: html.substring(0, 100000), // Limit stored HTML
      author,
      publishedDate,
      keywords: keywords.slice(0, 20), // Limit keywords
      description: description.substring(0, 1000), // Limit description
      links: [...new Set(links)].slice(0, 100), // Dedupe and limit links
      images: images.slice(0, 20), // Limit images
      language,
      contentHash,
      contentLength: cleanContent.length,
      wordCount,
    };
  }

  /**
   * Process web page content and create document
   */
  private async processWebPageContent(
    pageId: string,
    content: WebPageContent,
    sourceId: string
  ): Promise<void> {
    try {
      // Check for content changes
      const { data: changeResult } = await supabaseServer.rpc('detect_content_changes', {
        target_page_id: pageId,
        new_content_hash: content.contentHash,
        new_content: content.content,
      });

      const hasChanges = changeResult?.[0]?.has_changes || true;
      const isSignificant = changeResult?.[0]?.significant_change || true;
      const versionNumber = changeResult?.[0]?.version_number || 1;

      // Store content version
      await supabaseServer
        .from('web_content_versions')
        .insert({
          page_id: pageId,
          version_number: versionNumber,
          content_hash: content.contentHash,
          content_text: content.content,
          content_html: content.html,
          change_percentage: changeResult?.[0]?.change_percentage || 0,
          significant_change: isSignificant,
          content_length: content.contentLength,
          word_count: content.wordCount,
        });

      // Create or update document if significant changes
      if (hasChanges && isSignificant) {
        const documentData = {
          title: content.title,
          type: 'knowledge' as const,
          content_text: content.content,
          media_type: 'text' as const,
          tags: ['web-crawled', ...content.keywords.slice(0, 5)],
          processing_metadata: {
            source_type: 'web_crawl',
            source_id: sourceId,
            page_id: pageId,
            url: content.url,
            author: content.author,
            published_date: content.publishedDate?.toISOString(),
            language: content.language,
            word_count: content.wordCount,
            crawled_at: new Date().toISOString(),
            version_number: versionNumber,
          },
        };

        // Check if document already exists for this page
        const { data: existingDoc } = await supabaseServer
          .from('documents')
          .select('id')
          .eq('processing_metadata->page_id', pageId)
          .single();

        let documentId: string;

        if (existingDoc) {
          // Update existing document
          const { data: updatedDoc, error: updateError } = await supabaseServer
            .from('documents')
            .update(documentData)
            .eq('id', existingDoc.id)
            .select('id')
            .single();

          if (updateError) throw updateError;
          documentId = updatedDoc.id;
        } else {
          // Create new document
          const { data: newDoc, error: createError } = await supabaseServer
            .from('documents')
            .insert(documentData)
            .select('id')
            .single();

          if (createError) throw createError;
          documentId = newDoc.id;
        }

        // Update page with document reference
        await supabaseServer
          .from('web_pages')
          .update({
            document_id: documentId,
            processing_status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', pageId);

        // Generate embeddings
        if (content.content.length > 50) {
          const embeddingResult = await embeddingService.generateEmbedding(content.content);
          
          await supabaseServer
            .from('documents')
            .update({ embedding: embeddingResult.embedding })
            .eq('id', documentId);

          await supabaseServer
            .from('web_pages')
            .update({ embedding_generated: true })
            .eq('id', pageId);
        }
      } else {
        // No significant changes, just mark as processed
        await supabaseServer
          .from('web_pages')
          .update({
            processing_status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', pageId);
      }

    } catch (error) {
      console.error(`Failed to process web page content for ${pageId}:`, error);
      
      await supabaseServer
        .from('web_pages')
        .update({
          processing_status: 'error',
          processed_at: new Date().toISOString(),
        })
        .eq('id', pageId);
    }
  }

  /**
   * Get and parse robots.txt
   */
  private async getRobotsTxt(url: string): Promise<RobotsTxt | null> {
    try {
      const urlObj = new URL(url);
      const domain = `${urlObj.protocol}//${urlObj.host}`;
      
      // Check cache
      if (this.robotsCache.has(domain)) {
        return this.robotsCache.get(domain)!;
      }

      const robotsUrl = `${domain}/robots.txt`;
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000,
      });

      if (!response.ok) {
        // No robots.txt, allow everything
        const defaultRobots: RobotsTxt = {
          isAllowed: () => true,
          crawlDelay: 1000,
          sitemaps: [],
        };
        this.robotsCache.set(domain, defaultRobots);
        return defaultRobots;
      }

      const robotsTxt = await response.text();
      const parsed = this.parseRobotsTxt(robotsTxt);
      this.robotsCache.set(domain, parsed);
      
      return parsed;

    } catch (error) {
      console.error(`Failed to fetch robots.txt for ${url}:`, error);
      return null;
    }
  }

  /**
   * Parse robots.txt content
   */
  private parseRobotsTxt(content: string): RobotsTxt {
    const lines = content.split('\n').map(line => line.trim().toLowerCase());
    const disallowedPaths: string[] = [];
    let crawlDelay = 1000;
    const sitemaps: string[] = [];

    let currentUserAgent = '';
    let isRelevantSection = false;

    for (const line of lines) {
      if (line.startsWith('#') || line === '') continue;

      if (line.startsWith('user-agent:')) {
        currentUserAgent = line.split(':')[1].trim();
        isRelevantSection = currentUserAgent === '*' || currentUserAgent === 'kms-crawler';
      } else if (isRelevantSection) {
        if (line.startsWith('disallow:')) {
          const path = line.split(':')[1].trim();
          if (path) disallowedPaths.push(path);
        } else if (line.startsWith('crawl-delay:')) {
          const delay = parseInt(line.split(':')[1].trim());
          if (!isNaN(delay)) crawlDelay = delay * 1000;
        }
      } else if (line.startsWith('sitemap:')) {
        sitemaps.push(line.split(':')[1].trim());
      }
    }

    return {
      isAllowed: (url: string) => {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        return !disallowedPaths.some(disallowed => 
          disallowed === '/' ? false : path.startsWith(disallowed)
        );
      },
      crawlDelay,
      sitemaps,
    };
  }

  /**
   * Filter and normalize discovered URLs
   */
  private filterAndNormalizeUrls(
    urls: string[],
    baseUrl: string,
    options: CrawlOptions
  ): string[] {
    const baseUrlObj = new URL(baseUrl);
    const baseDomain = baseUrlObj.hostname;
    const filtered: string[] = [];

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        
        // Skip non-HTTP(S) URLs
        if (!['http:', 'https:'].includes(urlObj.protocol)) continue;

        // Check if external link following is allowed
        if (!options.followExternalLinks && urlObj.hostname !== baseDomain) continue;

        // Apply include patterns
        if (options.includePatterns?.length) {
          const matches = options.includePatterns.some(pattern => 
            new RegExp(pattern).test(url)
          );
          if (!matches) continue;
        }

        // Apply exclude patterns
        if (options.excludePatterns?.length) {
          const matches = options.excludePatterns.some(pattern => 
            new RegExp(pattern).test(url)
          );
          if (matches) continue;
        }

        // Remove fragment and normalize
        urlObj.hash = '';
        const normalizedUrl = urlObj.href;

        filtered.push(normalizedUrl);

      } catch (error) {
        // Invalid URL, skip
        continue;
      }
    }

    return [...new Set(filtered)]; // Remove duplicates
  }

  /**
   * Schedule crawl jobs for active sources
   */
  async scheduleCrawlJobs(): Promise<void> {
    try {
      const { data: sourcesToCrawl, error } = await supabaseServer.rpc('get_sources_to_crawl', {
        max_sources: 10,
      });

      if (error || !sourcesToCrawl) {
        console.error('Failed to get sources to crawl:', error);
        return;
      }

      for (const source of sourcesToCrawl) {
        await this.crawlWebSource(source.source_id, source.url, {
          maxDepth: 3,
          maxPages: 50,
          respectRobotsTxt: true,
          rateLimit: source.priority > 7 ? 500 : 1000, // Faster for high priority
        });
      }

    } catch (error) {
      console.error('Failed to schedule crawl jobs:', error);
    }
  }
}

// Export singleton instance
export const webCrawlerService = new WebCrawlerService();