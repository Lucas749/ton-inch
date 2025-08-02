#!/usr/bin/env node

/**
 * Test script to retrieve all submitted and pending orders from 1inch API
 */

const { Api, Address: OneInchAddress, FetchProviderConnector } = require('@1inch/limit-order-sdk');
const { ethers } = require('ethers');
require('dotenv').config();

async function getAllOrders() {
    console.log('RETRIEVING 1INCH ORDERS');
    console.log('========================\n');

    try {
        // Setup provider and wallet
        const provider = new ethers.providers.JsonRpcProvider('https://base.llamarpc.com');
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        // Initialize 1inch API (same as working code)
        const oneInchApi = new Api({
            networkId: 8453,
            authKey: process.env.ONEINCH_API_KEY,
            httpConnector: new FetchProviderConnector()
        });

        console.log('Configuration:');
        console.log(`   Wallet: ${wallet.address}`);
        console.log(`   Chain: Base Mainnet (8453)`);
        console.log(`   API Key: ${process.env.ONEINCH_API_KEY?.substring(0, 8)}...`);
        console.log('');

        // Method 1: Get all orders by maker address
        console.log('METHOD 1: Get Orders by Maker Address');
        console.log('=====================================');
        
        try {
            const ordersResponse = await oneInchApi.getOrdersByMaker(new OneInchAddress(wallet.address));
            
            if (ordersResponse && ordersResponse.length > 0) {
                console.log(`Found ${ordersResponse.length} orders:`);
                
                ordersResponse.forEach((order, index) => {
                    console.log(`\nOrder ${index + 1}:`);
                    console.log(`   Hash: ${order.orderHash || 'N/A'}`);
                    console.log(`   Status: ${order.status || 'Unknown'}`);
                    console.log(`   MakerAsset: ${order.data?.makerAsset || 'N/A'}`);
                    console.log(`   TakerAsset: ${order.data?.takerAsset || 'N/A'}`);
                    console.log(`   MakingAmount: ${order.data?.makingAmount || 'N/A'}`);
                    console.log(`   TakingAmount: ${order.data?.takingAmount || 'N/A'}`);
                    console.log(`   Extension: ${order.data?.extension ? 'YES' : 'NO'}`);
                    console.log(`   Created: ${order.createDateTime || 'N/A'}`);
                });
            } else {
                console.log('No orders found for this maker address');
            }
        } catch (error) {
            console.log(`API Error: ${error.message}`);
            console.log('This could mean no orders exist or API access issue');
        }

        console.log('\n');

        // Method 2: Get orders with status filter
        console.log('METHOD 2: Get Orders with Status Filters');
        console.log('========================================');
        
        // Common order statuses in 1inch:
        const statusFilters = [
            'pending',     // Waiting to be filled
            'filled',      // Completely filled
            'cancelled',   // Cancelled by maker
            'expired',     // Expired orders
            'partiallyFilled' // Partially filled
        ];

        for (const status of statusFilters) {
            try {
                console.log(`\nChecking ${status} orders...`);
                // Note: The exact API method may vary - this is a common pattern
                const statusOrders = await oneInchApi.getOrdersByMaker(
                    new OneInchAddress(wallet.address),
                    { status: status }
                );
                
                if (statusOrders && statusOrders.length > 0) {
                    console.log(`   Found ${statusOrders.length} ${status} orders`);
                } else {
                    console.log(`   No ${status} orders found`);
                }
            } catch (error) {
                console.log(`   Could not fetch ${status} orders: ${error.message}`);
            }
        }

        console.log('\n');

        // Method 3: Get specific order by hash (if you have one)
        console.log('METHOD 3: Get Order by Hash');
        console.log('===========================');
        
        // Example using the hash from our previous test
        const exampleHash = '0x1a4f48d3659792db7bcdb34d24551a0211d8dffd6530a236845ac97e4ea3999c';
        
        try {
            console.log(`Looking up order: ${exampleHash}`);
            const specificOrder = await oneInchApi.getOrderByHash(exampleHash);
            
            if (specificOrder) {
                console.log('Order found:');
                console.log(`   Status: ${specificOrder.status || 'Unknown'}`);
                console.log(`   Fillable: ${specificOrder.remainingMakerAmount || 'N/A'}`);
                console.log(`   Created: ${specificOrder.createDateTime || 'N/A'}`);
            } else {
                console.log('Order not found (may not have been submitted to API)');
            }
        } catch (error) {
            console.log(`Could not fetch specific order: ${error.message}`);
        }

        console.log('\n');

        // Method 4: Summary of all order management capabilities
        console.log('SUMMARY: Available 1inch Order Methods');
        console.log('======================================');
        console.log('1. oneInchApi.getOrdersByMaker(address) - Get all orders by maker');
        console.log('2. oneInchApi.getOrderByHash(hash) - Get specific order by hash');
        console.log('3. oneInchApi.submitOrder(order, signature) - Submit new order');
        console.log('4. oneInchApi.cancelOrder(orderHash) - Cancel existing order');
        console.log('5. Status tracking: pending, filled, cancelled, expired, partiallyFilled');
        console.log('');
        console.log('Integration Notes:');
        console.log('- Orders must be submitted to API before they appear in queries');
        console.log('- Local order creation (like our test) won\'t show until submitted');
        console.log('- Order status updates automatically as they are filled/cancelled');
        console.log('- Extensions (predicates) are preserved in order data');

    } catch (error) {
        console.error('Error retrieving orders:', error.message);
        console.error('Stack:', error.stack);
    }
}

if (require.main === module) {
    getAllOrders().catch(console.error);
}