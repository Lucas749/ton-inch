/**
 * 📋 Order Management API Route
 * 
 * This API route connects the frontend to backend order management functionality.
 * It handles order retrieval and cancellation using the order manager.
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const makerAddress = searchParams.get('makerAddress');
  const apiKey = searchParams.get('apiKey');

  console.log('📋 ORDERS API GET:', { action, makerAddress, apiKey: apiKey ? '***PROVIDED***' : 'MISSING' });

  if (action === 'get-orders') {
    if (!makerAddress || !apiKey) {
      return NextResponse.json({ 
        error: 'Missing required parameters: makerAddress, apiKey' 
      }, { status: 400 });
    }

    try {
      // Import the backend order manager
      const backendPath = path.join(process.cwd(), '../backend/src/order-manager.js');
      const orderManager = require(backendPath);

      console.log('📋 Getting active orders for maker:', makerAddress);

      // Get orders using the backend order manager
      const result = await orderManager.getAllActiveOrdersForMaker(
        makerAddress,
        apiKey,
        { includeOrderDetails: true }
      );

      if (result.success) {
        console.log('✅ Retrieved orders successfully:', result.activeOrders.length);
        
        return NextResponse.json({
          success: true,
          orders: result.activeOrders,
          totalCount: result.totalCount,
          message: `Found ${result.activeOrders.length} active orders`
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      } else {
        throw new Error(result.error || 'Failed to retrieve orders');
      }

    } catch (backendError: any) {
      console.error('❌ Backend order manager error:', backendError);
      return NextResponse.json({
        error: 'Failed to retrieve orders',
        message: backendError.message || 'Backend order manager error',
        details: backendError.toString()
      }, { status: 500 });
    }

  } else {
    return NextResponse.json({ 
      error: 'Invalid action. Use "get-orders"' 
    }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action, // 'cancel-order'
      orderHash,
      privateKey,
      apiKey
    } = body;

    console.log('📋 ORDERS API POST:', { action, orderHash, privateKey: privateKey ? '***PROVIDED***' : 'MISSING', apiKey: apiKey ? '***PROVIDED***' : 'MISSING' });

    if (action === 'cancel-order') {
      if (!orderHash || !privateKey || !apiKey) {
        return NextResponse.json({ 
          error: 'Missing required parameters: orderHash, privateKey, apiKey' 
        }, { status: 400 });
      }

      try {
        // Import the backend order cancellation
        const backendPath = path.join(process.cwd(), '../backend/src/order-cancellation.js');
        const orderCancellation = require(backendPath);

        console.log('🚫 Cancelling order:', orderHash);

        // Cancel the order using the backend order cancellation
        const result = await orderCancellation.cancelLimitOrder(
          orderHash,
          privateKey,
          apiKey
        );

        if (result.success) {
          console.log('✅ Order cancelled successfully:', result.transactionHash);
          
          return NextResponse.json({
            success: true,
            transactionHash: result.transactionHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
            orderHash: result.orderHash,
            status: result.status,
            message: `Order ${orderHash} cancelled successfully!`
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          });
        } else {
          throw new Error(result.error || 'Failed to cancel order');
        }

      } catch (backendError: any) {
        console.error('❌ Backend order cancellation error:', backendError);
        return NextResponse.json({
          error: 'Failed to cancel order',
          message: backendError.message || 'Backend order cancellation error',
          details: backendError.toString(),
          code: backendError.code || 'UNKNOWN_ERROR'
        }, { status: 500 });
      }

    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Use "cancel-order"' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ ORDERS API ERROR:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process order request',
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