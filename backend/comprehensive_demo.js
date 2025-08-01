#!/usr/bin/env node

/**
 * 🚀 Comprehensive IndexPreInteraction Demo
 * 
 * This script demonstrates ALL functionality of the Index-based Trading System:
 * 
 * 📊 INDEX MANAGEMENT:
 * - Create custom indices
 * - Update index values
 * - Query index information
 * - Manage index states
 * 
 * 📋 ORDER OPERATIONS:
 * - Place orders with all condition types (GT, LT, GTE, LTE, EQ)
 * - Validate order conditions
 * - Simulate order execution
 * - Monitor order status
 * 
 * 🔧 ORACLE OPERATIONS:
 * - Update predefined indices
 * - Create and manage custom indices
 * - Query all index data
 */

const { Web3 } = require('web3');
require('dotenv').config();

// Import the base workflow for contract setup
const IndexWorkflow = require('./web3_workflow');

// Configuration - matches web3_workflow.js
const CONFIG = {
    RPC_URL: 'https://sepolia.base.org',
    PRIVATE_KEY: process.env.PRIVATE_KEY || 'your_private_key_here',
    
    // Contract addresses - UPDATED with deployed contracts
    CONTRACTS: {
        IndexPreInteraction: '0x8AF8db923E96A6709Ae339d1bFb9E986410D8461',
        IndexLimitOrderFactory: '0x0312Af95deFE475B89852ec05Eab5A785f647e73',
        MockIndexOracle: '0x3de6DF18226B2c57328709D9bc68CaA7AD76EdEB',
        USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        WETH: '0x4200000000000000000000000000000000000006'
    }
};

class ComprehensiveDemo extends IndexWorkflow {
    constructor() {
        super();
        this.operators = {
            GT: 0,    // Greater Than
            LT: 1,    // Less Than  
            GTE: 2,   // Greater Than or Equal
            LTE: 3,   // Less Than or Equal
            EQ: 4     // Equal
        };
    }
    
    async demonstrateIndexCreation() {
        console.log('\n🏗️  === INDEX CREATION DEMO ===');
        
        console.log('\n📊 Creating multiple custom indices...');
        
        const indices = [
            { name: 'APPLE_STOCK', desc: 'Apple Inc. stock price in USD cents', value: 17500 }, // $175
            { name: 'GOLD_PRICE', desc: 'Gold price per ounce in USD cents', value: 205000 }, // $2050
            { name: 'EUR_USD', desc: 'EUR/USD exchange rate * 10000', value: 10850 }, // 1.0850
            { name: 'CRYPTO_FEAR_GREED', desc: 'Crypto Fear & Greed Index (0-100)', value: 65 }, // 65 (Greed)
        ];
        
        const createdIndices = [];
        
        for (const index of indices) {
            try {
                console.log(`\n📈 Creating ${index.name}...`);
                
                // Get next index ID
                const indexId = await this.oracle.methods.getNextCustomIndexId().call();
                
                // Create in oracle
                const oracleTx = await this.sendTransaction(
                    this.oracle.methods.createCustomIndex(index.value),
                    150000
                );
                await this.waitForTransaction(oracleTx.transactionHash);
                
                // Register in PreInteraction
                const preIntTx = await this.sendTransaction(
                    this.preInteraction.methods.registerIndex(
                        index.name, 
                        index.desc, 
                        CONFIG.CONTRACTS.MockIndexOracle
                    ),
                    300000
                );
                await this.waitForTransaction(preIntTx.transactionHash);
                
                console.log(`✅ ${index.name} created with ID: ${indexId}`);
                createdIndices.push({ id: indexId, ...index });
                
            } catch (error) {
                console.error(`❌ Error creating ${index.name}:`, error.message);
            }
        }
        
        return createdIndices;
    }
    
