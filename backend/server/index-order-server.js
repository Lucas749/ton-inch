#!/usr/bin/env node

/**
 * INDEX ORDER SERVER
 * ==================
 * 
 * Local server to handle 1inch SDK operations and avoid CORS issues.
 * Provides REST API endpoints for creating and managing index-based orders.
 */

const express = require('express');
const cors = require('cors');
const { createIndexBasedOrder, INDICES, OPERATORS, CONFIG } = require('../src/index-order-creator.js');
const { getAllActiveOrdersForMaker, getAllHistoryOrdersForMaker } = require('../src/order-manager.js');
const { cancelLimitOrder, getOrderDetails, canCancelOrder } = require('../src/order-cancellation.js');
require('dotenv').config();
const crypto = require('crypto');
const { ethers } = require('ethers');

// In-memory store for original order objects
const orderStore = new Map();

const app = express();
const PORT = process.env.PORT || process.env.ORDER_SERVER_PORT || 3001;

// CORS Configuration - Allow everything (no restrictions)
const corsOptions = {
  origin: true,  // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: '*',  // Allow all headers
  exposedHeaders: '*'   // Expose all headers
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===================================================================
// API ENDPOINTS
// ===================================================================

/**
 * GET /health - Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Index Order Server',
    version: '1.0.0'
  });
});

/**
 * GET /indices - Get all available indices
 */
app.get('/indices', (req, res) => {
  res.json({
    success: true,
    indices: INDICES,
    total: Object.keys(INDICES).length
  });
});

/**
 * GET /operators - Get all available operators
 */
app.get('/operators', (req, res) => {
  res.json({
    success: true,
    operators: OPERATORS,
    total: Object.keys(OPERATORS).length
  });
});

/**
 * GET /tokens - Get all supported tokens
 */
app.get('/tokens', (req, res) => {
  res.json({
    success: true,
    tokens: CONFIG.TOKENS,
    total: Object.keys(CONFIG.TOKENS).length
  });
});

/**
 * POST /orders/prepare - Prepare unsigned order for frontend signing
 */
app.post('/orders/prepare', async (req, res) => {
  try {
    console.log('🔧 Preparing unsigned order...');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Extract order parameters from request
    const {
      fromToken,
      toToken,
      amount,
      expectedAmount,
      condition,
      expirationHours,
      makerAddress,  // Wallet address (not private key!)
      config: customConfig  // Custom configuration
    } = req.body;
    
    // Validate required fields
    if (!fromToken || !toToken || !amount || !expectedAmount || !condition || !makerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['fromToken', 'toToken', 'amount', 'expectedAmount', 'condition', 'makerAddress']
      });
    }

    // Extract and validate config if provided
    let config = CONFIG; // Default config
    if (customConfig) {
      // Validate and merge custom config fields
      if (customConfig.CHAIN_ID && typeof customConfig.CHAIN_ID === 'number') {
        config = { ...config, CHAIN_ID: customConfig.CHAIN_ID };
      }
      if (customConfig.INDEX_ORACLE_ADDRESS && typeof customConfig.INDEX_ORACLE_ADDRESS === 'string') {
        config = { ...config, INDEX_ORACLE_ADDRESS: customConfig.INDEX_ORACLE_ADDRESS };
      }
      if (customConfig.LIMIT_ORDER_PROTOCOL && typeof customConfig.LIMIT_ORDER_PROTOCOL === 'string') {
        config = { ...config, LIMIT_ORDER_PROTOCOL: customConfig.LIMIT_ORDER_PROTOCOL };
      }
      
      console.log('🔧 Using custom config:', {
        CHAIN_ID: config.CHAIN_ID,
        INDEX_ORACLE_ADDRESS: config.INDEX_ORACLE_ADDRESS,
        LIMIT_ORDER_PROTOCOL: config.LIMIT_ORDER_PROTOCOL
      });
    }
    
    console.log('📋 Order parameters:', {
      fromToken,
      toToken, 
      amount,
      expectedAmount,
      condition,
      expirationHours: expirationHours || 24,
      makerAddress
    });
    
    // Create unsigned order with custom config
    const result = await prepareUnsignedOrder({
      fromToken,
      toToken,
      amount,
      expectedAmount,
      condition,
      expirationHours: expirationHours || 24,
      makerAddress,
      oneInchApiKey: process.env.ONEINCH_API_KEY
    }, config);
    
    console.log('✅ Unsigned order prepared');
    res.json(result);
    
  } catch (error) {
    console.error('❌ Order preparation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /orders/submit - Submit signed order to 1inch
 */
app.post('/orders/submit', async (req, res) => {
  try {
    console.log('📤 Submitting signed order to 1inch...');
    
    const { orderData, signature } = req.body;
    
    if (!orderData || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['orderData', 'signature']
      });
    }
    
    // Submit the signed order
    const result = await submitSignedOrder(orderData, signature);
    
    console.log('✅ Order submission completed');
    res.json(result);
    
  } catch (error) {
    console.error('❌ Order submission failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /orders/validate - Validate order parameters without creating
 */
app.post('/orders/validate', (req, res) => {
  try {
    // Validate required fields for new flow (no private key needed)
    const { fromToken, toToken, amount, expectedAmount, condition, makerAddress } = req.body;
    const errors = [];
    
    if (!fromToken) errors.push('fromToken is required');
    if (!toToken) errors.push('toToken is required');
    if (!amount) errors.push('amount is required');
    if (!expectedAmount) errors.push('expectedAmount is required');
    if (!condition) errors.push('condition is required');
    if (!makerAddress) errors.push('makerAddress is required');
    
    if (condition) {
      if (typeof condition.indexId !== 'number') errors.push('condition.indexId must be a number');
      if (!condition.operator) errors.push('condition.operator is required');
      if (typeof condition.threshold !== 'number') errors.push('condition.threshold must be a number');
    }
    
    const validation = {
      isValid: errors.length === 0,
      errors
    };
    
    res.json({
      success: true,
      validation
    });
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /orders/examples - Get example order configurations
 */
app.get('/orders/examples', (req, res) => {
  const examples = [
    {
      name: 'Tesla Bullish Breakout',
      description: 'Buy WETH when Tesla > $250',
      flow: 'Secure: Server prepares → Frontend signs → Server submits',
      order: {
        fromToken: 'USDC',
        toToken: 'WETH',
        amount: '1.0',
        expectedAmount: '0.0003',
        condition: {
          indexId: 5,  // Tesla Stock
          operator: 'gt',
          threshold: 25000,
          description: 'Tesla Stock > $250'
        },
        expirationHours: 24
        // Note: makerAddress will be provided by frontend from wallet
      }
    },
    {
      name: 'VIX Low Volatility',
      description: 'Buy WETH when VIX < 15 (low volatility)',
      flow: 'Secure: Server prepares → Frontend signs → Server submits',
      order: {
        fromToken: 'USDC',
        toToken: 'WETH',
        amount: '1.0',
        expectedAmount: '0.0003',
        condition: {
          indexId: 3,  // VIX Index
          operator: 'lt',
          threshold: 1500,
          description: 'VIX < 15 (Low volatility)'
        },
        expirationHours: 12
      }
    },
    {
      name: 'Bitcoin Moon',
      description: 'Buy more WETH when Bitcoin > $100k',
      flow: 'Secure: Server prepares → Frontend signs → Server submits',
      order: {
        fromToken: 'USDC',
        toToken: 'WETH',
        amount: '5.0',
        expectedAmount: '0.0015',
        condition: {
          indexId: 2,  // BTC Price
          operator: 'gt',
          threshold: 10000000,
          description: 'Bitcoin > $100,000'
        },
        expirationHours: 48
      }
    },
    {
      name: 'High Inflation Hedge',
      description: 'Buy WETH when inflation > 5%',
      flow: 'Secure: Server prepares → Frontend signs → Server submits',
      order: {
        fromToken: 'USDC',
        toToken: 'WETH',
        amount: '2.0',
        expectedAmount: '0.0006',
        condition: {
          indexId: 0,  // Inflation Rate
          operator: 'gt',
          threshold: 500,
          description: 'Inflation Rate > 5%'
        },
        expirationHours: 168  // 1 week
      }
    }
  ];
  
  res.json({
    success: true,
    examples,
    total: examples.length
  });
});

// ===================================================================
// ORDER MANAGEMENT ENDPOINTS
// ===================================================================

/**
 * GET /orders/active/:makerAddress - Get all active orders for a maker
 */
app.get('/orders/active/:makerAddress', async (req, res) => {
  try {
    const { makerAddress } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const apiKey = process.env.ONEINCH_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API key not configured'
      });
    }

    console.log(`📋 Getting active orders for maker: ${makerAddress}`);
    
    const result = await getAllActiveOrdersForMaker(
      makerAddress, 
      apiKey, 
      { page: parseInt(page), limit: parseInt(limit) }
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error getting active orders:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /orders/history/:makerAddress - Get historical orders for a maker
 */
app.get('/orders/history/:makerAddress', async (req, res) => {
  try {
    const { makerAddress } = req.params;
    const { page = 1, limit = 50, status = 'all' } = req.query;
    const apiKey = process.env.ONEINCH_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API key not configured'
      });
    }

    console.log(`📚 Getting order history for maker: ${makerAddress}, status: ${status}`);
    
    const result = await getAllHistoryOrdersForMaker(
      makerAddress, 
      apiKey, 
      { page: parseInt(page), limit: parseInt(limit), status }
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error getting order history:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /orders/details/:orderHash - Get order details by hash
 */
app.get('/orders/details/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    const apiKey = process.env.ONEINCH_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API key not configured'
      });
    }

    console.log(`🔍 Getting order details for: ${orderHash}`);
    
    const result = await getOrderDetails(orderHash, apiKey);
    res.json(result);
  } catch (error) {
    console.error('❌ Error getting order details:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /orders/can-cancel - Check if order can be cancelled
 */
app.post('/orders/can-cancel', async (req, res) => {
  try {
    const { orderHash, walletAddress } = req.body;
    const apiKey = process.env.ONEINCH_API_KEY;
    
    if (!orderHash || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'orderHash and walletAddress are required'
      });
    }
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API key not configured'
      });
    }

    console.log(`🔍 Checking if order can be cancelled: ${orderHash} by ${walletAddress}`);
    
    const result = await canCancelOrder(orderHash, walletAddress, apiKey);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Error checking cancellation:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /orders/cancel - Cancel an order (requires private key or wallet signature)
 * Note: This endpoint is for backend cancellation only. Frontend should use wallet-based cancellation.
 */
app.post('/orders/cancel', async (req, res) => {
  try {
    const { orderHash, privateKey } = req.body;
    const apiKey = process.env.ONEINCH_API_KEY;
    
    if (!orderHash) {
      return res.status(400).json({
        success: false,
        error: 'orderHash is required'
      });
    }
    
    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'This endpoint requires privateKey. Use wallet-based cancellation in frontend instead.'
      });
    }
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API key not configured'
      });
    }

    console.log(`🚫 Cancelling order: ${orderHash}`);
    
    const result = await cancelLimitOrder(orderHash, privateKey, apiKey);
    res.json(result);
  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===================================================================
// CORE ORDER FUNCTIONS
// ===================================================================

/**
 * Prepare unsigned order for frontend signing
 */
async function prepareUnsignedOrder(params, config = null) {
  console.log('🔧 Creating unsigned order with 1inch SDK...');
  
  const { LimitOrder, MakerTraits, Address, Sdk, randBigInt, FetchProviderConnector, ExtensionBuilder } = require('@1inch/limit-order-sdk');
  const { ethers } = require('ethers');
  
  // Use provided config or fall back to default
  const CONFIG = config || {
    CHAIN_ID: 8453,
    LIMIT_ORDER_PROTOCOL: '0x111111125421cA6dc452d289314280a0f8842A65',
    INDEX_ORACLE_ADDRESS: '0x3073D2b5e72c48f16Ee99700BC07737b8ecd8709',
    TOKENS: {
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, symbol: 'USDC' },
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH' },
      ONEINCH: { address: '0xc5fecc3a29fb57b5024eec8a2239d4621e111cce', decimals: 18, symbol: '1INCH' },
      DAI: { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, symbol: 'DAI' }
    }
  };
  
  try {
    // Initialize 1inch SDK
    const sdk = new Sdk({
      authKey: params.oneInchApiKey,
      networkId: CONFIG.CHAIN_ID,
      httpConnector: new FetchProviderConnector()
    });
    
    console.log(`👤 Maker: ${params.makerAddress}`);
    console.log(`🌐 Network: Base Mainnet (${CONFIG.CHAIN_ID})`);
    
    // Parse tokens
    const fromToken = getTokenInfo(params.fromToken, CONFIG.TOKENS);
    const toToken = getTokenInfo(params.toToken, CONFIG.TOKENS);
    
    // Parse amounts
    const makingAmount = ethers.utils.parseUnits(params.amount, fromToken.decimals);
    const takingAmount = ethers.utils.parseUnits(params.expectedAmount, toToken.decimals);
    
    console.log(`📊 Trading: ${params.amount} ${fromToken.symbol} → ${params.expectedAmount} ${toToken.symbol}`);
    console.log(`📋 Condition: ${params.condition.description}`);
    
    // Create predicate
    console.log('🔮 Creating index predicate...');
    const predicate = createIndexPredicate(params.condition, CONFIG);
    
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
    
    // Create order
    const order = await sdk.createOrder({
      makerAsset: new Address(fromToken.address),
      takerAsset: new Address(toToken.address),
      makingAmount: makingAmount,
      takingAmount: takingAmount,
      maker: new Address(params.makerAddress),
      extension: extension.encode()
    }, makerTraits);
    
    const orderHash = order.getOrderHash(CONFIG.CHAIN_ID);
    console.log(`✅ Order created: ${orderHash}`);
    
    // Create typed data for signing
    const typedData = order.getTypedData(CONFIG.CHAIN_ID);
    
    console.log('✅ Unsigned order prepared for frontend signing');
    
    // Generate unique ID for this order and store the original order object
    const orderId = crypto.randomBytes(16).toString('hex');
    orderStore.set(orderId, {
      order: order,  // Store the original SDK order object
      sdk: sdk,      // Store the SDK instance for submission
      orderHash: orderHash,
      created: Date.now()
    });
    
    console.log(`📦 Order stored with ID: ${orderId}`);
    
    // Make typedData serializable by converting BigInt values to strings
    let makerTraitsValue;
    if (typedData.message.makerTraits && typedData.message.makerTraits.value && typedData.message.makerTraits.value.value) {
      makerTraitsValue = typedData.message.makerTraits.value.value.toString();
    } else if (typedData.message.makerTraits && typeof typedData.message.makerTraits === 'bigint') {
      makerTraitsValue = typedData.message.makerTraits.toString();
    } else {
      makerTraitsValue = order.makerTraits.value.value.toString(); // Fallback to order structure
    }

    const serializableTypedData = {
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: {
        ...typedData.message,
        salt: typedData.message.salt.toString(),
        makingAmount: typedData.message.makingAmount.toString(),
        takingAmount: typedData.message.takingAmount.toString(),
        makerTraits: makerTraitsValue
      }
    };

    return {
      success: true,
      orderHash,
      orderId: orderId,  // Include the order ID for later retrieval
      order: {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount: params.amount,
        expectedAmount: params.expectedAmount,
        condition: params.condition.description,
        expiration: new Date(Number(expiration) * 1000).toISOString()
      },
      condition: {
        indexId: params.condition.indexId,
        operator: params.condition.operator,
        threshold: params.condition.threshold,
        description: params.condition.description
      },
      signingData: {
        typedData: serializableTypedData,
        orderHash,
        orderId: orderId  // Include ID in signing data for submission
      },
      technical: {
        orderHash: orderHash,
        salt: order.salt.toString(),
        predicate: predicate.substring(0, 40) + '...'
      }
    };
    
  } catch (error) {
    console.error('❌ Error preparing order:', error);
    throw error;
  }
}

/**
 * Submit signed order to 1inch using stored order object
 */
async function submitSignedOrder(orderData, signature) {
  console.log('📤 Submitting signed order to 1inch...');
  
  try {
    console.log(`📋 Order Hash: ${orderData.orderHash}`);
    console.log(`✍️ Signature: ${signature.substring(0, 20)}...`);
    console.log(`🔍 Order ID: ${orderData.orderId}`);
    
    // Retrieve the original order object from storage
    const storedData = orderStore.get(orderData.orderId);
    if (!storedData) {
      throw new Error(`Order not found in storage: ${orderData.orderId}`);
    }
    
    console.log('📦 Retrieved original order from storage');
    
    // Use the original order object and SDK instance
    const { order, sdk } = storedData;
    
    // Submit order to 1inch using the original order object
    let submitResult = null;
    let submitError = null;
    
    try {
      submitResult = await sdk.submitOrder(order, signature);
      console.log('✅ Order submitted successfully to 1inch!');
      console.log('🎯 Submit result:', submitResult);
    } catch (error) {
      submitError = error.message;
      console.log(`⚠️ Submit failed: ${error.message}`);
    }
    
    return {
      success: submitResult !== null,
      orderHash: orderData.orderHash,
      submission: {
        submitted: submitResult !== null,
        result: submitResult,
        error: submitError
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error submitting order:', error);
    throw error;
  }
}

/**
 * Helper function to get token info
 */
function getTokenInfo(tokenInput, tokens) {
  // If it's already an address
  if (tokenInput.startsWith('0x')) {
    return {
      address: tokenInput,
      decimals: 18, // Default
      symbol: 'UNKNOWN'
    };
  }
  
  // Look up by symbol
  const token = tokens[tokenInput.toUpperCase()];
  if (!token) {
    throw new Error(`Unknown token: ${tokenInput}. Available: ${Object.keys(tokens).join(', ')}`);
  }
  
  return token;
}

/**
 * Helper function to create index predicate
 */
function createIndexPredicate(condition, config) {
  const { ethers } = require('ethers');
  
  console.log(`   Index ID: ${condition.indexId}`);
  console.log(`   Operator: ${condition.operator}`);
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
    [config.INDEX_ORACLE_ADDRESS, oracleCallData]
  );
  
  let predicateData;
  
  // Map our operator to 1inch methods
  switch (condition.operator) {
    case 'gt':
    case 'gte': // Treat >= as > for simplicity
      predicateData = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes'],
        [condition.threshold, arbitraryStaticCallData]
      );
      break;
    case 'lt':
    case 'lte': // Treat <= as < for simplicity
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
    [config.LIMIT_ORDER_PROTOCOL, predicateData]
  );
  
  return completePredicate;
}

// ===================================================================
// ERROR HANDLING
// ===================================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /indices',
      'GET /operators', 
      'GET /tokens',
      'GET /orders/examples',
      'POST /orders/prepare',
      'POST /orders/submit',
      'POST /orders/validate'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// ===================================================================
// SERVER STARTUP
// ===================================================================

app.listen(PORT, '0.0.0.0', () => {
  const baseUrl = process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : `http://localhost:${PORT}`;
  
  console.log('🚀 INDEX ORDER SERVER STARTED (Secure Frontend Signing)');
  console.log('========================================================');
  console.log(`🌐 Server: ${baseUrl}`);
  console.log(`📊 Health: ${baseUrl}/health`);
  console.log(`📋 Indices: ${baseUrl}/indices`);
  console.log(`🔧 Operators: ${baseUrl}/operators`);
  console.log(`💰 Tokens: ${baseUrl}/tokens`);
  console.log(`📝 Examples: ${baseUrl}/orders/examples`);
  console.log(`🔧 Prepare: POST ${baseUrl}/orders/prepare`);
  console.log(`📤 Submit: POST ${baseUrl}/orders/submit`);
  console.log(`✅ Validate: POST ${baseUrl}/orders/validate`);
  console.log('');
  console.log('📋 Order Management:');
  console.log(`📊 Active Orders: GET ${baseUrl}/orders/active/:makerAddress`);
  console.log(`📚 Order History: GET ${baseUrl}/orders/history/:makerAddress`);
  console.log(`🔍 Order Details: GET ${baseUrl}/orders/details/:orderHash`);
  console.log(`❓ Can Cancel: POST ${baseUrl}/orders/can-cancel`);
  console.log(`🚫 Cancel Order: POST ${baseUrl}/orders/cancel`);
  console.log('');
  console.log('✅ Server ready for secure order flow!');
  console.log('🔐 Frontend handles signing - no private keys on server');
  console.log(`🔑 API Key: ${process.env.ONEINCH_API_KEY ? 'Configured' : 'Missing - check .env file'}`);
  console.log('');
});

module.exports = app;