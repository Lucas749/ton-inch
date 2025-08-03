import { NextRequest, NextResponse } from 'next/server';

// Dynamic route for 1inch approve operations (allowance and transaction)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const chainId = searchParams.get('chainId') || '8453'; // Default to Base mainnet
  const tokenAddress = searchParams.get('tokenAddress');
  const walletAddress = searchParams.get('walletAddress');
  const amount = searchParams.get('amount');
  
  console.log('🔍 Approve API received params:', {
    tokenAddress, walletAddress, amount, chainId
  });

  // Determine the operation based on parameters
  if (tokenAddress && walletAddress && !amount) {
    // This is an allowance check
    console.log('🔍 Checking allowance for token:', tokenAddress);
    
    try {
      // Build the 1inch allowance API URL
      const allowanceUrl = new URL(`https://api.1inch.dev/swap/v6.1/${chainId}/approve/allowance`);
      
      allowanceUrl.searchParams.set('tokenAddress', tokenAddress);
      allowanceUrl.searchParams.set('walletAddress', walletAddress.toLowerCase());

      console.log('🌐 Proxying 1inch allowance request:', allowanceUrl.toString());

      const response = await fetch(allowanceUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'c1nch/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('1inch allowance API error:', response.status, errorText);
        throw new Error(`1inch allowance API error: ${response.status}`);
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
      console.error('1inch allowance API proxy error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch from 1inch allowance API' },
        { status: 500 }
      );
    }
    
  } else if (tokenAddress && amount) {
    // This is an approval transaction request
    console.log('🔍 Getting approval transaction for token:', tokenAddress);
    
    try {
      // Build the 1inch approve transaction API URL
      const approveUrl = new URL(`https://api.1inch.dev/swap/v6.1/${chainId}/approve/transaction`);
      
      approveUrl.searchParams.set('tokenAddress', tokenAddress);
      approveUrl.searchParams.set('amount', amount);

      console.log('🌐 Proxying 1inch approve transaction request:', approveUrl.toString());

      const response = await fetch(approveUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'c1nch/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('1inch approve API error:', response.status, errorText);
        throw new Error(`1inch approve API error: ${response.status}`);
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
      console.error('1inch approve API proxy error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch from 1inch approve API' },
        { status: 500 }
      );
    }
    
  } else {
    return NextResponse.json({ 
      error: 'Missing required parameters. For allowance: tokenAddress, walletAddress. For transaction: tokenAddress, amount' 
    }, { status: 400 });
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