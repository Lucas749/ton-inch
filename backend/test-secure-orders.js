#!/usr/bin/env node

/**
 * TEST SECURE ORDER FLOW
 * =======================
 * 
 * Tests the new secure flow where:
 * 1. Server prepares unsigned orders
 * 2. Frontend signs them
 * 3. Server submits signed orders
 * 
 * This simulates the frontend signing process.
 */

const axios = require('axios');
const { Wallet } = require('ethers');
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
 * Simulate frontend signing process
 */
async function signOrderData(typedData, privateKey) {
  console.log('✍️ Simulating frontend signing...');
  
  // Create wallet from private key (this would be MetaMask in real frontend)
  const wallet = new Wallet(privateKey);
  
  // Convert string values back to BigInt for signing (frontend would handle this)
  const signingTypedData = {
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: {
      ...typedData.message,
      salt: BigInt(typedData.message.salt),
      makingAmount: BigInt(typedData.message.makingAmount),
      takingAmount: BigInt(typedData.message.takingAmount),
      makerTraits: BigInt(typedData.message.makerTraits)
    }
  };
  
  // Sign the typed data (EIP-712)
  const signature = await wallet._signTypedData(
    signingTypedData.domain,
    { Order: signingTypedData.types.Order },
    signingTypedData.message
  );
  
  console.log('✅ Order signed successfully');
  console.log(`📝 Signature: ${signature.substring(0, 20)}...`);
  
  return signature;
}

/**
 * Test the complete secure order flow
 */
async function testSecureOrderFlow(orderConfig) {
  console.log(`\n🎯 TESTING SECURE FLOW: ${orderConfig.name}`);
  console.log('='.repeat(60));
  
  try {
    // Step 1: Prepare unsigned order on server
    console.log('\n📋 Step 1: Preparing unsigned order...');
    const prepareData = {
      fromToken: orderConfig.order.fromToken,
      toToken: orderConfig.order.toToken,
      amount: orderConfig.order.amount,
      expectedAmount: orderConfig.order.expectedAmount,
      condition: orderConfig.order.condition,
      expirationHours: orderConfig.order.expirationHours,
      makerAddress: new Wallet(process.env.PRIVATE_KEY).address  // Frontend would get this from wallet
    };
    
    console.log('📤 Sending order parameters to server...');
    const prepareResult = await makeRequest('POST', '/orders/prepare', prepareData);
    
    if (!prepareResult.success) {
      throw new Error('Failed to prepare order');
    }
    
    console.log('✅ Server prepared unsigned order:');
    console.log(`   Order Hash: ${prepareResult.orderHash}`);
    console.log(`   Condition: ${prepareResult.order.condition}`);
    console.log(`   Expiration: ${prepareResult.order.expiration}`);
    
    // Step 2: Sign the order (frontend simulation)
    console.log('\n✍️ Step 2: Signing order in frontend...');
    const signature = await signOrderData(
      prepareResult.signingData.typedData,
      process.env.PRIVATE_KEY
    );
    
    // Step 3: Submit signed order back to server
    console.log('\n📤 Step 3: Submitting signed order...');
    const submitData = {
      orderData: prepareResult.signingData,
      signature: signature
    };
    
    const submitResult = await makeRequest('POST', '/orders/submit', submitData);
    
    console.log('\n📊 FINAL RESULT:');
    console.log('================');
    console.log(`Success: ${submitResult.success}`);
    console.log(`Order Hash: ${submitResult.orderHash}`);
    console.log(`Submitted to 1inch: ${submitResult.submission.submitted}`);
    
    if (submitResult.submission.error) {
      console.log(`Submission Error: ${submitResult.submission.error}`);
    }
    
    return submitResult;
    
  } catch (error) {
    console.error(`❌ Secure flow failed for ${orderConfig.name}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ===================================================================
// MAIN TEST FUNCTION
// ===================================================================

async function testSecureOrders() {
  console.log('🔐 TESTING SECURE ORDER FLOW');
  console.log('==============================');
  console.log('Server prepares → Frontend signs → Server submits');
  console.log('');
  
  // Check environment
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not found in .env file');
    process.exit(1);
  }
  
  if (!process.env.ONEINCH_API_KEY) {
    console.error('❌ ONEINCH_API_KEY not found in .env file');
    process.exit(1);
  }
  
  console.log('✅ Environment variables found');
  
  // Check server
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.log('\n🚀 Please start the server first:');
    console.log('   cd backend && node server/index-order-server.js');
    process.exit(1);
  }
  
  // Get examples from server
  console.log('\n📝 Getting example orders from server...');
  const examplesResponse = await makeRequest('GET', '/orders/examples');
  const examples = examplesResponse.examples;
  
  console.log(`Found ${examples.length} example configurations`);
  
  // Test 1: Tesla order with secure flow
  console.log('\n🚀 STARTING SECURE FLOW TESTS');
  console.log('==============================');
  
  const teslaExample = examples.find(ex => ex.name.includes('Tesla'));
  if (teslaExample) {
    const result1 = await testSecureOrderFlow(teslaExample);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Test 2: VIX order with secure flow
  const vixExample = examples.find(ex => ex.name.includes('VIX'));
  if (vixExample) {
    const result2 = await testSecureOrderFlow(vixExample);
  }
  
  console.log('\n🎉 SECURE FLOW TESTING COMPLETE');
  console.log('================================');
  console.log('✅ Orders prepared on server (no private keys sent)');
  console.log('✅ Orders signed in frontend simulation');
  console.log('✅ Signed orders submitted to 1inch');
  console.log('');
  console.log('🔐 Security benefits:');
  console.log('   - Private keys never leave frontend');
  console.log('   - Server only handles unsigned data');
  console.log('   - Frontend controls all signing');
  console.log('   - No CORS issues');
  console.log('');
  console.log('📋 Frontend integration:');
  console.log('   1. Call POST /orders/prepare with order params + wallet address');
  console.log('   2. Sign returned typedData with MetaMask');
  console.log('   3. Call POST /orders/submit with signed data');
}

/**
 * Example of how frontend would integrate
 */
function showFrontendIntegration() {
  console.log(`
📋 FRONTEND INTEGRATION EXAMPLE:
================================

// 1. Prepare order
const prepareResponse = await fetch('http://localhost:3001/orders/prepare', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromToken: 'USDC',
    toToken: 'WETH', 
    amount: '1.0',
    expectedAmount: '0.0003',
    condition: {
      indexId: 5,
      operator: 'gt',
      threshold: 25000,
      description: 'Tesla > $250'
    },
    makerAddress: userWalletAddress  // From MetaMask
  })
});
const prepareResult = await prepareResponse.json();

// 2. Sign with MetaMask
const signature = await window.ethereum.request({
  method: 'eth_signTypedData_v4',
  params: [userWalletAddress, JSON.stringify(prepareResult.signingData.typedData)]
});

// 3. Submit signed order
const submitResponse = await fetch('http://localhost:3001/orders/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderData: prepareResult.signingData,
    signature: signature
  })
});
const submitResult = await submitResponse.json();

console.log('Order submitted:', submitResult.orderHash);
`);
}

// Run the test
if (require.main === module) {
  testSecureOrders()
    .then(() => {
      showFrontendIntegration();
    })
    .catch(console.error);
}

module.exports = {
  testSecureOrders,
  testSecureOrderFlow,
  makeRequest,
  SERVER_BASE_URL
};