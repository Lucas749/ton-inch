#!/usr/bin/env node

/**
 * Order Cancellation Service
 * 
 * Provides functionality to cancel 1inch limit orders on Base mainnet
 * 
 * Features:
 * - Cancel orders by hash
 * - Get order details before cancellation
 * - Handle cancellation transactions
 * - Error handling and validation
 */

const { ethers } = require('ethers');
const { Api, FetchProviderConnector } = require('@1inch/limit-order-sdk');
require('dotenv').config();

// Manual config
const CONFIG = {
    CHAIN_ID: parseInt(process.env.CHAIN_ID) || 8453,
    RPC_URL: process.env.RPC_URL || 'https://base.llamarpc.com',
    CONTRACTS: {
        // 1inch Limit Order Protocol contract on Base
        LIMIT_ORDER_PROTOCOL: '0x111111125421ca6dc452d289314280a0f8842a65'
    }
};

// 1inch Limit Order Protocol ABI (minimal for cancellation)
const LIMIT_ORDER_PROTOCOL_ABI = [
    "function cancelOrder(uint256 makerTraits, bytes32 orderHash) external"
];

// ===================================================================
// INITIALIZATION
// ===================================================================

/**
 * Initialize cancellation service
 */
async function initializeCancellationService(privateKey, oneInchApiKey) {
    console.log('🔧 Initializing Order Cancellation Service');
    console.log('===========================================');
    
    try {
        // Create provider
        const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
        
        // Create wallet only if private key is provided
        let wallet = null;
        let limitOrderContract = null;
        
        if (privateKey) {
            wallet = new ethers.Wallet(privateKey, provider);
            
            // Create contract instance with signer
            limitOrderContract = new ethers.Contract(
                CONFIG.CONTRACTS.LIMIT_ORDER_PROTOCOL,
                LIMIT_ORDER_PROTOCOL_ABI,
                wallet
            );
            
            console.log(`👤 Wallet: ${wallet.address}`);
        } else {
            console.log(`👤 Wallet: Not provided (read-only mode)`);
        }
        
        // Create 1inch API instance
        const oneInchApi = new Api({
            networkId: CONFIG.CHAIN_ID,
            authKey: oneInchApiKey,
            httpConnector: new FetchProviderConnector()
        });
        
        console.log(`📍 Limit Order Contract: ${CONFIG.CONTRACTS.LIMIT_ORDER_PROTOCOL}`);
        console.log(`🌐 Network: ${CONFIG.CHAIN_ID}`);
        console.log('✅ Cancellation service initialized\n');
        
        return { provider, wallet, oneInchApi, limitOrderContract };
    } catch (error) {
        console.error('❌ Failed to initialize cancellation service:', error.message);
        throw error;
    }
}

// ===================================================================
// ORDER CANCELLATION FUNCTIONS
// ===================================================================

/**
 * Get order details by hash
 */
