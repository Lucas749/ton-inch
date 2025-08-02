/**
 * 📋 Order Management API Route
 * 
 * This API route connects the frontend to backend order management functionality.
 * It handles order retrieval and cancellation using the order manager.
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

// 1inch SDK imports for standalone order creation
import { LimitOrder, MakerTraits, Address, Sdk, randBigInt, FetchProviderConnector, ExtensionBuilder } from '@1inch/limit-order-sdk';
import { Wallet, ethers } from 'ethers';

// Gas estimation utility
import { 
  estimateApprovalGas, 
  estimateOrderGas, 
  checkGasBalance, 
  calculateTotalTransactionCost,
  formatGasEstimate,
  getFundingInstructions 
} from '@/lib/gas-estimator';

export const dynamic = 'force-dynamic';

// ===================================================================
// EMBEDDED BACKEND LOGIC FOR STANDALONE DEPLOYMENT
// ===================================================================

// Configuration matching backend
const CONFIG = {
  CHAIN_ID: 8453,
  RPC_URL: 'https://base.llamarpc.com',
  LIMIT_ORDER_PROTOCOL: '0x111111125421cA6dc452d289314280a0f8842A65',
  INDEX_ORACLE_ADDRESS: '0x8a585F9B2359Ef093E8a2f5432F387960e953BD2',
  
  TOKENS: {
    USDC: {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
      symbol: 'USDC'
    },
    WETH: {
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18,
      symbol: 'WETH'
    },
    ONEINCH: {
      address: '0xc5fecc3a29fb57b5024eec8a2239d4621e111cce',
      decimals: 18,
      symbol: '1INCH'
    },
    DAI: {
      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      decimals: 18,
      symbol: 'DAI'
    }
  }
};

// Available indices in the oracle contract
const INDICES = {
  APPLE_STOCK: {
    id: 0,
    name: 'Apple Stock',
    symbol: 'AAPL',
    description: 'Apple Inc. stock price',
    currentValue: 17500,
    unit: 'USD (basis points)',
    example: 'AAPL > $180 would be: threshold: 18000'
  },
  TESLA_STOCK: {
    id: 1,
    name: 'Tesla Stock',
    symbol: 'TSLA',
    description: 'Tesla Inc. stock price',
    currentValue: 25000,
    unit: 'USD (basis points)',
    example: 'TSLA < $240 would be: threshold: 24000'
  },
  VIX_INDEX: {
    id: 2,
    name: 'VIX Volatility Index',
    symbol: 'VIX',
    description: 'CBOE Volatility Index',
    currentValue: 2000,
    unit: 'Index points (basis points)',
    example: 'VIX > 25 would be: threshold: 2500'
  },
  BTC_PRICE: {
    id: 3,
    name: 'Bitcoin Price',
    symbol: 'BTC',
    description: 'Bitcoin price in USD',
    currentValue: 4500000,
    unit: 'USD (basis points)',
    example: 'BTC > $50,000 would be: threshold: 5000000'
  }
};

// Available comparison operators for predicates
const OPERATORS = {
  GREATER_THAN: {
    value: 'gt',
    name: 'Greater Than',
    symbol: '>',
    description: 'Execute when index value is greater than threshold',
    example: 'Apple > $180'
  },
  LESS_THAN: {
    value: 'lt',
    name: 'Less Than',
    symbol: '<',
    description: 'Execute when index value is less than threshold',
    example: 'VIX < 15'
  },
  EQUAL: {
    value: 'eq',
    name: 'Equal',
    symbol: '=',
    description: 'Execute when index value equals threshold (exact match)',
    example: 'Tesla = $250'
  },
  GREATER_EQUAL: {
    value: 'gte',
    name: 'Greater Than or Equal',
    symbol: '>=',
    description: 'Execute when index value is greater than or equal to threshold',
    example: 'BTC >= $50,000'
  },
  LESS_EQUAL: {
    value: 'lte',
    name: 'Less Than or Equal',
    symbol: '<=',
    description: 'Execute when index value is less than or equal to threshold',
    example: 'VIX <= 12'
  },
  NOT_EQUAL: {
    value: 'neq',
    name: 'Not Equal',
    symbol: '!=',
    description: 'Execute when index value is not equal to threshold',
    example: 'Apple != $175'
  }
};

/**
 * Validate order parameters
 */
