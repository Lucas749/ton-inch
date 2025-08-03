#!/usr/bin/env node

/**
 * Test order operations - check if order exists and cancel it
 */

const { Sdk, FetchProviderConnector } = require('@1inch/limit-order-sdk');
const { Wallet, ethers } = require('ethers');
require('dotenv').config();

const CONFIG = {
    CHAIN_ID: 8453,
    RPC_URL: 'https://base.llamarpc.com',
};

async function testOrderOperations() {
    console.log('🧪 TESTING ORDER OPERATIONS');
    console.log('============================\n');
    
    // Order hashes from the successful backend test
    const orderHashes = [
        '0x55836c15dae4f825118c6ba23bf208af231948a6564d54d78924d0023e38a2e5', // Tesla order
        '0x8d435bde8cf3c207869d12401ea58c938de27cfc99f88f6f027f1a304d1df2ab'  // VIX order
    ];
    
    // Initialize SDK
    const sdk = new Sdk({
        authKey: process.env.ONEINCH_API_KEY,
        networkId: CONFIG.CHAIN_ID,
        httpConnector: new FetchProviderConnector()
    });
    
    // Initialize wallet
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
    
    for (let i = 0; i < orderHashes.length; i++) {
        const orderHash = orderHashes[i];
        const orderName = i === 0 ? 'Tesla Stock > $250' : 'VIX < 15';
        
        console.log(`\n📋 Testing Order ${i + 1}: ${orderName}`);
        console.log(`Hash: ${orderHash}`);
        console.log('=' .repeat(80));
        
        try {
            // 1. Check if order exists on 1inch using direct API call
            console.log('🔍 Checking if order exists on 1inch...');
            const response = await fetch(`https://api.1inch.dev/orderbook/v4.0/8453/order/${orderHash}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
                    'accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const orderInfo = await response.json();
                console.log('✅ Order found on 1inch!');
                console.log('📊 Order details:');
                console.log(`   Maker: ${orderInfo.maker}`);
                console.log(`   Making Amount: ${orderInfo.makingAmount}`);
                console.log(`   Taking Amount: ${orderInfo.takingAmount}`);
                console.log(`   Maker Asset: ${orderInfo.makerAsset}`);
                console.log(`   Taker Asset: ${orderInfo.takerAsset}`);
                console.log(`   Salt: ${orderInfo.salt}`);
                console.log(`   Status: Order exists and is active`);
                
                // 2. Try to cancel the order using SDK
                console.log('\n🗑️ Attempting to cancel order via SDK...');
                try {
                    // Create a minimal order object for cancellation
                    const orderForCancel = {
                        salt: orderInfo.salt,
                        maker: orderInfo.maker,
                        makerAsset: orderInfo.makerAsset,
                        takerAsset: orderInfo.takerAsset,
                        makingAmount: orderInfo.makingAmount,
                        takingAmount: orderInfo.takingAmount,
                        receiver: orderInfo.receiver || orderInfo.maker
                    };
                    
                    const cancelTx = await sdk.cancelOrder(orderForCancel, wallet);
                    console.log('✅ Cancel transaction sent!');
                    console.log('📋 Transaction hash:', cancelTx.hash);
                    
                    // Wait for confirmation
                    console.log('⏳ Waiting for transaction confirmation...');
                    const receipt = await cancelTx.wait();
                    console.log('✅ Order cancelled successfully!');
                    console.log('📋 Block number:', receipt.blockNumber);
                    
                } catch (cancelError) {
                    console.error('❌ Cancel failed:', cancelError.message);
                }
                
            } else if (response.status === 404) {
                console.log('❌ Order not found on 1inch (404)');
            } else {
                console.log(`❌ API call failed: ${response.status} ${response.statusText}`);
                const errorText = await response.text();
                console.log('Error details:', errorText);
            }
            
        } catch (error) {
            console.error(`❌ Error with order ${orderHash}:`, error.message);
        }
    }
    
    console.log('\n🎯 ORDER OPERATIONS TEST COMPLETE');
    console.log('==================================');
}

// Run the test
testOrderOperations().catch(console.error);