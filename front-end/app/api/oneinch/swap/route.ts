import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const chainId = searchParams.get('chainId') || '8453'; // Default to Base mainnet
  const src = searchParams.get('src');
  const dst = searchParams.get('dst');
  const amount = searchParams.get('amount');
  const from = searchParams.get('from');
  const slippage = searchParams.get('slippage');
  const includeTokensInfo = searchParams.get('includeTokensInfo');
  const includeProtocols = searchParams.get('includeProtocols');
  const includeGas = searchParams.get('includeGas');
  const disableEstimate = searchParams.get('disableEstimate');
  
  if (!src || !dst || !amount || !from) {
    return NextResponse.json({ error: 'Missing required parameters: src, dst, amount, from' }, { status: 400 });
  }

  try {
    // Build the 1inch swap API URL
    const swapUrl = new URL(`https://api.1inch.dev/swap/v6.1/${chainId}/swap`);
    
    swapUrl.searchParams.set('src', src);
    swapUrl.searchParams.set('dst', dst);
    swapUrl.searchParams.set('amount', amount);
    swapUrl.searchParams.set('from', from);
    swapUrl.searchParams.set('slippage', slippage || '1');
    
    if (includeTokensInfo) swapUrl.searchParams.set('includeTokensInfo', includeTokensInfo);
    if (includeProtocols) swapUrl.searchParams.set('includeProtocols', includeProtocols);
    if (includeGas) swapUrl.searchParams.set('includeGas', includeGas);
    if (disableEstimate) swapUrl.searchParams.set('disableEstimate', disableEstimate);

    console.log('🌐 Proxying 1inch swap request:', swapUrl.toString());

    const response = await fetch(swapUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'c1nch/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch swap API error:', response.status, errorText);
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
    console.error('1inch swap API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch swap API' },
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