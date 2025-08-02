import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Extract all query parameters
  const function_ = searchParams.get('function');
  const symbol = searchParams.get('symbol');
  const apikey = searchParams.get('apikey');
  const interval = searchParams.get('interval');
  const outputsize = searchParams.get('outputsize');
  const datatype = searchParams.get('datatype');
  
  if (!function_ || !apikey) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    // Build the Alpha Vantage API URL
    const alphaVantageUrl = new URL('https://www.alphavantage.co/query');
    
    // Add all parameters to the Alpha Vantage request
    alphaVantageUrl.searchParams.set('function', function_);
    alphaVantageUrl.searchParams.set('apikey', apikey);
    
    if (symbol) alphaVantageUrl.searchParams.set('symbol', symbol);
    if (interval) alphaVantageUrl.searchParams.set('interval', interval);
    if (outputsize) alphaVantageUrl.searchParams.set('outputsize', outputsize);
    if (datatype) alphaVantageUrl.searchParams.set('datatype', datatype);

    console.log('🌐 Proxying Alpha Vantage request:', alphaVantageUrl.toString());

    const response = await fetch(alphaVantageUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'c1nch/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
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
    console.error('Alpha Vantage API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Alpha Vantage API' },
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