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
    const fusionUrl = new URL(`https://api.1inch.dev/fusion/v1.0/${chainId}/quote/receive`);
    
    fusionUrl.searchParams.set('srcToken', srcToken);
    fusionUrl.searchParams.set('dstToken', dstToken);
    fusionUrl.searchParams.set('amount', amount);
    fusionUrl.searchParams.set('walletAddress', walletAddress);
    
    if (preset) fusionUrl.searchParams.set('preset', preset);

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

// POST method for creating and submitting Fusion intent swap orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      chainId = '8453',
      fromTokenAddress,
      toTokenAddress, 
      amount,
      walletAddress,
      preset = 'fast',
      source = 'unicorn-project'
    } = body;

    console.log('🚀 FUSION INTENT SWAP - Creating order:', {
      fromTokenAddress, toTokenAddress, amount, walletAddress, preset, chainId, source
    });

    if (!fromTokenAddress || !toTokenAddress || !amount || !walletAddress) {
      console.error('❌ Missing FUSION intent swap parameters:', { 
        fromTokenAddress: !!fromTokenAddress, 
        toTokenAddress: !!toTokenAddress, 
        amount: !!amount, 
        walletAddress: !!walletAddress 
      });
      return NextResponse.json({ 
        error: 'Missing required parameters: fromTokenAddress, toTokenAddress, amount, walletAddress' 
      }, { status: 400 });
    }

    // Step 1: Get quote for the order
    const quoteUrl = new URL(`https://api.1inch.dev/fusion/v1.0/${chainId}/quote/receive`);
    quoteUrl.searchParams.set('srcToken', fromTokenAddress);
    quoteUrl.searchParams.set('dstToken', toTokenAddress);
    quoteUrl.searchParams.set('amount', amount);
    quoteUrl.searchParams.set('walletAddress', walletAddress);
    if (preset) quoteUrl.searchParams.set('preset', preset);

    console.log('🔍 FUSION INTENT - Getting quote:', quoteUrl.toString());

    const quoteResponse = await fetch(quoteUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'c1nch/1.0',
      },
    });

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error('❌ FUSION QUOTE ERROR:', quoteResponse.status, errorText);
      throw new Error(`Fusion quote error: ${quoteResponse.status} - ${errorText}`);
    }

    const quoteData = await quoteResponse.json();
    console.log('✅ FUSION QUOTE SUCCESS:', { 
      quoteId: quoteData.quoteId,
      presets: Object.keys(quoteData.presets || {}),
      recommended: quoteData.recommendedPreset
    });

    // Step 2: Create order using the quote
    const createOrderUrl = `https://api.1inch.dev/fusion/v1.0/${chainId}/order/create`;
    
    const orderParams = {
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      preset: preset || quoteData.recommendedPreset || 'fast',
      source
    };

    console.log('⚡ FUSION INTENT - Creating order:', createOrderUrl);

    const createOrderResponse = await fetch(createOrderUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'c1nch/1.0',
      },
      body: JSON.stringify(orderParams),
    });

    if (!createOrderResponse.ok) {
      const errorText = await createOrderResponse.text();
      console.error('❌ FUSION ORDER CREATE ERROR:', createOrderResponse.status, errorText);
      throw new Error(`Fusion order creation error: ${createOrderResponse.status} - ${errorText}`);
    }

    const orderData = await createOrderResponse.json();
    console.log('✅ FUSION ORDER CREATED:', { 
      orderId: orderData.orderId || 'N/A',
      quoteId: orderData.quoteId || 'N/A'
    });

    // Step 3: Submit the order to the Fusion system
    if (orderData.order && orderData.quoteId) {
      const submitUrl = `https://api.1inch.dev/fusion/v1.0/${chainId}/order/submit`;
      
      console.log('📡 FUSION INTENT - Submitting order:', submitUrl);

      const submitResponse = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'c1nch/1.0',
        },
        body: JSON.stringify({
          order: orderData.order,
          quoteId: orderData.quoteId
        }),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error('❌ FUSION ORDER SUBMIT ERROR:', submitResponse.status, errorText);
        throw new Error(`Fusion order submission error: ${submitResponse.status} - ${errorText}`);
      }

      const submitData = await submitResponse.json();
      console.log('🎯 FUSION INTENT SWAP SUBMITTED:', { 
        orderHash: submitData.orderHash || 'N/A',
        status: 'submitted'
      });

      return NextResponse.json({
        success: true,
        orderHash: submitData.orderHash,
        orderInfo: submitData,
        message: 'Intent swap order submitted successfully. Resolvers will compete to fill your order.',
        quote: quoteData,
        order: orderData
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else {
      // If we only have quote data, return that with instructions
      return NextResponse.json({
        success: true,
        quote: quoteData,
        order: orderData,
        message: 'Quote and order prepared. Additional steps may be required for submission.'
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

  } catch (error) {
    console.error('❌ FUSION INTENT SWAP ERROR:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create intent swap order',
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