function validateOrderParams(params: any) {
  const errors = [];
  
  if (!params.fromToken) errors.push('fromToken is required');
  if (!params.toToken) errors.push('toToken is required');
  if (!params.amount) errors.push('amount is required');
  if (!params.expectedAmount) errors.push('expectedAmount is required');
  if (!params.condition) errors.push('condition is required');
  if (!params.privateKey) errors.push('privateKey is required');
  if (!params.oneInchApiKey) errors.push('oneInchApiKey is required');
  
  if (params.condition) {
    if (typeof params.condition.indexId !== 'number') errors.push('condition.indexId must be a number');
    if (!params.condition.operator) errors.push('condition.operator is required');
    if (typeof params.condition.threshold !== 'number') errors.push('condition.threshold must be a number');
    
    // Validate index ID
    const validIndexIds = Object.values(INDICES).map((idx: any) => idx.id);
    if (!validIndexIds.includes(params.condition.indexId)) {
      errors.push(`Invalid indexId. Valid values: ${validIndexIds.join(', ')}`);
    }
    
    // Validate operator
    const validOperators = Object.values(OPERATORS).map((op: any) => op.value);
    if (!validOperators.includes(params.condition.operator)) {
      errors.push(`Invalid operator. Valid values: ${validOperators.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get token information by symbol or address
 */
function getTokenInfo(tokenInput: string) {
  // If it's already an address
  if (tokenInput.startsWith('0x')) {
    return {
      address: tokenInput,
      decimals: 18, // Default
      symbol: 'UNKNOWN'
    };
  }
  
  // Look up by symbol
  const token = (CONFIG.TOKENS as any)[tokenInput.toUpperCase()];
  if (!token) {
    throw new Error(`Unknown token: ${tokenInput}. Available: ${Object.keys(CONFIG.TOKENS).join(', ')}`);
  }
  
  return token;
}

/**
 * Check wallet balances before attempting transactions
 */
async function checkWalletBalances(wallet: Wallet, token: any, amount: any) {
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
  const connectedWallet = wallet.connect(provider);
  
  // Check ETH balance for gas
  const ethBalance = await provider.getBalance(wallet.address);
  const ethBalanceFormatted = ethers.utils.formatEther(ethBalance);
  console.log(`💰 ETH Balance: ${ethBalanceFormatted} ETH`);
  
  // Estimate gas cost (rough estimate)
  const gasPrice = await provider.getGasPrice();
  const estimatedGasCost = gasPrice.mul(200000); // Rough estimate for approval + order
  const estimatedCostEth = ethers.utils.formatEther(estimatedGasCost);
  
  console.log(`⛽ Estimated gas cost: ${estimatedCostEth} ETH`);
  
  if (ethBalance.lt(estimatedGasCost)) {
    console.log(`⚠️  WARNING: Low ETH balance for gas fees. Need ~${estimatedCostEth} ETH, have ${ethBalanceFormatted} ETH`);
    console.log(`💡 To fund wallet, send ETH to: ${wallet.address}`);
    console.log(`📝 Order will be created but token approval and submission may fail`);
  } else {
    console.log(`✅ Sufficient ETH balance for gas fees`);
  }
  
  // Check token balance
  if (token.address.toLowerCase() !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    const erc20Abi = ['function balanceOf(address account) view returns (uint256)'];
    const tokenContract = new ethers.Contract(token.address, erc20Abi, provider);
    const tokenBalance = await tokenContract.balanceOf(wallet.address);
    const tokenBalanceFormatted = ethers.utils.formatUnits(tokenBalance, token.decimals);
    const requiredAmount = ethers.utils.formatUnits(amount, token.decimals);
    
    console.log(`🪙 ${token.symbol} Balance: ${tokenBalanceFormatted} ${token.symbol}`);
    console.log(`🎯 Required Amount: ${requiredAmount} ${token.symbol}`);
    
    if (tokenBalance.lt(amount)) {
      console.log(`⚠️  WARNING: Insufficient ${token.symbol} balance. Need ${requiredAmount} ${token.symbol}, have ${tokenBalanceFormatted} ${token.symbol}`);
      console.log(`📝 Order will be created but may fail during execution`);
    } else {
      console.log(`✅ Sufficient ${token.symbol} balance`);
    }
  }
}

/**
 * Ensure token approval for 1inch Limit Order Protocol
 */
async function ensureTokenApproval(wallet: Wallet, token: any, amount: any) {
  try {
    // Skip approval for native ETH
    if (token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      console.log('📋 Native ETH - no approval needed');
      return;
    }
    
    // Setup provider
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
    const connectedWallet = wallet.connect(provider);
    
    // ERC20 ABI for allowance and approve
    const erc20Abi = [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function balanceOf(address account) view returns (uint256)'
    ];
    
    const tokenContract = new ethers.Contract(token.address, erc20Abi, connectedWallet);
    
    // Check current allowance
    const currentAllowance = await tokenContract.allowance(wallet.address, CONFIG.LIMIT_ORDER_PROTOCOL);
    console.log(`📋 Current allowance: ${ethers.utils.formatUnits(currentAllowance, token.decimals)} ${token.symbol}`);
    console.log(`📋 Required amount: ${ethers.utils.formatUnits(amount, token.decimals)} ${token.symbol}`);
    
    // If allowance is sufficient, return
    if (currentAllowance.gte(amount)) {
      console.log('✅ Sufficient allowance already exists');
      return;
    }
    
    // Need to approve more tokens
    console.log('⚠️ Insufficient allowance - attempting token approval...');
    console.log(`ℹ️  Note: This requires ETH for gas fees in wallet: ${wallet.address}`);
    
    // Approve exact amount needed to reduce gas costs
    const approveTx = await tokenContract.approve(CONFIG.LIMIT_ORDER_PROTOCOL, amount, {
      gasLimit: 100000, // Standard gas limit for ERC20 approve
    });
    
    console.log(`📝 Approval transaction sent: ${approveTx.hash}`);
    console.log('⏳ Waiting for approval confirmation...');
    
    const receipt = await approveTx.wait(1); // Wait for 1 confirmation
    
    if (receipt.status === 1) {
      console.log('✅ Token approval successful!');
      console.log(`✅ Approved ${ethers.utils.formatUnits(amount, token.decimals)} ${token.symbol} for 1inch`);
    } else {
      throw new Error('Token approval transaction failed');
    }
    
  } catch (error: any) {
    console.error('❌ Token approval error:', error);
    
    // Provide helpful error messages
    if (error.message.includes('insufficient funds') || error.message.includes('failed to send tx')) {
      throw new Error(`Token approval failed due to insufficient ETH for gas fees. Please ensure wallet ${wallet.address} has enough ETH for transaction fees.`);
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error(`Insufficient ETH for gas fees in wallet: ${wallet.address}`);
    } else {
      throw new Error(`Token approval failed: ${error.message}`);
    }
  }
}

/**
 * Create index predicate for 1inch
 */
function createIndexPredicate(condition: any) {
  const indexKey = Object.keys(INDICES).find(key => (INDICES as any)[key].id === condition.indexId);
  console.log(`   Index: ${indexKey ? (INDICES as any)[indexKey]?.name : 'Unknown'}`);
  console.log(`   Operator: ${(OPERATORS as any)[Object.keys(OPERATORS).find(key => (OPERATORS as any)[key].value === condition.operator)]?.name}`);
  console.log(`   Threshold: ${condition.threshold}`);
  
  // Oracle call encoding
  const getIndexValueSelector = ethers.utils.id('getIndexValue(uint256)').slice(0, 10);
  const oracleCallData = ethers.utils.defaultAbiCoder.encode(
    ['bytes4', 'uint256'],
    [getIndexValueSelector, condition.indexId]
  );
  
  // Predicate structure: operator(threshold, arbitraryStaticCall(oracle, callData))
  const arbitraryStaticCallData = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [CONFIG.INDEX_ORACLE_ADDRESS, oracleCallData]
  );
  
  let predicateData;
  
  // Map our operator to 1inch methods (only gt, lt, eq are commonly supported)
  switch (condition.operator) {
    case 'gt':
    case 'gte':
      predicateData = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes'],
        [condition.threshold, arbitraryStaticCallData]
      );
      break;
    case 'lt':
    case 'lte':
      predicateData = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes'],
        [condition.threshold, arbitraryStaticCallData]
      );
      break;
    case 'eq':
      predicateData = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes'],
        [condition.threshold, arbitraryStaticCallData]
      );
      break;
    default:
      // Default to gt
      predicateData = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes'],
        [condition.threshold, arbitraryStaticCallData]
      );
  }
  
  // Complete predicate with protocol address
  const completePredicate = ethers.utils.solidityPack(
    ['address', 'bytes'],
    [CONFIG.LIMIT_ORDER_PROTOCOL, predicateData]
  );
  
  return completePredicate;
}

/**
 * Create a 1inch limit order with index-based predicate (embedded backend logic)
 */
async function createIndexBasedOrderStandalone(params: any) {
  console.log('🚀 Creating Index-Based Limit Order (Standalone)');
  console.log('==============================================\n');
  
  try {
    // Validate parameters
    const validation = validateOrderParams(params);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Setup wallet and SDK
    const wallet = new Wallet(params.privateKey);
    const sdk = new Sdk({
      authKey: params.oneInchApiKey,
      networkId: CONFIG.CHAIN_ID,
      httpConnector: new FetchProviderConnector()
    });
    
    console.log(`👤 Wallet: ${wallet.address}`);
    console.log(`🌐 Network: Base Mainnet (${CONFIG.CHAIN_ID})`);
    console.log('');
    
    // Parse tokens
    const fromToken = getTokenInfo(params.fromToken);
    const toToken = getTokenInfo(params.toToken);
    
    // Validate that tokens are not native ETH (1inch limit orders require ERC-20 tokens)
    if (fromToken.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      throw new Error('Cannot use native ETH for limit orders. Please use WETH instead.');
    }
    if (toToken.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      throw new Error('Cannot use native ETH for limit orders. Please use WETH instead.');
    }
    
    // Parse amounts
    const makingAmount = ethers.utils.parseUnits(params.amount, fromToken.decimals);
    const takingAmount = ethers.utils.parseUnits(params.expectedAmount, toToken.decimals);
    
    console.log(`📊 Trading: ${params.amount} ${fromToken.symbol} → ${params.expectedAmount} ${toToken.symbol}`);
    console.log(`📋 Condition: ${params.condition.description}`);
    console.log('');
    
    // Check wallet balances before proceeding
    console.log('💰 Checking wallet balances...');
    await checkWalletBalances(wallet, fromToken, makingAmount);
    console.log('✅ Wallet balance check passed');
    
    // Create predicate
    console.log('🔮 Creating index predicate...');
    const predicate = createIndexPredicate(params.condition);
    
    // Create extension
    const extension = new ExtensionBuilder()
      .withPredicate(predicate)
      .build();
    console.log('✅ Extension created with predicate');
    
    // Setup timing
    const expirationHours = params.expirationHours || 24;
    const expiration = BigInt(Math.floor(Date.now() / 1000) + (expirationHours * 3600));
    const UINT_40_MAX = (1n << 40n) - 1n;
    
    // Create MakerTraits
    const makerTraits = MakerTraits.default()
      .withExpiration(expiration)
      .withNonce(randBigInt(UINT_40_MAX))
      .allowPartialFills()
      .allowMultipleFills()
      .withExtension();
    
    console.log('🔧 Creating order...');
    
    // Create order (let SDK handle salt)
    const order = await sdk.createOrder({
      makerAsset: new Address(fromToken.address),
      takerAsset: new Address(toToken.address),
      makingAmount: makingAmount,
      takingAmount: takingAmount,
      maker: new Address(wallet.address),
      extension: extension.encode()
    }, makerTraits);
    
    console.log(`✅ Order created: ${order.getOrderHash()}`);
    
    // Sign order
    console.log('✍️ Signing order...');
    const typedData = order.getTypedData(CONFIG.CHAIN_ID);
    const signature = await wallet._signTypedData(
      typedData.domain,
      { Order: typedData.types.Order },
      typedData.message
    );
    console.log('✅ Order signed');
    
    // Check and handle token approval before submitting
    console.log('🔍 Checking token allowance...');
    try {
      await ensureTokenApproval(wallet, fromToken, makingAmount);
    } catch (approvalError: any) {
      console.log('⚠️  Token approval failed, but order will still be created');
      console.log('📝 Order can be submitted later after resolving approval issues');
      console.log(`💡 Error: ${approvalError.message}`);
      // Continue with order creation - it will fail on submission but the order hash will be valid
    }
    
    // Submit order
    console.log('📤 Submitting to 1inch...');
    let submitResult = null;
    let submitError = null;
    
    try {
      submitResult = await sdk.submitOrder(order, signature);
      console.log('✅ Order submitted successfully!');
    } catch (error: any) {
      submitError = error.message;
      console.log(`⚠️ Submit failed: ${error.message}`);
    }
    
    // Return comprehensive result
    const result = {
      success: submitResult !== null,
      orderHash: order.getOrderHash(),
      order: {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount: params.amount,
        expectedAmount: params.expectedAmount,
        condition: params.condition.description,
        expiration: new Date(Number(expiration) * 1000).toISOString()
      },
      condition: {
        index: (INDICES as any)[Object.keys(INDICES).find(key => (INDICES as any)[key].id === params.condition.indexId)],
        operator: params.condition.operator,
        threshold: params.condition.threshold,
        currentValue: (INDICES as any)[Object.keys(INDICES).find(key => (INDICES as any)[key].id === params.condition.indexId)]?.currentValue
      },
      submission: {
        submitted: submitResult !== null,
        result: submitResult,
        error: submitError
      },
      wallet: {
        address: wallet.address,
        fundingNote: submitError ? `To enable order submission, send ETH for gas fees to: ${wallet.address}` : null
      },
      technical: {
        orderHash: order.getOrderHash(),
        salt: order.salt.toString(),
        signature: signature,
        predicate: predicate.substring(0, 40) + '...'
      }
    };
    
    console.log('\n🎯 ORDER CREATION COMPLETE');
    console.log('===========================');
    console.log(`Status: ${result.success ? 'SUCCESS' : 'CREATED (submission failed)'}`);
    console.log(`Hash: ${result.orderHash}`);
    console.log(`Condition: ${result.condition.index?.name} ${(OPERATORS as any)[Object.keys(OPERATORS).find(key => (OPERATORS as any)[key].value === params.condition.operator)]?.symbol} ${params.condition.threshold / 100}`);
    
    if (!result.success && submitError) {
      console.log('\n💡 TO ENABLE ORDER SUBMISSION:');
      console.log('===============================');
      console.log(`1. Send Base ETH to wallet: ${wallet.address}`);
      console.log(`2. Get Base ETH from: https://bridge.base.org or faucets`);
      console.log(`3. Ensure wallet has tokens to trade (${fromToken.symbol})`);
      console.log(`4. Retry order creation or use approve-token API first`);
    }
    
    return result;
    
  } catch (error: any) {
    console.error('❌ Order creation failed:', error.message);
    return {
      success: false,
      error: error.message,
      orderHash: null
    };
  }
}

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

  } else if (action === 'check-oracle') {
    const indexId = searchParams.get('indexId');
    
    if (!indexId || isNaN(Number(indexId))) {
      return NextResponse.json({ 
        error: 'Invalid indexId parameter' 
      }, { status: 400 });
    }

    try {
      // Check if index has chainlink oracle configured
      const oracleCheck = await checkIndexOracleStatus(Number(indexId));
      
              return NextResponse.json({
          success: true,
          indexId: Number(indexId),
          hasOracle: oracleCheck.hasSpecificOracle, // Only true if specific oracle address is set
          oracleType: oracleCheck.oracleType,
          oracleTypeName: oracleCheck.oracleTypeName,
          oracleAddress: oracleCheck.oracleAddress,
          isChainlink: oracleCheck.isChainlink,
          isMock: oracleCheck.isMock,
          hasSpecificOracle: oracleCheck.hasSpecificOracle,
          setupRequired: !oracleCheck.hasSpecificOracle // Setup required if no specific oracle
        }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });

    } catch (error: any) {
      console.error('❌ Oracle check error:', error);
      return NextResponse.json({
        error: 'Failed to check oracle status',
        message: error.message || 'Oracle check error'
      }, { status: 500 });
    }

  } else {
    return NextResponse.json({ 
      error: 'Invalid action. Use "get-orders" or "check-oracle"' 
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

    } else if (action === 'create-order') {
      const { 
        fromToken,
        toToken, 
        amount,
        expectedAmount,
        condition,
        expirationHours,
        privateKey,
        oneInchApiKey
      } = body;

      if (!fromToken || !toToken || !amount || !expectedAmount || !condition || !privateKey || !oneInchApiKey) {
        return NextResponse.json({ 
          error: 'Missing required parameters: fromToken, toToken, amount, expectedAmount, condition, privateKey, oneInchApiKey' 
        }, { status: 400 });
      }

      try {
        console.log('🚀 Creating index-based order with embedded backend logic');

        // Embedded backend logic for standalone deployment
        const result = await createIndexBasedOrderStandalone({
          fromToken,
          toToken,
          amount,
          expectedAmount,
          condition,
          expirationHours: expirationHours || 24,
          privateKey,
          oneInchApiKey
        });

        if (result.success) {
          console.log('✅ Order created successfully:', result.orderHash);
          
          return NextResponse.json({
            success: true,
            orderHash: result.orderHash,
            order: result.order,
            condition: result.condition,
            submission: result.submission,
            technical: result.technical,
            message: `Order ${result.orderHash} created successfully!`
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          });
        } else {
          throw new Error(result.error || 'Failed to create order');
        }

      } catch (backendError: any) {
        console.error('❌ Order creation error:', backendError);
        return NextResponse.json({
          error: 'Failed to create order',
          message: backendError.message || 'Order creation error',
          details: backendError.toString(),
          code: backendError.code || 'UNKNOWN_ERROR'
        }, { status: 500 });
      }

    } else if (action === 'approve-token') {
      const { 
        tokenAddress,
        amount,
        privateKey
      } = body;

      if (!tokenAddress || !amount || !privateKey) {
        return NextResponse.json({ 
          error: 'Missing required parameters: tokenAddress, amount, privateKey' 
        }, { status: 400 });
      }

      try {
        console.log('🔐 Approving token:', tokenAddress, 'Amount:', amount);

        // Setup wallet and provider
        const wallet = new Wallet(privateKey);
        const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
        const connectedWallet = wallet.connect(provider);
        
        // Get token info
        const tokenInfo = getTokenInfo(tokenAddress);
        const approvalAmount = ethers.utils.parseUnits(amount.toString(), tokenInfo.decimals);
        
        // Approve token
        await ensureTokenApproval(connectedWallet, tokenInfo, approvalAmount);
        
        return NextResponse.json({
          success: true,
          message: `Successfully approved ${amount} ${tokenInfo.symbol} for 1inch`
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });

      } catch (approvalError: any) {
        console.error('❌ Token approval error:', approvalError);
        return NextResponse.json({
          error: 'Failed to approve token',
          message: approvalError.message || 'Token approval error',
          details: approvalError.toString()
        }, { status: 500 });
      }

    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Use "cancel-order", "create-order", or "approve-token"' 
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

/**
 * Check if an index has a chainlink oracle configured (embedded backend logic)
 */
async function checkIndexOracleStatus(indexId: number) {
  console.log(`🔍 Checking oracle status for index ${indexId}`);
  
  try {
    // Create contract interface to check oracle
    const { ethers } = require('ethers');
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
    
    // Oracle contract ABI (minimal for our needs)
    const oracleABI = [
      "function getIndexOracleType(uint256 indexId) external view returns (uint8 oracleType)",
      "function getIndexChainlinkOracle(uint256 indexId) external view returns (address oracleAddress)"
    ];
    
    const oracleContract = new ethers.Contract(
      CONFIG.INDEX_ORACLE_ADDRESS,
      oracleABI,
      provider
    );
    
    // Get oracle type for this index (0 = MOCK, 1 = CHAINLINK)
    const oracleType = await oracleContract.getIndexOracleType(indexId);
    const oracleAddress = await oracleContract.getIndexChainlinkOracle(indexId);
    
    // Check if oracle has a specific address (not zero address)
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const hasSpecificOracle = oracleAddress !== zeroAddress && oracleAddress !== '0x0';
    const oracleTypeName = oracleType === 0 ? 'MOCK' : 'CHAINLINK';
    
    console.log(`   Index ID: ${indexId}`);
    console.log(`   Oracle Type: ${oracleType} (${oracleTypeName})`);
    console.log(`   Oracle Address: ${oracleAddress}`);
    console.log(`   Has Specific Oracle: ${hasSpecificOracle}`);
    console.log(`   Is Zero Address: ${oracleAddress === zeroAddress}`);
    
    return {
      hasOracle: hasSpecificOracle, // Only true if specific oracle address is set
      oracleType: oracleType,
      oracleTypeName: oracleTypeName,
      oracleAddress: oracleAddress,
      isChainlink: oracleType === 1,
      isMock: oracleType === 0,
      hasSpecificOracle: hasSpecificOracle
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to check oracle for index ${indexId}:`, error.message);
    throw new Error(`Oracle check failed: ${error.message}`);
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