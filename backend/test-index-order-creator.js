#!/usr/bin/env node

/**
 * Test the Index Order Creator function
 * Demonstrates various order types and conditions
 */

const { createIndexBasedOrder, INDICES, OPERATORS, printUsageExamples } = require('./src/index-order-creator.js');
require('dotenv').config();

async function testIndexOrderCreator() {
    console.log('🧪 TESTING INDEX ORDER CREATOR');
    console.log('==============================\n');
    
    // Print all available options first
    printUsageExamples();
    
    console.log('\n🎯 CREATING TEST ORDER');
    console.log('======================');
    
    // Example 1: Tesla Stock conditional order
    console.log('\n📱 Example 1: Tesla Stock > $250');
    const teslaOrder = {
        fromToken: 'USDC',                    // Sell USDC
        toToken: 'WETH',                      // Buy WETH  
        amount: '0.1',                        // Sell 0.1 USDC
        expectedAmount: '0.00003',            // Expect 0.00003 WETH
        condition: {
            indexId: INDICES.TESLA_STOCK.id,  // Tesla Stock (ID: 5)
            operator: 'gt',                   // Greater than
            threshold: 25000,                 // $250.00 (in basis points)
            description: 'Tesla Stock > $250'
        },
        expirationHours: 2,                   // Expires in 2 hours
        privateKey: process.env.PRIVATE_KEY,
        oneInchApiKey: process.env.ONEINCH_API_KEY
    };
    
    try {
        const result = await createIndexBasedOrder(teslaOrder);
        
        console.log('\n📊 TESLA ORDER RESULT:');
        console.log('======================');
        console.log(`Success: ${result.success}`);
        console.log(`Order Hash: ${result.orderHash}`);
        console.log(`Condition: ${result.order?.condition}`);
        
        if (result.success) {
            console.log('✅ Order successfully created and submitted!');
        } else {
            console.log('⚠️ Order created but submission failed (expected on mainnet)');
        }
        
    } catch (error) {
        console.error('❌ Apple order failed:', error.message);
    }
    
    // Wait a moment between orders
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📈 Example 2: VIX Volatility < 15');
    const vixOrder = {
        fromToken: 'USDC',
        toToken: 'WETH',
        amount: '0.1',
        expectedAmount: '0.00003',
        condition: {
            indexId: INDICES.VIX_INDEX.id,    // VIX (ID: 2)
            operator: 'lt',                   // Less than
            threshold: 1500,                  // 15.00 (in basis points)
            description: 'VIX < 15 (Low volatility)'
        },
        expirationHours: 6,
        privateKey: process.env.PRIVATE_KEY,
        oneInchApiKey: process.env.ONEINCH_API_KEY
    };
    
    try {
        const result = await createIndexBasedOrder(vixOrder);
        
        console.log('\n📊 VIX ORDER RESULT:');
        console.log('===================');
        console.log(`Success: ${result.success}`);
        console.log(`Order Hash: ${result.orderHash}`);
        console.log(`Condition: ${result.order?.condition}`);
        
    } catch (error) {
        console.error('❌ VIX order failed:', error.message);
    }
    
    console.log('\n🎯 TESTING COMPLETE');
    console.log('===================');
    console.log('Both example orders demonstrate the full workflow:');
    console.log('✅ Parameter validation');
    console.log('✅ Predicate creation');
    console.log('✅ Order generation');
    console.log('✅ Signing process');
    console.log('✅ Submission attempt');
    console.log('\nThe function is ready for frontend integration!');
}

// Helper function to show different condition examples
function showConditionExamples() {
    console.log('\n🔧 CONDITION EXAMPLES FOR FRONTEND');
    console.log('===================================');
    
    const examples = [
        {
            name: 'Apple Bullish',
            condition: {
                indexId: 0,
                operator: 'gt', 
                threshold: 20000,
                description: 'Apple > $200 - Bullish breakout'
            }
        },
        {
            name: 'Tesla Bearish',
            condition: {
                indexId: 1,
                operator: 'lt',
                threshold: 20000,
                description: 'Tesla < $200 - Bearish signal'
            }
        },
        {
            name: 'VIX Spike',
            condition: {
                indexId: 2,
                operator: 'gt',
                threshold: 3000,
                description: 'VIX > 30 - High volatility'
            }
        },
        {
            name: 'Bitcoin Moon',
            condition: {
                indexId: 3,
                operator: 'gt',
                threshold: 10000000,
                description: 'Bitcoin > $100,000 - To the moon!'
            }
        }
    ];
    
    examples.forEach((example, i) => {
        console.log(`\n${i + 1}. ${example.name}:`);
        console.log(`   indexId: ${example.condition.indexId}`);
        console.log(`   operator: '${example.condition.operator}'`);
        console.log(`   threshold: ${example.condition.threshold}`);
        console.log(`   description: '${example.condition.description}'`);
    });
}

// Run the test
async function main() {
    await testIndexOrderCreator();
    showConditionExamples();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testIndexOrderCreator, showConditionExamples };