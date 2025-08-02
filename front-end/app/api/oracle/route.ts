/**
 * 🏗️ Oracle Management API Route
 * 
 * This API route connects the frontend to backend oracle management functionality.
 * It handles creating blockchain indices using the oracle manager.
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action, // 'create-index'
      name,
      initialValue,
      sourceUrl,
      privateKey
    } = body;

    console.log('🏗️ ORACLE API:', { action, name, initialValue, sourceUrl, privateKey: privateKey ? '***PROVIDED***' : 'MISSING' });

    if (action === 'create-index') {
      if (!name || !initialValue || !sourceUrl || !privateKey) {
        return NextResponse.json({ 
          error: 'Missing required parameters: name, initialValue, sourceUrl, privateKey' 
        }, { status: 400 });
      }

      try {
        // Import the backend oracle manager
        const backendPath = path.join(process.cwd(), '../backend/src/oracle-manager.js');
        const oracleManager = require(backendPath);

        console.log('📋 Creating blockchain index:', {
          name,
          initialValue,
          sourceUrl
        });

        // Create the index using the backend oracle manager
        const result = await oracleManager.createNewIndex(
          initialValue,
          sourceUrl,
          privateKey
        );

        if (result.success) {
          console.log('✅ Index created successfully:', result.indexId);
          
          return NextResponse.json({
            success: true,
            indexId: result.indexId,
            name: name,
            transactionHash: result.transactionHash,
            gasUsed: result.gasUsed,
            blockNumber: result.blockNumber,
            message: `Index "${name}" created successfully on blockchain!`
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          });
        } else {
          throw new Error(result.error || 'Failed to create index');
        }

      } catch (backendError: any) {
        console.error('❌ Backend oracle manager error:', backendError);
        return NextResponse.json({
          error: 'Failed to create blockchain index',
          message: backendError.message || 'Backend oracle manager error',
          details: backendError.toString()
        }, { status: 500 });
      }

    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Use "create-index"' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ ORACLE API ERROR:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process oracle request',
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