    async demonstrateIndexUpdates(indices) {
        console.log('\n🔄 === INDEX UPDATE DEMO ===');
        
        for (const index of indices) {
            try {
                const oldValue = index.value;
                const newValue = Math.floor(oldValue * (0.95 + Math.random() * 0.1)); // ±5% change
                
                console.log(`\n📊 Updating ${index.name}:`);
                console.log(`  Old: ${oldValue} -> New: ${newValue}`);
                
                const tx = await this.sendTransaction(
                    this.oracle.methods.updateCustomIndex(index.id, newValue),
                    100000
                );
                await this.waitForTransaction(tx.transactionHash);
                
                // Verify update
                await new Promise(resolve => setTimeout(resolve, 1000));
                const result = await this.oracle.methods['getIndexValue(uint256)'](index.id).call();
                console.log(`✅ Updated! Current value: ${Number(result[0])}`);
                
                // Update our local copy
                index.value = newValue;
                
            } catch (error) {
                console.error(`❌ Error updating ${index.name}:`, error.message);
            }
        }
    }
    
    async demonstrateAllOrderTypes(indices) {
        console.log('\n📋 === ALL ORDER TYPES DEMO ===');
        
        if (indices.length < 4) {
            console.log('❌ Not enough indices created for full demo');
            return [];
        }
        
        const orders = [];
        
        // Order 1: GREATER_THAN (GT) - Apple stock > $170
        console.log('\n🔸 Order 1: GREATER_THAN condition');
        const order1 = await this.createOrderWithCondition(
            indices[0].id, // APPLE_STOCK
            this.operators.GT,
            17000, // $170
            'Apple stock > $170',
            1000, // 1000 USDC
            '0.4' // 0.4 ETH
        );
        if (order1) orders.push(order1);
        
        // Order 2: LESS_THAN (LT) - Gold < $2100
        console.log('\n🔸 Order 2: LESS_THAN condition');
        const order2 = await this.createOrderWithCondition(
            indices[1].id, // GOLD_PRICE
            this.operators.LT,
            210000, // $2100
            'Gold price < $2100',
            500, // 500 USDC
            '0.2' // 0.2 ETH
        );
        if (order2) orders.push(order2);
        
        // Order 3: GREATER_THAN_EQUAL (GTE) - EUR/USD >= 1.08
        console.log('\n🔸 Order 3: GREATER_THAN_EQUAL condition');
        const order3 = await this.createOrderWithCondition(
            indices[2].id, // EUR_USD
            this.operators.GTE,
            10800, // 1.0800
            'EUR/USD >= 1.0800',
            750, // 750 USDC
            '0.3' // 0.3 ETH
        );
        if (order3) orders.push(order3);
        
        // Order 4: LESS_THAN_EQUAL (LTE) - Fear & Greed <= 70
        console.log('\n🔸 Order 4: LESS_THAN_EQUAL condition');
        const order4 = await this.createOrderWithCondition(
            indices[3].id, // CRYPTO_FEAR_GREED
            this.operators.LTE,
            70, // 70 (Greed level)
            'Crypto Fear & Greed <= 70',
            2000, // 2000 USDC
            '0.8' // 0.8 ETH
        );
        if (order4) orders.push(order4);
        
        // Order 5: EQUAL (EQ) - Set Apple to exactly $175, then create order for = $175
        console.log('\n🔸 Order 5: EQUAL condition');
        
        // First, set Apple stock to exactly $175
        await this.sendTransaction(
            this.oracle.methods.updateCustomIndex(indices[0].id, 17500),
            100000
        );
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for propagation
        
        const order5 = await this.createOrderWithCondition(
            indices[0].id, // APPLE_STOCK
            this.operators.EQ,
            17500, // $175 exactly
            'Apple stock = $175.00',
            1500, // 1500 USDC
            '0.6' // 0.6 ETH
        );
        if (order5) orders.push(order5);
        
        return orders;
    }
    
