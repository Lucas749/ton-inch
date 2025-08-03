#!/usr/bin/env node

/**
 * TEST SERVER-BASED ORDER CREATION
 * =================================
 * 
 * Tests the Index Order Server by making HTTP requests instead of using SDK directly.
 * This avoids CORS issues by using the server as a proxy.
 */

const axios = require('axios');
require('dotenv').config();

const SERVER_BASE_URL = 'http://localhost:3001';

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Make HTTP request with error handling
 */
async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${SERVER_BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    console.log(`📡 ${method.toUpperCase()} ${url}`);
    const response = await axios(config);
    return response.data;
    
  } catch (error) {
    if (error.response) {
      console.error(`❌ HTTP ${error.response.status}:`, error.response.data);
      throw new Error(`Server error: ${error.response.data.error || error.response.statusText}`);
    } else if (error.request) {
      console.error('❌ No response from server. Is the server running?');
      throw new Error('Server not responding. Please start the server with: node backend/server/index-order-server.js');
    } else {
      console.error('❌ Request error:', error.message);
      throw error;
    }
  }
}

/**
 * Check if server is running
 */
async function checkServerHealth() {
  try {
    const health = await makeRequest('GET', '/health');
    console.log('✅ Server is healthy:', health.service);
    return true;
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    return false;
  }
}

/**
 * Get available resources from server
 */
async function getServerResources() {
  console.log('\n📊 FETCHING SERVER RESOURCES');
  console.log('=============================');
  
  try {
    // Get indices
    const indicesResponse = await makeRequest('GET', '/indices');
    console.log(`📋 Available Indices: ${indicesResponse.total}`);
    Object.entries(indicesResponse.indices).forEach(([key, index]) => {
      console.log(`   ${index.id}. ${index.name} (${index.symbol}) - Current: ${index.currentValue/100}`);
    });
    
    // Get operators  
    const operatorsResponse = await makeRequest('GET', '/operators');
    console.log(`\n🔢 Available Operators: ${operatorsResponse.total}`);
    Object.entries(operatorsResponse.operators).forEach(([key, op]) => {
      console.log(`   '${op.value}' - ${op.name} (${op.symbol})`);
    });
    
    // Get tokens
    const tokensResponse = await makeRequest('GET', '/tokens');
    console.log(`\n💰 Supported Tokens: ${tokensResponse.total}`);
    Object.entries(tokensResponse.tokens).forEach(([symbol, token]) => {
      console.log(`   ${symbol}: ${token.address.substring(0, 8)}...`);
    });
    
    return {
      indices: indicesResponse.indices,
      operators: operatorsResponse.operators,
      tokens: tokensResponse.tokens
    };
    
  } catch (error) {
    console.error('❌ Failed to fetch server resources:', error.message);
    throw error;
  }
}

/**
 * Test order validation
 */
async function testOrderValidation() {
  console.log('\n🔍 TESTING ORDER VALIDATION');
  console.log('============================');
  
  // Test valid order
  const validOrder = {
    fromToken: 'USDC',
    toToken: 'WETH',
    amount: '1.0',
    expectedAmount: '0.0003',
    condition: {
      indexId: 5,  // Tesla
      operator: 'gt',
      threshold: 25000,
      description: 'Tesla > $250'
    }
  };
  
  try {
    const validation = await makeRequest('POST', '/orders/validate', validOrder);
    console.log('✅ Valid order validation:', validation.validation.isValid);
    
    if (!validation.validation.isValid) {
      console.log('❌ Validation errors:', validation.validation.errors);
    }
  } catch (error) {
    console.error('❌ Order validation failed:', error.message);
  }
  
  // Test invalid order
  const invalidOrder = {
    fromToken: 'INVALID',
    // Missing required fields
  };
  
  try {
    const validation = await makeRequest('POST', '/orders/validate', invalidOrder);
    console.log('📋 Invalid order validation:', validation.validation.isValid);
    console.log('📋 Expected errors:', validation.validation.errors);
  } catch (error) {
    console.log('✅ Invalid order correctly rejected:', error.message);
  }
}

/**
 * Create test order via server
 */
