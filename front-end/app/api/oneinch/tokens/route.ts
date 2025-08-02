import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const chainId = searchParams.get('chainId') || '8453'; // Default to Base mainnet
  
  try {
    const response = await fetch(`https://api.1inch.dev/token/v1.3/${chainId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'c1nch/1.0',
      },
    });

    if (!response.ok) {
      console.error('1inch tokens API error:', response.status, response.statusText);
      throw new Error(`1inch API error: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('1inch tokens API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch tokens API' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}