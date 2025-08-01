/**
 * 🏗️ Oracle Management API Route
 * 
 * This API route handles creating blockchain indices using the front-end blockchain service.
 * It creates indices with oracle types directly via smart contract calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Web3 } from 'web3';
import { CONTRACTS, ABIS, ORACLE_TYPES } from '@/lib/blockchain-constants';

// Gas estimation utility
import { 
  estimateOracleGas, 
  checkGasBalance, 
  formatGasEstimate,
  getFundingInstructions 
} from '@/lib/gas-estimator';

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
      if (!name || initialValue === undefined || initialValue === null || !sourceUrl || !privateKey) {
        return NextResponse.json({ 
          error: 'Missing required parameters: name, initialValue, sourceUrl, privateKey' 
        }, { status: 400 });
      }

      try {
        // Initialize Web3 with Base RPC
        const provider = new Web3.providers.HttpProvider('https://base.llamarpc.com');
        const web3 = new Web3(provider);
        
        // Create wallet from private key
        const wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
        
        console.log(`👤 Using wallet address: ${wallet.address}`);
        console.log(`💰 You need to send Base ETH to this address: ${wallet.address}`);
        
        // Create contract instance  
        const contract = new web3.eth.Contract(ABIS.IndexOracle, CONTRACTS.IndexOracle);

        console.log('📋 Creating blockchain index with oracle:', {
          name,
          initialValue,
          sourceUrl,
          oracleType: 'CHAINLINK'
        });

        // Get comprehensive gas estimation
        console.log('💰 Estimating gas costs...');
        const gasEstimate = await estimateOracleGas('create', wallet.address, initialValue, sourceUrl);
        console.log(`📊 Oracle creation gas estimate: ${formatGasEstimate(gasEstimate)}`);
        
        // Check wallet balance
        const balanceCheck = await checkGasBalance(wallet.address, gasEstimate.totalCostWei);
        console.log('💰 WALLET BALANCE CHECK:');
        console.log('========================');
        console.log(`Current Balance: ${balanceCheck.currentBalanceEth} ETH`);
        console.log(`Required for Gas: ${balanceCheck.requiredBalanceEth} ETH`);
        console.log(`Status: ${balanceCheck.hasEnoughGas ? '✅ Sufficient' : '⚠️  Insufficient'}`);
        
        if (!balanceCheck.hasEnoughGas && balanceCheck.shortfallEth) {
          console.log(`Shortfall: ${balanceCheck.shortfallEth} ETH`);
          console.log(getFundingInstructions(wallet.address, balanceCheck.shortfallEth));
        }

        // Build transaction
        const tx = contract.methods.createCustomIndex(
          initialValue.toString(),
          sourceUrl,
          ORACLE_TYPES.CHAINLINK,
          '0x0000000000000000000000000000000000000000'
        );
        
        const txData = {
          from: wallet.address,
          to: CONTRACTS.IndexOracle,
          data: tx.encodeABI(),
          gas: gasEstimate.gasLimit,
          gasPrice: gasEstimate.gasPrice,
        };

        // Sign and send transaction
        const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction!);

        // Parse events to get index ID
        let indexId = null;
        if (receipt.logs && receipt.logs.length > 0) {
          try {
            const decodedLogs = receipt.logs.map(log => {
              try {
                if (!log.data || !log.topics || log.topics.length === 0) {
                  return null;
                }
                return web3.eth.abi.decodeLog(
                  [
                    { type: 'uint256', name: 'indexId', indexed: true },
                    { type: 'uint256', name: 'value' },
                    { type: 'uint256', name: 'timestamp' },
                    { type: 'string', name: 'sourceUrl' }
                  ],
                  log.data.toString(),
                  log.topics.slice(1).map(topic => topic.toString())
                );
              } catch {
                return null;
              }
            }).filter(Boolean);
            
            if (decodedLogs.length > 0 && decodedLogs[0] && (decodedLogs[0] as any).indexId) {
              indexId = parseInt((decodedLogs[0] as any).indexId);
            }
          } catch (error) {
            console.warn('Could not parse event logs for index ID:', error);
          }
        }

        console.log('✅ Index created successfully:', indexId);
          
        return NextResponse.json({
          success: true,
          indexId: indexId,
          name: name,
          transactionHash: receipt.transactionHash,
          gasUsed: receipt.gasUsed?.toString(),
          blockNumber: receipt.blockNumber,
          message: `Index "${name}" created successfully on blockchain with Chainlink oracle!`
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });

      } catch (contractError: any) {
        console.error('❌ Contract interaction error:', contractError);
        return NextResponse.json({
          error: 'Failed to create blockchain index',
          message: contractError.message || 'Contract interaction error',
          details: contractError.toString()
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