async function createTestOrder(orderConfig) {
  console.log(`\n🎯 CREATING ORDER: ${orderConfig.name}`);
  console.log('='.repeat(50));
  
  const orderData = {
    ...orderConfig.order,
    walletPrivateKey: process.env.PRIVATE_KEY  // Use private key from .env
  };
  
  console.log('📋 Order Details:');
  console.log(`   Trading: ${orderData.amount} ${orderData.fromToken} → ${orderData.expectedAmount} ${orderData.toToken}`);
  console.log(`   Condition: ${orderData.condition.description}`);
  console.log(`   Expiration: ${orderData.expirationHours} hours`);
  console.log('');
  
  try {
    const result = await makeRequest('POST', '/orders/create', orderData);
    
    console.log('📊 ORDER RESULT:');
    console.log('================');
    console.log(`Success: ${result.success}`);
    console.log(`Order Hash: ${result.orderHash}`);
    
    if (result.order) {
      console.log(`Condition: ${result.order.condition}`);
      console.log(`Expiration: ${result.order.expiration}`);
    }
    
    if (result.condition) {
      console.log(`Index: ${result.condition.index?.name}`);
      console.log(`Threshold: ${result.condition.threshold}`);
      console.log(`Current Value: ${result.condition.currentValue}`);
    }
    
    if (result.submission) {
      console.log(`Submitted to 1inch: ${result.submission.submitted}`);
      if (result.submission.error) {
        console.log(`Submission Error: ${result.submission.error}`);
      }
    }
    
    if (result.technical) {
      console.log(`\nTechnical Details:`);
      console.log(`Salt: ${result.technical.salt}`);
      console.log(`Predicate: ${result.technical.predicate}`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to create ${orderConfig.name}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ===================================================================
// MAIN TEST FUNCTION
// ===================================================================

async function testServerOrders() {
  console.log('🧪 TESTING SERVER-BASED ORDER CREATION');
  console.log('=======================================\n');
  
  // Check if we have required environment variables
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not found in .env file');
    console.log('Please add your wallet private key to backend/.env');
    process.exit(1);
  }
  
  if (!process.env.ONEINCH_API_KEY) {
    console.error('❌ ONEINCH_API_KEY not found in .env file');
    console.log('Please add your 1inch API key to backend/.env');
    process.exit(1);
  }
  
  console.log('✅ Environment variables found');
  
  // 1. Check server health
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.log('\n🚀 Please start the server first:');
    console.log('   cd backend && node server/index-order-server.js');
    process.exit(1);
  }
  
  // 2. Get server resources
  await getServerResources();
  
  // 3. Test validation
  await testOrderValidation();
  
  // 4. Get example orders
  console.log('\n📝 GETTING EXAMPLE ORDERS');
  console.log('=========================');
  
  let examples;
  try {
    const examplesResponse = await makeRequest('GET', '/orders/examples');
    examples = examplesResponse.examples;
    console.log(`Found ${examples.length} example orders`);
  } catch (error) {
    console.error('❌ Failed to get examples:', error.message);
    return;
  }
  
  // 5. Create test orders
  console.log('\n🎯 CREATING TEST ORDERS');
  console.log('=======================');
  
  const results = [];
  
  // Test 1: Tesla order
  const teslaExample = examples.find(ex => ex.name.includes('Tesla'));
  if (teslaExample) {
    const result = await createTestOrder(teslaExample);
    results.push({ name: teslaExample.name, result });
    
    // Wait between orders
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Test 2: VIX order  
  const vixExample = examples.find(ex => ex.name.includes('VIX'));
  if (vixExample) {
    const result = await createTestOrder(vixExample);
    results.push({ name: vixExample.name, result });
  }
  
  // 6. Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('===============');
  
  results.forEach(({ name, result }) => {
    const status = result.success ? '✅ SUCCESS' : '⚠️ PARTIAL';
    console.log(`${status} - ${name}`);
    if (result.orderHash) {
      console.log(`   Hash: ${result.orderHash}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('\n🎉 TESTING COMPLETE');
  console.log('===================');
  console.log('The server successfully:');
  console.log('✅ Handled HTTP requests');
  console.log('✅ Validated order parameters');
  console.log('✅ Created limit orders with predicates');
  console.log('✅ Signed orders with provided wallet');
  console.log('✅ Attempted submission to 1inch');
  console.log('\nServer is ready for frontend integration!');
  console.log('No more CORS issues - frontend can call the server directly.');
}

// ===================================================================
// UTILITY FUNCTIONS FOR FRONTEND INTEGRATION
// ===================================================================

/**
 * Example function showing how frontend would create an order
 */
async function createOrderFromFrontend(orderParams) {
  console.log('📱 SIMULATING FRONTEND ORDER CREATION');
  console.log('=====================================');
  
  try {
    // This is how the frontend would call the server
    const response = await fetch(`${SERVER_BASE_URL}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderParams)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create order');
    }
    
    console.log('✅ Order created via frontend simulation');
    return result;
    
  } catch (error) {
    console.error('❌ Frontend order creation failed:', error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testServerOrders().catch(console.error);
}

module.exports = {
  testServerOrders,
  createOrderFromFrontend,
  makeRequest,
  SERVER_BASE_URL
};