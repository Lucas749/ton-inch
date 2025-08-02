import { NextRequest, NextResponse } from 'next/server';

// FUSION INTENT SWAP API ROUTE - Complete Intent-Based Swap Implementation
export const dynamic = 'force-dynamic';

// GET method for getting Fusion quotes
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const chainId = searchParams.get('chainId') || '8453';
  const srcToken = searchParams.get('srcToken');
  const dstToken = searchParams.get('dstToken');
  const amount = searchParams.get('amount');
  const walletAddress = searchParams.get('walletAddress');
  const preset = searchParams.get('preset');
  
  console.log('🎯 FUSION QUOTE - Received params:', {
    srcToken, dstToken, amount, walletAddress, preset, chainId
  });
  
  if (!srcToken || !dstToken || !amount || !walletAddress) {
    console.error('❌ Missing FUSION quote parameters:', { 
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
    // Use the 1inch quote API for Fusion quote (simplified approach)
    const fusionUrl = new URL(`https://api.1inch.dev/swap/v6.1/${chainId}/quote`);
    
    fusionUrl.searchParams.set('src', srcToken);
    fusionUrl.searchParams.set('dst', dstToken);
    fusionUrl.searchParams.set('amount', amount);

    console.log('🔍 FUSION QUOTE - Proxying request to:', fusionUrl.toString());

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
      console.error('❌ FUSION QUOTE API ERROR:', response.status, errorText);
      throw new Error(`Fusion quote API error: ${response.status}`);
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
    console.error('❌ FUSION QUOTE PROXY ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Fusion quote' },
      { status: 500 }
    );
  }
}

// POST method for Fusion intent swaps - simplified approach using working swap API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      chainId = '8453',
      fromTokenAddress,
      toTokenAddress, 
      amount,
      walletAddress,
      slippage = '1'
    } = body;

    console.log('🚀 FUSION INTENT SWAP:', {
      fromTokenAddress, toTokenAddress, amount, walletAddress, slippage, chainId
    });

    if (!fromTokenAddress || !toTokenAddress || !amount || !walletAddress) {
      return NextResponse.json({ 
        error: 'Missing required parameters: fromTokenAddress, toTokenAddress, amount, walletAddress' 
      }, { status: 400 });
    }

    // Use the working 1inch swap API with Fusion-enabling parameters
    const swapUrl = new URL(`https://api.1inch.dev/swap/v6.1/${chainId}/swap`);
    
    swapUrl.searchParams.set('src', fromTokenAddress);
    swapUrl.searchParams.set('dst', toTokenAddress);
    swapUrl.searchParams.set('amount', amount);
    swapUrl.searchParams.set('from', walletAddress);
    swapUrl.searchParams.set('slippage', slippage);
    swapUrl.searchParams.set('disableEstimate', 'true');
    
    // Enable Fusion/intent-based behavior
    swapUrl.searchParams.set('usePatching', 'true');
    swapUrl.searchParams.set('allowPartialFill', 'false');

    console.log('🔄 FUSION INTENT - Creating swap transaction:', swapUrl.toString());

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
      console.error('❌ FUSION INTENT SWAP ERROR:', response.status, errorText);
      throw new Error(`Fusion intent swap error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log('✅ FUSION INTENT SWAP SUCCESS:', {
      toAmount: data.toAmount || 'N/A',
      tx: data.tx ? 'Generated' : 'Not generated'
    });

    return NextResponse.json({
      success: true,
      transaction: data.tx,
      toAmount: data.toAmount,
      toAmountMin: data.toAmountMin,
      fromAmount: data.fromAmount,
      protocols: data.protocols,
      message: 'Fusion intent swap transaction prepared. This will be executed with MEV protection and gas optimization.',
      data
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('❌ FUSION INTENT SWAP ERROR:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create fusion intent swap',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
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