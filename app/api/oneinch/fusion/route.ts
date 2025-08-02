import { NextRequest, NextResponse } from 'next/server';

// FUSION API ROUTE - COMPLETELY NEW VERSION
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const chainId = searchParams.get('chainId') || '8453';
  const srcToken = searchParams.get('srcToken');
  const dstToken = searchParams.get('dstToken');
  const amount = searchParams.get('amount');
  const walletAddress = searchParams.get('walletAddress');
  const preset = searchParams.get('preset');
  
  console.log('🚀 NEW FUSION API - Received params:', {
    srcToken, dstToken, amount, walletAddress, preset, chainId
  });
  
  if (!srcToken || !dstToken || !amount || !walletAddress) {
    console.error('❌ Missing FUSION parameters:', { 
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
    const fusionUrl = new URL(`https://api.1inch.dev/fusion/v1.0/${chainId}/quote/receive`);
    
    fusionUrl.searchParams.set('srcToken', srcToken);
    fusionUrl.searchParams.set('dstToken', dstToken);
    fusionUrl.searchParams.set('amount', amount);
    fusionUrl.searchParams.set('walletAddress', walletAddress);
    
    if (preset) fusionUrl.searchParams.set('preset', preset);

    console.log('🌟 NEW FUSION - Proxying request to:', fusionUrl.toString());

    const response = await fetch(fusionUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'c1nch/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ NEW FUSION API ERROR:', response.status, errorText);
      throw new Error(`Fusion API error: ${response.status}`);
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
    console.error('❌ NEW FUSION PROXY ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Fusion API' },
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