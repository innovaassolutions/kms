import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/utils/monitoringService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const level = searchParams.get('level');
    const component = searchParams.get('component');
    const startTime = searchParams.get('startTime') ? new Date(searchParams.get('startTime')!) : undefined;
    const endTime = searchParams.get('endTime') ? new Date(searchParams.get('endTime')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    // Validate limit
    if (limit > 1000) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 1000' },
        { status: 400 }
      );
    }

    // Get logs with filters
    const logs = await monitoringService.getLogs({
      level,
      component,
      startTime,
      endTime,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: logs,
      filters: {
        level,
        component,
        startTime: startTime?.toISOString(),
        endTime: endTime?.toISOString(),
        limit,
      },
      count: logs.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Logs API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve logs',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const logEntries = await request.json();
    
    // Handle single log entry or array
    const entries = Array.isArray(logEntries) ? logEntries : [logEntries];
    
    // Validate input
    for (const entry of entries) {
      if (!entry.component || !entry.action || !entry.message) {
        return NextResponse.json(
          { error: 'Each log entry must have component, action, and message' },
          { status: 400 }
        );
      }
      
      if (!['debug', 'info', 'warn', 'error'].includes(entry.level)) {
        return NextResponse.json(
          { error: 'Log level must be debug, info, warn, or error' },
          { status: 400 }
        );
      }
    }

    // Record each log entry
    const results = await Promise.allSettled(
      entries.map(entry => monitoringService.log(entry))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: failed === 0,
      logged: successful,
      failed,
      total: entries.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Log recording error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to record logs',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    );
  }
}