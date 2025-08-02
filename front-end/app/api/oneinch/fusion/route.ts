import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const chainId = searchParams.get('chainId') || '8453'; // Default to Base mainnet
  const srcToken = searchParams.get('srcToken');
  const dstToken = searchParams.get('dstToken');
  const amount = searchParams.get('amount');
  const walletAddress = searchParams.get('walletAddress');
  const preset = searchParams.get('preset');
  
  console.log('🔍 Intent Swap API received params:', {
    srcToken, dstToken, amount, walletAddress, preset, chainId
  });
  
  if (!srcToken || !dstToken || !amount || !walletAddress) {
    console.error('❌ Missing intent swap parameters:', { 
      srcToken: !!srcToken, 
      dstToken: !!dstToken, 
      amount: !!amount, 
      walletAddress: !!walletAddress 
    });
    return NextResponse.json({ 
      error: 'Missing required parameters: srcToken, dstToken, amount, walletAddress' 
    }, { status: 400 });
  }

  try {
    // Build the 1inch Intent Swap API URL (part of Swap API v6.1)
    const intentUrl = new URL(`https://api.1inch.dev/swap/v6.1/${chainId}/intent-swap`);
    
    intentUrl.searchParams.set('src', srcToken);
    intentUrl.searchParams.set('dst', dstToken);
    intentUrl.searchParams.set('amount', amount);
    intentUrl.searchParams.set('from', walletAddress);
    
    if (preset) intentUrl.searchParams.set('preset', preset);

    console.log('🌐 Proxying 1inch intent swap request:', intentUrl.toString());

    const response = await fetch(intentUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'c1nch/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch Intent Swap API error:', response.status, errorText);
      throw new Error(`1inch Intent Swap API error: ${response.status}`);
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
    console.error('1inch Intent Swap API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Intent Swap API' },
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
