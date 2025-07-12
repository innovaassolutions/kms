import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/utils/monitoringService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const component = searchParams.get('component');
    const name = searchParams.get('name');
    const startTime = searchParams.get('startTime') ? new Date(searchParams.get('startTime')!) : undefined;
    const endTime = searchParams.get('endTime') ? new Date(searchParams.get('endTime')!) : undefined;
    const aggregation = searchParams.get('aggregation') as 'avg' | 'sum' | 'min' | 'max' | 'count' | undefined;

    // Get metrics with filters
    const metrics = await monitoringService.getMetrics({
      component,
      name,
      startTime,
      endTime,
      aggregation,
    });

    return NextResponse.json({
      success: true,
      data: metrics,
      filters: {
        component,
        name,
        startTime: startTime?.toISOString(),
        endTime: endTime?.toISOString(),
        aggregation,
      },
      count: metrics.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Metrics API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const metrics = await request.json();
    
    // Validate input
    if (!Array.isArray(metrics)) {
      return NextResponse.json(
        { error: 'Metrics must be an array' },
        { status: 400 }
      );
    }

    // Record each metric
    const results = await Promise.allSettled(
      metrics.map(metric => monitoringService.recordMetric(metric))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: failed === 0,
      recorded: successful,
      failed,
      total: metrics.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Metrics recording error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to record metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    );
  }
}