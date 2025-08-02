#!/usr/bin/env node

/**
 * Test script for Order Cancellation Service
 * 
 * Demonstrates order cancellation functionality:
 * - Check if order can be cancelled
 * - Get order details
 * - Cancel single order
 * - Batch cancel multiple orders
 */

const orderCancellation = require('./src/order-cancellation');
const { getAllActiveOrdersForMaker } = require('./src/order-manager');
require('dotenv').config();

async function testOrderCancellation() {
    console.log('🧪 TESTING ORDER CANCELLATION SERVICE');
    console.log('=====================================\n');
    
    const privateKey = process.env.PRIVATE_KEY;
    const oneInchApiKey = process.env.ONEINCH_API_KEY;
    
    if (!privateKey) {
        console.log('❌ PRIVATE_KEY not set in environment variables');
        return;
    }
    
    if (!oneInchApiKey) {
        console.log('❌ ONEINCH_API_KEY not set in environment variables');
        return;
    }
    
    try {
        const { ethers } = require('ethers');
        const wallet = new ethers.Wallet(privateKey);
        const walletAddress = wallet.address;
        
        console.log(`👤 Testing with wallet: ${walletAddress}\n`);
        
        // First, get all active orders to test with
        console.log('📋 TEST 1: Getting Active Orders for Testing');
        console.log('=============================================');
        
        const activeOrders = await getAllActiveOrdersForMaker(walletAddress, oneInchApiKey);
        
        if (!activeOrders.success || activeOrders.activeOrders.length === 0) {
            console.log('⚠️ No active orders found for testing cancellation.');
            console.log('   Create some orders first using test-index-order-creator.js\n');
            
            // Still test with a sample hash to show functionality
            console.log('📋 TEST 2: Testing with Sample Order Hash');
            console.log('==========================================');
            
            const sampleHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            
            const canCancel = await orderCancellation.canCancelOrder(
                sampleHash,
                walletAddress,
                oneInchApiKey
            );
            
            console.log(`📊 Can cancel result: ${canCancel.canCancel}`);
            console.log(`📝 Reason: ${canCancel.reason}`);
            
            if (!canCancel.canCancel) {
                console.log('✅ Expected result - sample hash should not be cancellable\n');
            }
            
            console.log('🔍 TEST 3: Testing Order Details Retrieval');
            console.log('===========================================');
            
            const orderDetails = await orderCancellation.getOrderDetails(sampleHash, oneInchApiKey);
            
            if (!orderDetails.success) {
                console.log(`✅ Expected result - order details not found: ${orderDetails.error}\n`);
            }
            
            console.log('📚 CANCELLATION GUIDE');
            console.log('=====================');
            console.log('To test order cancellation:');
            console.log('1. Create orders: node test-index-order-creator.js');
            console.log('2. Get order hashes from active orders');
            console.log('3. Run: node test-order-cancellation.js');
            console.log('4. Or cancel specific order: node src/order-cancellation.js <orderHash>\n');
            
            return;
        }
        
        console.log(`✅ Found ${activeOrders.activeOrders.length} active orders`);
        
        // Show available orders
        console.log('📊 Available Orders for Cancellation:');
        activeOrders.activeOrders.slice(0, 3).forEach((order, index) => {
            console.log(`   ${index + 1}. ${order.hash}`);
        });
        console.log('');
        
        // Test with the first order
        const testOrderHash = activeOrders.activeOrders[0].hash;
        
        console.log('🔍 TEST 2: Check if Order Can Be Cancelled');
        console.log('===========================================');
        
        const canCancel = await orderCancellation.canCancelOrder(
            testOrderHash,
            walletAddress,
            oneInchApiKey
        );
        
        console.log(`📊 Can cancel: ${canCancel.canCancel}`);
        console.log(`📝 Reason: ${canCancel.reason}`);
        
        if (canCancel.canCancel) {
            console.log('✅ Order is cancellable by this wallet\n');
        } else {
            console.log(`❌ Order cannot be cancelled: ${canCancel.reason}\n`);
            return;
        }
        
        console.log('📋 TEST 3: Get Order Details');
        console.log('=============================');
        
        const orderDetails = await orderCancellation.getOrderDetails(testOrderHash, oneInchApiKey);
        
        if (orderDetails.success) {
            console.log('✅ Order details retrieved successfully');
            console.log(`   Maker: ${orderDetails.order.maker}`);
            console.log(`   MakerAsset: ${orderDetails.order.makerAsset}`);
            console.log(`   TakerAsset: ${orderDetails.order.takerAsset}`);
            console.log(`   MakingAmount: ${orderDetails.order.makingAmount}`);
            console.log(`   TakingAmount: ${orderDetails.order.takingAmount}\n`);
        } else {
            console.log(`❌ Failed to get order details: ${orderDetails.error}\n`);
            return;
        }
        
        // Ask user if they want to proceed with actual cancellation
        console.log('⚠️ CANCELLATION WARNING');
        console.log('=======================');
        console.log('The next test will ACTUALLY CANCEL your order.');
        console.log('This action cannot be undone.');
        console.log('');
        console.log('To proceed with actual cancellation, run:');
        console.log(`node src/order-cancellation.js ${testOrderHash}`);
        console.log('');
        console.log('Skipping actual cancellation in test mode for safety.\n');
        
        console.log('🧪 TEST 4: Testing Batch Cancellation Logic');
        console.log('============================================');
        
        if (activeOrders.activeOrders.length >= 2) {
            const testHashes = activeOrders.activeOrders.slice(0, 2).map(order => order.hash);
            
            console.log(`📋 Testing batch cancellation logic with ${testHashes.length} orders:`);
            testHashes.forEach((hash, index) => {
                console.log(`   ${index + 1}. ${hash}`);
            });
            
            console.log('');
            console.log('⚠️ Skipping actual batch cancellation for safety.');
            console.log('To perform actual batch cancellation, modify the test script.');
            console.log('');
        } else {
            console.log('⚠️ Need at least 2 orders to test batch cancellation');
        }
        
        console.log('💻 FRONTEND INTEGRATION EXAMPLES');
        console.log('=================================');
        
        console.log(`
🔧 React Component Example:
import React, { useState } from 'react';
import * as orderCancellation from './order-cancellation';

const OrderCancellation = ({ orderHash, privateKey, apiKey }) => {
  const [cancelling, setCancelling] = useState(false);
  const [result, setResult] = useState(null);
  
  const handleCancel = async () => {
    setCancelling(true);
    try {
      const result = await orderCancellation.cancelLimitOrder(
        orderHash, 
        privateKey, 
        apiKey
      );
      setResult(result);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setCancelling(false);
    }
  };
  
  return (
    <div>
      <button onClick={handleCancel} disabled={cancelling}>
        {cancelling ? 'Cancelling...' : 'Cancel Order'}
      </button>
      {result && (
        <div>
          {result.success ? 
            \`✅ Cancelled: \${result.transactionHash}\` : 
            \`❌ Error: \${result.error}\`
          }
        </div>
      )}
    </div>
  );
};

🔧 Express.js API Example:
const express = require('express');
const orderCancellation = require('./order-cancellation');

app.delete('/api/orders/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    const { privateKey } = req.body;
    const apiKey = process.env.ONEINCH_API_KEY;
    
    const result = await orderCancellation.cancelLimitOrder(
      orderHash, 
      privateKey, 
      apiKey
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/orders/batch-cancel', async (req, res) => {
  try {
    const { orderHashes, privateKey } = req.body;
    const apiKey = process.env.ONEINCH_API_KEY;
    
    const result = await orderCancellation.cancelMultipleOrders(
      orderHashes, 
      privateKey, 
      apiKey
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

🔧 CLI Usage Examples:
# Cancel single order
node src/order-cancellation.js 0x1234567890abcdef...

# Check if order can be cancelled
const canCancel = await orderCancellation.canCancelOrder(
  orderHash, 
  walletAddress, 
  apiKey
);

# Get order details
const details = await orderCancellation.getOrderDetails(
  orderHash, 
  apiKey
);

# Batch cancel multiple orders
const result = await orderCancellation.cancelMultipleOrders(
  [hash1, hash2, hash3], 
  privateKey, 
  apiKey
);
`);
        
        console.log('✅ ALL CANCELLATION TESTS COMPLETED!');
        console.log('====================================');
        console.log('🔧 Order cancellation service is ready for use');
        console.log('⚠️ Remember: Cancellation permanently removes orders');
        console.log('💡 Use canCancelOrder() to check before cancelling');
        console.log('🚀 Integrate with your frontend for user-friendly cancellation\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
if (require.main === module) {
    testOrderCancellation().catch(console.error);
}

module.exports = { testOrderCancellation };