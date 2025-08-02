#!/usr/bin/env node

/**
 * Test using SDK's createOrder with extension - let SDK manage salt entirely
 * The key insight: Don't manually set salt when using sdk.createOrder() with extensions
 */

const {LimitOrder, MakerTraits, Address, Sdk, randBigInt, FetchProviderConnector, ExtensionBuilder} = require('@1inch/limit-order-sdk');
const {Wallet, ethers} = require('ethers');
require('dotenv').config();

// Oracle deployed to Base Mainnet
const INDEX_ORACLE_ADDRESS = '0x8a585F9B2359Ef093E8a2f5432F387960e953BD2';

async function testSDKManagedSalt() {
    console.log('SDK MANAGED SALT TEST - Let SDK Handle Everything');
    console.log('===============================================\n');

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

        // Trade setup
        const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
        const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
        const makingAmount = ethers.utils.parseUnits('0.1', 6); // 0.1 USDC
        const takingAmount = ethers.utils.parseUnits('0.00003', 18); // 0.00003 WETH

        // Timing
        const expiresIn = 300n; // 5 minutes
        const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn;
        const UINT_40_MAX = (1n << 40n) - 1n;

        console.log('STEP 1: Creating VIX > 15 predicate...');
        
        // Real predicate: VIX index (ID: 2) > 1500 (15.00)
        const indexId = 2;
        const threshold = 1500;
        
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
            [threshold, arbitraryStaticCallData]
        );
        
        // Complete predicate with protocol address
        const LIMIT_ORDER_PROTOCOL = '0x111111125421cA6dc452d289314280a0f8842A65';
        const completePredicate = ethers.utils.solidityPack(
            ['address', 'bytes'],
            [LIMIT_ORDER_PROTOCOL, predicateData]
        );
        
        console.log(`   Condition: VIX (ID:${indexId}) > ${threshold/100}`);
        console.log(`   Predicate created (${completePredicate.length} chars)`);

        console.log('STEP 2: Building extension...');
        const extension = new ExtensionBuilder()
            .withPredicate(completePredicate)
            .build();
        console.log('   Extension with VIX predicate created');

        console.log('STEP 3: Creating MakerTraits with extension...');
        const makerTraits = MakerTraits.default()
            .withExpiration(expiration)
            .withNonce(randBigInt(UINT_40_MAX)) // Just use random nonce, let SDK handle salt
            .allowPartialFills()
            .allowMultipleFills()
            .withExtension(); // Enable extension support

        console.log('   MakerTraits configured');

        console.log('STEP 4: Creating SDK...');
        const sdk = new Sdk({ 
            authKey, 
            networkId: 8453,
            httpConnector: new FetchProviderConnector() 
        });

        console.log('STEP 5: Creating order via SDK (NO manual salt)...');
        
        // KEY CHANGE: Don't pass salt at all, let SDK generate it based on extension
        const order = await sdk.createOrder({
            makerAsset: new Address(USDC_ADDRESS),
            takerAsset: new Address(WETH_ADDRESS),
            makingAmount: makingAmount,
            takingAmount: takingAmount,
            maker: new Address(maker.address),
            // salt: DON'T SET THIS - let SDK generate it
            extension: extension.encode() // Include extension
        }, makerTraits);

        console.log('   SUCCESS! Order created via SDK with extension');
        console.log(`   Order Hash: ${order.getOrderHash()}`);
        console.log(`   Order Salt: ${order.salt}`); // See what salt SDK generated

        console.log('STEP 6: Signing order...');
        const typedData = order.getTypedData(8453);
        const signature = await maker._signTypedData(
            typedData.domain,
            {Order: typedData.types.Order},
            typedData.message
        );
        console.log(`   Signature: ${signature.substring(0, 20)}...`);

        console.log('STEP 7: Submitting order...');
        try {
            const result = await sdk.submitOrder(order, signature);
            console.log('   SUCCESS! Order with predicate submitted to 1inch API');
            console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
            
            console.log('\n🎉 BREAKTHROUGH: Index-based order successfully submitted!');
            
        } catch (submitError) {
            console.log(`   Submit failed: ${submitError.message}`);
            
            if (submitError.message.includes('Salt and extension')) {
                console.log('\n   Still getting salt/extension error');
                console.log('   This might indicate the predicate format needs adjustment');
            } else {
                console.log('\n   Different error - this is progress!');
                console.log(`   Full error: ${JSON.stringify(submitError, null, 2)}`);
            }
        }

        console.log('\nDEBUG INFO:');
        console.log('===========');
        console.log(`Order salt: ${order.salt}`);
        console.log(`Extension encoded: ${extension.encode().substring(0, 40)}...`);
        console.log(`Extension hash: ${ethers.utils.keccak256(extension.encode())}`);

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.message.includes('invalid salt')) {
            console.log('\nStill getting salt validation error from SDK createOrder');
            console.log('The SDK might not support extensions with createOrder method properly');
        } else {
            console.error('Stack:', error.stack);
        }
    }
}

testSDKManagedSalt();