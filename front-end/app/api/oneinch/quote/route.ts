import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const chainId = searchParams.get('chainId') || '8453'; // Default to Base
  const src = searchParams.get('src');
  const dst = searchParams.get('dst');
  const amount = searchParams.get('amount');
  const includeTokensInfo = searchParams.get('includeTokensInfo');
  const includeProtocols = searchParams.get('includeProtocols');
  const includeGas = searchParams.get('includeGas');
  
  if (!src || !dst || !amount) {
    return NextResponse.json({ error: 'Missing required parameters: src, dst, amount' }, { status: 400 });
  }

  try {
    // Build the 1inch quote API URL
    const quoteUrl = new URL(`https://api.1inch.dev/swap/v6.0/${chainId}/quote`);
    
    quoteUrl.searchParams.set('src', src);
    quoteUrl.searchParams.set('dst', dst);
    quoteUrl.searchParams.set('amount', amount);
    
    if (includeTokensInfo) quoteUrl.searchParams.set('includeTokensInfo', includeTokensInfo);
    if (includeProtocols) quoteUrl.searchParams.set('includeProtocols', includeProtocols);
    if (includeGas) quoteUrl.searchParams.set('includeGas', includeGas);

    console.log('🌐 Proxying 1inch quote request:', quoteUrl.toString());

    const response = await fetch(quoteUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'c1nch/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch quote API error:', response.status, errorText);
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
    console.error('1inch quote API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch quote API' },
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