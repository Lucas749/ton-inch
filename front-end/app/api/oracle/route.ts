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

// Configuration matching backend
const CONFIG = {
  CHAIN_ID: 8453,
  RPC_URL: 'https://base.llamarpc.com',
  INDEX_ORACLE_ADDRESS: '0x3073D2b5e72c48f16Ee99700BC07737b8ecd8709' // Correct contract
};

// Index names and symbols (matching backend)
const INDEX_NAMES: Record<number, string> = {
  0: 'Inflation Rate',
  1: 'Elon Followers', 
  2: 'BTC Price',
  3: 'VIX Index',
  4: 'Unemployment Rate',
  5: 'Tesla Stock'
};

const INDEX_SYMBOLS: Record<number, string> = {
  0: 'INFL',
  1: 'ELON',
  2: 'BTC', 
  3: 'VIX',
  4: 'UNEMP',
  5: 'TSLA'
};

const INDEX_UNITS: Record<number, string> = {
  0: 'Percentage',
  1: 'Followers',
  2: 'USD',
  3: 'Index Points',
  4: 'Percentage', 
  5: 'USD'
};

/**
 * Format index value for display (matching backend logic)
 */
function formatIndexValue(indexId: number, value: any): string {
  const numValue = Number(value);
  
  switch (indexId) {
    case 0: // Inflation Rate
    case 4: // Unemployment Rate
      return `${(numValue / 100).toFixed(2)}%`;
    case 1: // Elon Followers
      return `${(numValue / 1000000).toFixed(1)}M`;
    case 2: // BTC Price
    case 5: // Tesla Stock
      return `$${numValue.toLocaleString()}`;
    case 3: // VIX Index
      return numValue.toFixed(2);
    default:
      return numValue.toString();
  }
}

/**
 * Get index by ID (matching backend oracle-manager.js getIndexById function)
 */