async function getOrderDetails(orderHash, oneInchApiKey) {
    console.log(`🔍 Getting Order Details`);
    console.log('========================');
    console.log(`📋 Order Hash: ${orderHash}`);
    
    try {
        // Create 1inch API instance directly (no private key needed for reading)
        const oneInchApi = new Api({
            networkId: CONFIG.CHAIN_ID,
            authKey: oneInchApiKey,
            httpConnector: new FetchProviderConnector()
        });
        
        // Get order from 1inch API
        const order = await oneInchApi.getOrderByHash(orderHash);
        
        if (!order || !order.data) {
            throw new Error('Order not found or invalid response');
        }
        
        console.log(`✅ Order found:`);
        console.log(`   Maker: ${order.data.maker}`);
        console.log(`   MakerAsset: ${order.data.makerAsset}`);
        console.log(`   TakerAsset: ${order.data.takerAsset}`);
        console.log(`   MakingAmount: ${order.data.makingAmount}`);
        console.log(`   TakingAmount: ${order.data.takingAmount}`);
        console.log(`   MakerTraits: ${order.data.makerTraits}`);
        console.log(`   Salt: ${order.data.salt}`);
        console.log('');
        
        return {
            success: true,
            order: order.data,
            makerTraits: order.data.makerTraits,
            maker: order.data.maker
        };
        
    } catch (error) {
        console.error(`❌ Failed to get order details:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Cancel a limit order by hash
 */
async function cancelLimitOrder(orderHash, privateKey, oneInchApiKey) {
    console.log('🚫 Cancelling Limit Order');
    console.log('=========================');
    console.log(`📋 Order Hash: ${orderHash}`);
    
    try {
        // Initialize services
        const { wallet, oneInchApi, limitOrderContract } = await initializeCancellationService(
            privateKey, 
            oneInchApiKey
        );
        
        console.log('🔍 Step 1: Getting order details...');
        
        // Get order details
        const order = await oneInchApi.getOrderByHash(orderHash);
        
        if (!order || !order.data) {
            throw new Error('Order not found or already cancelled');
        }
        
        // Verify the wallet is the maker
        if (order.data.maker.toLowerCase() !== wallet.address.toLowerCase()) {
            throw new Error(`Only the order maker can cancel this order. Maker: ${order.data.maker}, Your address: ${wallet.address}`);
        }
        
        console.log(`✅ Order found and verified`);
        console.log(`   Maker: ${order.data.maker}`);
        console.log(`   MakerTraits: ${order.data.makerTraits}`);
        
        console.log('🔧 Step 2: Simulating cancellation...');
        
        // Estimate gas for the cancellation
        const gasEstimate = await limitOrderContract.estimateGas.cancelOrder(
            order.data.makerTraits,
            orderHash
        );
        
        console.log(`⛽ Estimated Gas: ${gasEstimate}`);
        
        console.log('📤 Step 3: Submitting cancellation transaction...');
        
        // Execute the cancellation
        const tx = await limitOrderContract.cancelOrder(
            order.data.makerTraits,
            orderHash,
            {
                gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
            }
        );
        
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        // Wait for transaction confirmation
        const receipt = await tx.wait();
        
        if (receipt.status === 0) {
            throw new Error(`Cancellation transaction reverted. Tx: ${tx.hash}`);
        }
        
        console.log(`✅ Order cancelled successfully!`);
        console.log(`📤 Transaction: ${tx.hash}`);
        console.log(`🧱 Block: ${receipt.blockNumber}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);
        console.log(`💰 Transaction Fee: ${ethers.utils.formatEther(receipt.gasUsed.mul(tx.gasPrice))} ETH\n`);
        
        return {
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            orderHash: orderHash,
            status: 'cancelled'
        };
        
    } catch (error) {
        console.error(`❌ Failed to cancel order:`, error.message);
        
        // Handle specific error cases
        if (error.message.includes('Order not found')) {
            return { success: false, error: 'Order not found or already cancelled', code: 'ORDER_NOT_FOUND' };
        } else if (error.message.includes('Only the order maker')) {
            return { success: false, error: error.message, code: 'NOT_ORDER_MAKER' };
        } else if (error.message.includes('reverted')) {
            return { success: false, error: 'Transaction reverted - order may already be cancelled or filled', code: 'TRANSACTION_REVERTED' };
        } else {
            return { success: false, error: error.message, code: 'UNKNOWN_ERROR' };
        }
    }
}

/**
 * Batch cancel multiple orders
 */