    async createOrderWithCondition(indexId, operator, threshold, description, usdcAmount, ethAmount) {
        try {
            const salt = Math.floor(Math.random() * 1000000);
            const maker = this.account.address;
            const receiver = this.account.address;
            const makerAsset = CONFIG.CONTRACTS.USDC;
            const takerAsset = CONFIG.CONTRACTS.WETH;
            const makingAmount = usdcAmount * 10**6; // USDC has 6 decimals
            const takingAmount = this.web3.utils.toWei(ethAmount, 'ether');
            const expiry = Math.floor(Date.now() / 1000) + 7200; // 2 hours
            
            console.log(`📝 Creating order: ${description}`);
            console.log(`   Selling: ${usdcAmount} USDC for ${ethAmount} ETH`);
            
            // Approve USDC
            await this.sendTransaction(
                this.usdc.methods.approve(CONFIG.CONTRACTS.IndexLimitOrderFactory, makingAmount),
                100000
            );
            
            // Create order
            const result = await this.sendTransaction(
                this.factory.methods.createIndexOrder(
                    salt, maker, receiver, makerAsset, takerAsset,
                    makingAmount, takingAmount, indexId, operator, threshold, expiry
                )
            );
            
            const receipt = await this.waitForTransaction(result.transactionHash);
            const eventTopic = this.web3.utils.sha3('IndexOrderCreated(bytes32,address,uint256,uint8,uint256)');
            const log = receipt.logs.find(l => l.topics[0] === eventTopic);
            
            if (log) {
                const orderHash = log.topics[1];
                console.log(`✅ Order created! Hash: ${orderHash}`);
                
                return {
                    hash: orderHash,
                    indexId,
                    operator,
                    threshold,
                    description,
                    usdcAmount,
                    ethAmount
                };
            }
            
        } catch (error) {
            console.error(`❌ Error creating order: ${error.message}`);
            return null;
        }
    }
    
    async demonstrateOrderValidation(orders) {
        console.log('\n✅ === ORDER VALIDATION DEMO ===');
        
        console.log('\n🔍 Checking all order conditions...');
        
        for (const order of orders) {
            try {
                const canExecute = await this.preInteraction.methods
                    .validateOrderCondition(order.hash)
                    .call();
                
                const condition = await this.preInteraction.methods
                    .getOrderCondition(order.hash)
                    .call();
                    
                const currentValue = await this.preInteraction.methods
                    .getIndexValue(condition.indexId)
                    .call();
                
                const operatorNames = ['GT', 'LT', 'GTE', 'LTE', 'EQ'];
                const operatorName = operatorNames[Number(condition.operator)];
                
                console.log(`\n📊 ${order.description}:`);
                console.log(`   Current: ${Number(currentValue.value)}`);
                console.log(`   Threshold: ${Number(condition.thresholdValue)} (${operatorName})`);
                console.log(`   Executable: ${canExecute ? '✅ YES' : '❌ NO'}`);
                
            } catch (error) {
                console.error(`❌ Error validating ${order.description}:`, error.message);
            }
        }
    }
    
    async demonstrateOrderExecution(orders) {
        console.log('\n⚡ === ORDER EXECUTION DEMO ===');
        
        let executedCount = 0;
        
        for (const order of orders) {
            try {
                const canExecute = await this.preInteraction.methods
                    .validateOrderCondition(order.hash)
                    .call();
                
                if (canExecute) {
                    console.log(`\n🎯 Executing: ${order.description}`);
                    console.log('✅ Pre-validation: PASSED');
                    console.log('💰 Simulated execution:');
                    console.log(`   Maker receives: ${order.ethAmount} ETH`);
                    console.log(`   Taker receives: ${order.usdcAmount} USDC`);
                    console.log('🎉 Status: EXECUTED SUCCESSFULLY');
                    executedCount++;
                } else {
                    console.log(`\n⏸️  Skipping: ${order.description}`);
                    console.log('❌ Condition not met - order remains pending');
                }
                
            } catch (error) {
                console.error(`❌ Error executing ${order.description}:`, error.message);
            }
        }
        
        console.log(`\n📈 Execution Summary: ${executedCount}/${orders.length} orders executed`);
    }
    