async function getIndexById(indexId: number) {
  console.log(`🔍 Getting Index Data for ID: ${indexId}`);
  console.log('=======================================');
  
  try {
    // Initialize Web3 with Base RPC
    const { ethers } = require('ethers');
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
    
    // Oracle contract ABI 
    const oracleABI = [
      "function indexData(uint256 indexId) external view returns (uint256 value, uint256 timestamp, string memory sourceUrl, bool isActive, uint8 oracleType, address creator)",
      "function customIndexData(uint256 indexId) external view returns (uint256 value, uint256 timestamp, string memory sourceUrl, bool isActive, uint8 oracleType, address creator)"
    ];
    
    const contract = new ethers.Contract(CONFIG.INDEX_ORACLE_ADDRESS, oracleABI, provider);
    
    let indexData;
    
    if (indexId <= 5) {
      // Predefined index
      const [value, timestamp, sourceUrl, isActive, oracleType, creator] = await contract.indexData(indexId);
      
      indexData = {
        id: indexId,
        type: 'predefined',
        name: INDEX_NAMES[indexId] || `Index ${indexId}`,
        symbol: INDEX_SYMBOLS[indexId] || `IDX${indexId}`,
        value: value.toString(),
        timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
        sourceUrl: sourceUrl,
        isActive: isActive,
        unit: INDEX_UNITS[indexId] || 'Units',
        formatted: formatIndexValue(indexId, value),
        creator: creator,
        oracleType: oracleType
      };
    } else {
      // Custom index
      const [value, timestamp, sourceUrl, isActive, oracleType, creator] = await contract.customIndexData(indexId);
      
      // Extract name from Alpha Vantage sourceUrl or use default naming (matching blockchain-indices.ts logic)
      let name = `Custom Index ${indexId}`;
      let symbol = `CUSTOM${indexId}`;
      let category = 'Custom';
      let alphaVantageSymbol: string | undefined = undefined;
      
      if (sourceUrl && sourceUrl.trim() && sourceUrl.includes('alphavantage.co')) {
        try {
          const url = new URL(sourceUrl);
          const functionParam = url.searchParams.get('function');
          const symbolParam = url.searchParams.get('symbol');
          
          // Direct name extraction - no complex logic (matching blockchain-indices.ts)
          if (symbolParam) {
            name = symbolParam.toUpperCase();
            symbol = symbolParam.toUpperCase();
            alphaVantageSymbol = symbolParam.toUpperCase();
            if (functionParam && functionParam.toLowerCase().includes('earnings')) {
              name = `${symbolParam.toUpperCase()} EPS`;
            }
          } else if (functionParam) {
            // For CORN, GOLD, etc. - just capitalize the function name
            name = functionParam.charAt(0).toUpperCase() + functionParam.slice(1).toLowerCase();
            symbol = functionParam.toUpperCase();
            alphaVantageSymbol = functionParam.toUpperCase();
          }
          
          // Simple category assignment based on function/symbol
          if (symbolParam) {
            // Has symbol - likely a stock, crypto, or specific asset
            if (functionParam && functionParam.toLowerCase().includes('earnings')) {
              category = 'Stocks';
            } else if (functionParam && functionParam.toLowerCase().includes('digital')) {
              category = 'Crypto';
            } else {
              category = 'Stocks';
            }
          } else if (functionParam) {
            const func = functionParam.toLowerCase();
            // Commodities like CORN, GOLD, etc.
            const commodities = ['corn', 'wheat', 'wti', 'brent', 'gold', 'silver', 'copper', 'oil', 'gas'];
            if (commodities.some(c => func.includes(c))) {
              category = 'Commodities';
            } else if (func.includes('fx') || func.includes('currency')) {
              category = 'Forex';
            } else {
              category = 'Economics';
            }
          }
          
          console.log(`📊 Parsed Alpha Vantage URL for index ${indexId}:`);
          console.log(`   Function: ${functionParam}`);
          console.log(`   Symbol: ${symbolParam}`);
          console.log(`   Parsed Name: ${name}`);
          console.log(`   Category: ${category}`);
          
        } catch (urlError) {
          console.warn(`Could not parse sourceUrl for index ${indexId}:`, urlError);
          // Keep the default name and symbol
        }
      }
      
      indexData = {
        id: indexId,
        type: 'custom',
        name: name,
        symbol: symbol,
        value: value.toString(),
        timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
        sourceUrl: sourceUrl,
        isActive: isActive,
        unit: 'Custom Unit',
        formatted: value.toString(),
        creator: creator,
        oracleType: oracleType,
        category: category,
        alphaVantageSymbol: alphaVantageSymbol
      };
    }
    
    console.log(`✅ Found index: ${indexData.name} (${indexData.symbol})`);
    console.log(`   Value: ${indexData.formatted}`);
    console.log(`   Active: ${indexData.isActive}`);
    console.log(`   Creator: ${indexData.creator}`);
    console.log(`   Oracle Type: ${indexData.oracleType}`);
    console.log(`   Updated: ${indexData.timestamp}\n`);
    
    return {
      success: true,
      index: indexData
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to get index ${indexId}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const indexId = searchParams.get('indexId');

  console.log('🏗️ ORACLE API GET:', { action, indexId });

  if (action === 'get-index-by-id') {
    if (!indexId || isNaN(Number(indexId))) {
      return NextResponse.json({ 
        error: 'Invalid indexId parameter' 
      }, { status: 400 });
    }

    try {
      const result = await getIndexById(Number(indexId));
      
      return NextResponse.json(result, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });

    } catch (error: any) {
      console.error('❌ Get index by ID error:', error);
      return NextResponse.json({
        error: 'Failed to get index by ID',
        message: error.message || 'Oracle query error'
      }, { status: 500 });
    }

  } else {
    return NextResponse.json({ 
      error: 'Invalid action. Use "get-index-by-id"' 
    }, { status: 400 });
  }
}

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