async function cancelMultipleOrders(orderHashes, privateKey, oneInchApiKey) {
    console.log('🚫 Cancelling Multiple Orders');
    console.log('==============================');
    console.log(`📋 Orders to cancel: ${orderHashes.length}`);
    
    const results = [];
    
    for (let i = 0; i < orderHashes.length; i++) {
        console.log(`\n🔄 Cancelling order ${i + 1}/${orderHashes.length}: ${orderHashes[i]}`);
        
        const result = await cancelLimitOrder(orderHashes[i], privateKey, oneInchApiKey);
        results.push({
            orderHash: orderHashes[i],
            ...result
        });
        
        // Add delay between cancellations to avoid rate limiting
        if (i < orderHashes.length - 1) {
            console.log('⏳ Waiting 2 seconds before next cancellation...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 BATCH CANCELLATION SUMMARY`);
    console.log(`=============================`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📋 Total: ${results.length}`);
    
    return {
        success: failed === 0,
        results: results,
        summary: {
            total: results.length,
            successful: successful,
            failed: failed
        }
    };
}

/**
 * Check if order can be cancelled
 */
async function canCancelOrder(orderHash, walletAddress, oneInchApiKey) {
    console.log(`🔍 Checking if order can be cancelled`);
    console.log('====================================');
    
    try {
        // Create 1inch API instance directly
        const oneInchApi = new Api({
            networkId: CONFIG.CHAIN_ID,
            authKey: oneInchApiKey,
            httpConnector: new FetchProviderConnector()
        });
        
        // Get order details
        const order = await oneInchApi.getOrderByHash(orderHash);
        
        if (!order || !order.data) {
            return {
                canCancel: false,
                reason: 'Order not found',
                details: null
            };
        }
        
        // Check if wallet is the maker
        if (order.data.maker.toLowerCase() !== walletAddress.toLowerCase()) {
            return {
                canCancel: false,
                reason: 'Only order maker can cancel',
                maker: order.data.maker,
                wallet: walletAddress
            };
        }
        
        console.log(`✅ Order can be cancelled by ${walletAddress}`);
        
        return {
            canCancel: true,
            reason: 'Order is cancellable',
            order: order.data
        };
        
    } catch (error) {
        return {
            canCancel: false,
            reason: 'Error checking order',
            error: error.message
        };
    }
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
    // Main functions
    cancelLimitOrder,
    cancelMultipleOrders,
    getOrderDetails,
    canCancelOrder,
    
    // Utilities
    initializeCancellationService,
    
    // Constants
    CONFIG
};

// ===================================================================
// CLI USAGE (if run directly)
// ===================================================================

if (require.main === module) {
    async function runDemo() {
        console.log('🚫 ORDER CANCELLATION DEMO');
        console.log('===========================\n');
        
        const orderHash = process.argv[2];
        const privateKey = process.env.PRIVATE_KEY;
        const oneInchApiKey = process.env.ONEINCH_API_KEY;
        
        if (!orderHash) {
            console.log('Usage: node order-cancellation.js <orderHash>');
            console.log('Example: node order-cancellation.js 0x1234567890abcdef...');
            return;
        }
        
        if (!privateKey) {
            console.log('❌ PRIVATE_KEY not set in environment variables');
            return;
        }
        
        if (!oneInchApiKey) {
            console.log('❌ ONEINCH_API_KEY not set in environment variables');
            return;
        }
        
        try {
            // First check if order can be cancelled
            console.log('🔍 Checking if order can be cancelled...');
            const canCancel = await canCancelOrder(orderHash, 
                new ethers.Wallet(privateKey).address, 
                oneInchApiKey
            );
            
            if (!canCancel.canCancel) {
                console.log(`❌ Cannot cancel order: ${canCancel.reason}`);
                return;
            }
            
            console.log('✅ Order can be cancelled, proceeding...\n');
            
            // Cancel the order
            const result = await cancelLimitOrder(orderHash, privateKey, oneInchApiKey);
            
            if (result.success) {
                console.log('🎯 ORDER CANCELLATION COMPLETE');
                console.log('===============================');
                console.log(`✅ Successfully cancelled order: ${orderHash}`);
                console.log(`📤 Transaction: ${result.transactionHash}`);
            } else {
                console.log('❌ ORDER CANCELLATION FAILED');
                console.log('=============================');
                console.log(`Error: ${result.error}`);
                console.log(`Code: ${result.code}`);
            }
            
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
        }
    }
    
    runDemo();
}