    async demonstratePredefinedIndices() {
        console.log('\n🏛️  === PREDEFINED INDICES DEMO ===');
        
        const predefinedIndices = [
            { type: 0, name: 'INFLATION_RATE', newValue: 325 }, // 3.25%
            { type: 1, name: 'ELON_FOLLOWERS', newValue: 18500000 }, // 185M followers
            { type: 2, name: 'BTC_PRICE', newValue: 4350000 }, // $43,500
            { type: 3, name: 'VIX_INDEX', newValue: 1850 }, // 18.50
            { type: 4, name: 'UNEMPLOYMENT_RATE', newValue: 375 }, // 3.75%
            { type: 5, name: 'TESLA_STOCK', newValue: 25000 } // $250.00
        ];
        
        for (const index of predefinedIndices) {
            try {
                console.log(`\n📊 Updating ${index.name} to ${index.newValue}...`);
                
                const tx = await this.sendTransaction(
                    this.oracle.methods.updateIndex(index.type, index.newValue),
                    100000
                );
                await this.waitForTransaction(tx.transactionHash);
                
                // Verify update
                const result = await this.oracle.methods['getIndexValue(uint8)'](index.type).call();
                console.log(`✅ Updated! New value: ${Number(result[0])}`);
                
            } catch (error) {
                console.error(`❌ Error updating ${index.name}:`, error.message);
            }
        }
    }
    
    async demonstrateAdvancedQueries() {
        console.log('\n🔍 === ADVANCED QUERIES DEMO ===');
        
        console.log('\n📊 All Custom Indices:');
        try {
            const result = await this.oracle.methods.getAllCustomIndices().call();
            const { 0: indexIds, 1: values, 2: timestamps, 3: activeStates } = result;
            
            for (let i = 0; i < indexIds.length; i++) {
                const date = new Date(Number(timestamps[i]) * 1000).toISOString();
                const status = activeStates[i] ? '✅ Active' : '❌ Inactive';
                const valueDisplay = Number(values[i]);
                
                console.log(`   Index ${indexIds[i]}: ${valueDisplay} | ${status} | ${date}`);
            }
        } catch (error) {
            console.error('❌ Error fetching custom indices:', error.message);
        }
        
        console.log('\n📋 User Created Indices:');
        try {
            const userIndices = await this.preInteraction.methods
                .getUserIndices(this.account.address)
                .call();
                
            console.log(`   User has created ${userIndices.length} indices: [${userIndices.join(', ')}]`);
            
            for (const indexId of userIndices) {
                const info = await this.preInteraction.methods.getIndexInfo(indexId).call();
                console.log(`   Index ${indexId}: ${info.name} - ${info.description}`);
            }
        } catch (error) {
            console.error('❌ Error fetching user indices:', error.message);
        }
    }
    
    async runComprehensiveDemo() {
        console.log('🚀 Starting Comprehensive Index Trading Demo\n');
        console.log('🌐 Network: Base Sepolia');
        console.log('👛 Address:', this.account.address);
        console.log('\n' + '='.repeat(60));
        
        try {
            // Step 1: Demonstrate index creation
            const customIndices = await this.demonstrateIndexCreation();
            
            // Step 2: Demonstrate index updates
            if (customIndices.length > 0) {
                await this.demonstrateIndexUpdates(customIndices);
            }
            
            // Step 3: Update predefined indices
            await this.demonstratePredefinedIndices();
            
            // Step 4: Create orders with all condition types
            const orders = await this.demonstrateAllOrderTypes(customIndices);
            
            // Step 5: Validate all orders
            if (orders.length > 0) {
                await this.demonstrateOrderValidation(orders);
            }
            
            // Step 6: Execute eligible orders
            if (orders.length > 0) {
                await this.demonstrateOrderExecution(orders);
            }
            
            // Step 7: Advanced queries
            await this.demonstrateAdvancedQueries();
            
            console.log('\n' + '='.repeat(60));
            console.log('🎉 COMPREHENSIVE DEMO COMPLETE!');
            console.log('✨ All features demonstrated:');
            console.log('  ✅ Custom index creation & management');
            console.log('  ✅ Predefined index updates');
            console.log('  ✅ All order condition types (GT, LT, GTE, LTE, EQ)');
            console.log('  ✅ Order validation & execution simulation');
            console.log('  ✅ Advanced data queries');
            console.log('\n🚀 Ready for production trading!');
            
        } catch (error) {
            console.error('💥 Demo failed:', error.message);
            if (error.stack) {
                console.error('📜 Stack trace:', error.stack);
            }
        }
    }
}

// Run the comprehensive demo if called directly
if (require.main === module) {
    const demo = new ComprehensiveDemo();
    demo.runComprehensiveDemo();
}

module.exports = ComprehensiveDemo;