import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/utils/monitoringService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const component = searchParams.get('component');

    // Perform health check
    const healthStatus = await monitoringService.checkSystemHealth();

    // If requesting specific component
    if (component) {
      const componentHealth = healthStatus.components[component as keyof typeof healthStatus.components];
      
      if (!componentHealth) {
        return NextResponse.json(
          { error: 'Invalid component name' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        component,
        ...componentHealth,
        timestamp: healthStatus.timestamp.toISOString(),
      });
    }

    // Return appropriate level of detail
    const response = {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp.toISOString(),
      metrics: healthStatus.metrics,
    };

    if (detailed) {
      (response as any).components = healthStatus.components;
    }

    // Set appropriate HTTP status code
    const httpStatus = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 200 : 503;

    return NextResponse.json(response, { status: httpStatus });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

// HEAD request for simple health check
export async function HEAD(request: NextRequest) {
  try {
    const healthStatus = await monitoringService.checkSystemHealth();
    
    const httpStatus = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    return new NextResponse(null, { 
      status: httpStatus,
      headers: {
        'X-Health-Status': healthStatus.status,
        'X-Health-Timestamp': healthStatus.timestamp.toISOString(),
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}