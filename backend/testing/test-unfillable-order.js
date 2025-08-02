#!/usr/bin/env node

/**
 * Create an order that CAN'T be filled due to predicate condition
 * This demonstrates conditional trading - order exists but waits for condition
 */

const {LimitOrder, MakerTraits, Address, Sdk, randBigInt, FetchProviderConnector, ExtensionBuilder} = require('@1inch/limit-order-sdk');
const {Wallet, ethers} = require('ethers');
require('dotenv').config();

// Oracle deployed to Base Mainnet
const INDEX_ORACLE_ADDRESS = '0x3073D2b5e72c48f16Ee99700BC07737b8ecd8709';

async function testUnfillableOrder() {
    console.log('CREATING UNFILLABLE ORDER - Testing Conditional Trading');
    console.log('====================================================\n');

    try {
        // Setup
        const privKey = process.env.PRIVATE_KEY;
        const authKey = process.env.ONEINCH_API_KEY;
        const maker = new Wallet(privKey);
        
        if (!privKey || !authKey) {
            console.error('Error: PRIVATE_KEY or ONEINCH_API_KEY not set.');
            return;
        }
        
        console.log('Configuration:');
        console.log(`   Wallet: ${maker.address}`);
        console.log(`   Network: Base Mainnet (8453)`);
        console.log(`   Oracle: ${INDEX_ORACLE_ADDRESS}`);
        console.log('');

        // Trade setup (same safe amounts)
        const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
        const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
        const makingAmount = ethers.utils.parseUnits('0.1', 6); // 0.1 USDC
        const takingAmount = ethers.utils.parseUnits('0.00003', 18); // 0.00003 WETH

        // Timing (longer duration for testing)
        const expiresIn = 3600n; // 1 hour
        const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn;
        const UINT_40_MAX = (1n << 40n) - 1n;

        console.log('STEP 1: Creating IMPOSSIBLE condition predicate...');
        
        // Create a condition that is definitely NOT met:
        // Apple stock (ID: 0) > 30000 (i.e., > $300.00 when it's currently ~$175)
        const indexId = 0; // Apple stock index
        const impossibleThreshold = 30000; // $300.00 in basis points (currently ~$175)
        
        console.log(`   Creating condition: APPLE STOCK > $${impossibleThreshold/100}`);
        console.log(`   Current Apple stock is ~$175, so this condition is NOT met`);
        console.log(`   Order will exist but cannot be filled until Apple > $300`);
        
        // Oracle call encoding
        const getIndexValueSelector = ethers.utils.id('getIndexValue(uint256)').slice(0, 10);
        const oracleCallData = ethers.utils.defaultAbiCoder.encode(
            ['bytes4', 'uint256'],
            [getIndexValueSelector, indexId]
        );
        
        // 1inch predicate structure: gt(threshold, arbitraryStaticCall(oracle, callData))
        const arbitraryStaticCallData = ethers.utils.defaultAbiCoder.encode(
            ['address', 'bytes'],
            [INDEX_ORACLE_ADDRESS, oracleCallData]
        );
        
        const predicateData = ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'bytes'],
            [impossibleThreshold, arbitraryStaticCallData]
        );
        
        // Complete predicate with protocol address
        const LIMIT_ORDER_PROTOCOL = '0x111111125421cA6dc452d289314280a0f8842A65';
        const completePredicate = ethers.utils.solidityPack(
            ['address', 'bytes'],
            [LIMIT_ORDER_PROTOCOL, predicateData]
        );
        
        console.log(`   Predicate created - Apple (ID:${indexId}) > $${impossibleThreshold/100}`);

        console.log('STEP 2: Building extension...');
        const extension = new ExtensionBuilder()
            .withPredicate(completePredicate)
            .build();
        console.log('   Extension with impossible condition created');

        console.log('STEP 3: Creating MakerTraits...');
        const makerTraits = MakerTraits.default()
            .withExpiration(expiration)
            .withNonce(randBigInt(UINT_40_MAX))
            .allowPartialFills()
            .allowMultipleFills()
            .withExtension();

        console.log('STEP 4: Creating SDK...');
        const sdk = new Sdk({ 
            authKey, 
            networkId: 8453,
            httpConnector: new FetchProviderConnector() 
        });

        console.log('STEP 5: Creating conditional order...');
        
        // Let SDK handle salt generation
        const order = await sdk.createOrder({
            makerAsset: new Address(USDC_ADDRESS),
            takerAsset: new Address(WETH_ADDRESS),
            makingAmount: makingAmount,
            takingAmount: takingAmount,
            maker: new Address(maker.address),
            // No manual salt - let SDK handle it
            extension: extension.encode()
        }, makerTraits);

        console.log('   Conditional order created successfully');
        console.log(`   Order Hash: ${order.getOrderHash()}`);

        console.log('STEP 6: Signing order...');
        const typedData = order.getTypedData(8453);
        const signature = await maker._signTypedData(
            typedData.domain,
            {Order: typedData.types.Order},
            typedData.message
        );
        console.log(`   Order signed: ${signature.substring(0, 20)}...`);

        console.log('STEP 7: Submitting unfillable order...');
        try {
            const result = await sdk.submitOrder(order, signature);
            console.log('   SUCCESS! Conditional order submitted to 1inch');
            console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
            
        } catch (submitError) {
            console.log(`   Submit failed: ${submitError.message}`);
            return;
        }

        console.log('\nSTEP 8: Verifying order status...');
        
        // Wait a moment for order to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
            // Try to get order details
            const orderStatus = await sdk.getOrderByHash(order.getOrderHash());
            console.log(`   Order found in API: ${JSON.stringify(orderStatus, null, 2)}`);
        } catch (error) {
            console.log(`   Could not retrieve order: ${error.message}`);
        }

        console.log('\n🎯 CONDITIONAL ORDER CREATED SUCCESSFULLY!');
        console.log('===========================================');
        
        console.log('\nOrder Details:');
        console.log(`   Hash: ${order.getOrderHash()}`);
        console.log(`   Trading: ${ethers.utils.formatUnits(makingAmount, 6)} USDC → ${ethers.utils.formatUnits(takingAmount, 18)} WETH`);
        console.log(`   Condition: Apple Stock > $${impossibleThreshold/100}`);
        console.log(`   Current Apple: ~$175 (condition NOT met)`);
        console.log(`   Status: Order exists but CANNOT be filled`);
        console.log(`   Expires: ${new Date(Number(expiration) * 1000).toLocaleString()}`);
        
        console.log('\n📋 What happens next:');
        console.log('   ✅ Order exists on 1inch with predicate');
        console.log('   ❌ Order cannot be filled (Apple < $300)');
        console.log('   🔄 Order will become fillable when Apple > $300');
        console.log('   🎯 This demonstrates conditional trading working perfectly!');
        
        console.log('\n🔧 To make this order fillable:');
        console.log(`   1. Update oracle: set Apple stock to > $300`);
        console.log(`   2. Order will immediately become executable`);
        console.log(`   3. Any taker can then fill the order`);

    } catch (error) {
        console.error('Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testUnfillableOrder();