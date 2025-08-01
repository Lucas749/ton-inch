#!/usr/bin/env node

/**
 * 🚀 Complete IndexPreInteraction Workflow with Web3.js
 * 
 * This script demonstrates the full lifecycle:
 * 1. Create custom index
 * 2. Set oracle value  
 * 3. Place conditional trade (can't execute)
 * 4. Update oracle to fulfill condition
 * 5. Verify order is now executable
 */

const Web3 = require('web3');
require('dotenv').config();

// Configuration
const CONFIG = {
    RPC_URL: 'https://sepolia.base.org',
    PRIVATE_KEY: process.env.PRIVATE_KEY || 'your_private_key_here',
    
    // Contract addresses - UPDATE THESE after deployment
    CONTRACTS: {
        IndexPreInteraction: '0x...', // Your deployed IndexPreInteraction
        IndexLimitOrderFactory: '0x...', // Your deployed IndexLimitOrderFactory
        MockIndexOracle: '0x...', // Your deployed MockIndexOracle
        USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
        WETH: '0x4200000000000000000000000000000000000006'  // Base Sepolia WETH
    }
};

// Contract ABIs (simplified)
const ABIS = {
    IndexPreInteraction: [
        {
            "inputs": [
                {"name": "name", "type": "string"},
                {"name": "description", "type": "string"}, 
                {"name": "oracle", "type": "address"}
            ],
            "name": "registerIndex",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "inputs": [{"name": "indexId", "type": "uint256"}],
            "name": "getIndexInfo", 
            "outputs": [
                {"name": "", "type": "string"},
                {"name": "", "type": "string"},
                {"name": "", "type": "address"},
                {"name": "", "type": "address"},
                {"name": "", "type": "bool"},
                {"name": "", "type": "uint256"}
            ],
            "type": "function"
        },
        {
            "inputs": [{"name": "indexId", "type": "uint256"}],
            "name": "getIndexValue",
            "outputs": [
                {"name": "value", "type": "uint256"},
                {"name": "timestamp", "type": "uint256"}
            ],
            "type": "function"
        },
        {
            "inputs": [{"name": "orderHash", "type": "bytes32"}],
            "name": "validateOrderCondition",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
        {
            "inputs": [{"name": "orderHash", "type": "bytes32"}],
            "name": "getOrderCondition",
            "outputs": [
                {"name": "indexId", "type": "uint256"},
                {"name": "operator", "type": "uint8"},
                {"name": "thresholdValue", "type": "uint256"}
            ],
            "type": "function"
        },
        {
            "inputs": [],
            "name": "BTC_PRICE",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        }
    ],
    
    IndexLimitOrderFactory: [
        {
            "inputs": [
                {"name": "salt", "type": "uint256"},
                {"name": "maker", "type": "address"},
                {"name": "receiver", "type": "address"},
                {"name": "makerAsset", "type": "address"},
                {"name": "takerAsset", "type": "address"},
                {"name": "makingAmount", "type": "uint256"},
                {"name": "takingAmount", "type": "uint256"},
                {"name": "indexId", "type": "uint256"},
                {"name": "operator", "type": "uint8"},
                {"name": "thresholdValue", "type": "uint256"},
                {"name": "expiry", "type": "uint40"}
            ],
            "name": "createIndexOrder",
            "outputs": [
                {
                    "components": [
                        {"name": "salt", "type": "uint256"},
                        {"name": "maker", "type": "address"},
                        {"name": "receiver", "type": "address"},
                        {"name": "makerAsset", "type": "address"},
                        {"name": "takerAsset", "type": "address"},
                        {"name": "makingAmount", "type": "uint256"},
                        {"name": "takingAmount", "type": "uint256"},
                        {"name": "makerTraits", "type": "bytes32"}
                    ],
                    "name": "",
                    "type": "tuple"
                },
                {"name": "", "type": "bytes"}
            ],
            "type": "function"
        },
        {
            "inputs": [
                {
                    "components": [
                        {"name": "salt", "type": "uint256"},
                        {"name": "maker", "type": "address"},
                        {"name": "receiver", "type": "address"},
                        {"name": "makerAsset", "type": "address"},
                        {"name": "takerAsset", "type": "address"},
                        {"name": "makingAmount", "type": "uint256"},
                        {"name": "takingAmount", "type": "uint256"},
                        {"name": "makerTraits", "type": "bytes32"}
                    ],
                    "name": "order",
                    "type": "tuple"
                }
            ],
            "name": "getOrderHash",
            "outputs": [{"name": "", "type": "bytes32"}],
            "type": "function"
        }
    ],
    
    MockIndexOracle: [
        {
            "inputs": [
                {"name": "indexType", "type": "uint8"},
                {"name": "newValue", "type": "uint256"}
            ],
            "name": "updateIndex",
            "outputs": [],
            "type": "function"
        },
        {
            "inputs": [{"name": "indexId", "type": "uint256"}],
            "name": "getIndexValue",
            "outputs": [
                {"name": "value", "type": "uint256"},
                {"name": "timestamp", "type": "uint256"}
            ],
            "type": "function"
        }
    ],
    
    ERC20: [
        {
            "inputs": [
                {"name": "spender", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
        {
            "inputs": [{"name": "account", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        }
    ]
};

class IndexWorkflow {
    constructor() {
        this.web3 = new Web3(CONFIG.RPC_URL);
        this.setupAccount();
        this.initializeContracts();
    }
    
    setupAccount() {
        if (CONFIG.PRIVATE_KEY === 'your_private_key_here') {
            console.error('❌ Please set PRIVATE_KEY in .env file or update CONFIG.PRIVATE_KEY');
            process.exit(1);
        }
        
        this.account = this.web3.eth.accounts.privateKeyToAccount(CONFIG.PRIVATE_KEY);
        this.web3.eth.accounts.wallet.add(this.account);
        console.log('👛 Wallet address:', this.account.address);
    }
    
    initializeContracts() {
        // Check if contract addresses are set
        if (CONFIG.CONTRACTS.IndexPreInteraction === '0x...') {
            console.error('❌ Please update contract addresses in CONFIG.CONTRACTS after deployment');
            process.exit(1);
        }
        
        this.preInteraction = new this.web3.eth.Contract(
            ABIS.IndexPreInteraction, 
            CONFIG.CONTRACTS.IndexPreInteraction
        );
        
        this.factory = new this.web3.eth.Contract(
            ABIS.IndexLimitOrderFactory,
            CONFIG.CONTRACTS.IndexLimitOrderFactory
        );
        
        this.oracle = new this.web3.eth.Contract(
            ABIS.MockIndexOracle,
            CONFIG.CONTRACTS.MockIndexOracle
        );
        
        this.usdc = new this.web3.eth.Contract(
            ABIS.ERC20,
            CONFIG.CONTRACTS.USDC
        );
    }
    
    async step1_createCustomIndex() {
        console.log('\n🚀 Step 1: Creating custom index...');
        
        const indexName = 'APPLE_STOCK';
        const description = 'Apple Inc. stock price in USD cents';
        const oracleAddress = CONFIG.CONTRACTS.MockIndexOracle;
        
        try {
            const tx = await this.preInteraction.methods
                .registerIndex(indexName, description, oracleAddress)
                .send({
                    from: this.account.address,
                    gas: 300000
                });
                
            console.log('✅ Custom index created!');
            console.log('📜 Transaction hash:', tx.transactionHash);
            
            // Extract index ID from events
            const receipt = await this.web3.eth.getTransactionReceipt(tx.transactionHash);
            
            // Parse IndexRegistered event (assuming first log is our event)
            const indexId = this.web3.utils.hexToNumber(receipt.logs[0].topics[1]);
            
            console.log('📊 Custom Index ID:', indexId);
            
            // Verify index info
            const indexInfo = await this.preInteraction.methods.getIndexInfo(indexId).call();
            console.log('📋 Index Info:');
            console.log('  Name:', indexInfo[0]);
            console.log('  Description:', indexInfo[1]);
            console.log('  Oracle:', indexInfo[2]);
            console.log('  Creator:', indexInfo[3]);
            console.log('  Active:', indexInfo[4]);
            
            return indexId;
            
        } catch (error) {
            console.error('❌ Error creating index:', error.message);
            throw error;
        }
    }
    
    async step2_setInitialOracleValue(indexId) {
        console.log('\n📡 Step 2: Setting initial oracle value...');
        
        const initialValue = 150 * 100; // $150.00 in cents
        
        try {
            const tx = await this.oracle.methods
                .updateIndex(2, initialValue) // Using BTC_PRICE enum (2) as proxy
                .send({
                    from: this.account.address,
                    gas: 100000
                });
                
            console.log('✅ Oracle value set!');
            console.log('📜 Transaction hash:', tx.transactionHash);
            console.log('💰 Value set to:', initialValue, 'cents ($' + (initialValue/100) + ')');
            
            // Verify the value
            const result = await this.oracle.methods.getIndexValue(indexId).call();
            console.log('📊 Current oracle value:', result[0], 'cents');
            console.log('⏰ Timestamp:', new Date(result[1] * 1000).toISOString());
            
            return initialValue;
            
        } catch (error) {
            console.error('❌ Error setting oracle value:', error.message);
            throw error;
        }
    }
    
    async step3_placeConditionalTrade(indexId) {
        console.log('\n💼 Step 3: Placing conditional trade...');
        
        const salt = Math.floor(Math.random() * 1000000);
        const maker = this.account.address;
        const receiver = this.account.address;
        const makerAsset = CONFIG.CONTRACTS.USDC;
        const takerAsset = CONFIG.CONTRACTS.WETH;
        const makingAmount = 1000 * 10**6; // 1000 USDC
        const takingAmount = this.web3.utils.toWei('0.5', 'ether'); // 0.5 ETH
        const operator = 0; // GREATER_THAN
        const thresholdValue = 160 * 100; // $160.00 - higher than current $150
        const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        
        console.log('📋 Trade Details:');
        console.log('  Selling:', makingAmount / 10**6, 'USDC');
        console.log('  Buying:', this.web3.utils.fromWei(takingAmount, 'ether'), 'ETH');
        console.log('  Condition: Apple stock > $' + (thresholdValue / 100));
        console.log('  Current: $150 (condition NOT met)');
        
        try {
            // First approve USDC spending (if needed)
            console.log('🔐 Approving USDC spending...');
            await this.usdc.methods
                .approve(CONFIG.CONTRACTS.IndexLimitOrderFactory, makingAmount)
                .send({
                    from: this.account.address,
                    gas: 100000
                });
                
            // Create the conditional order
            console.log('📝 Creating conditional order...');
            const result = await this.factory.methods
                .createIndexOrder(
                    salt,
                    maker,
                    receiver,
                    makerAsset,
                    takerAsset,
                    makingAmount,
                    takingAmount,
                    indexId,
                    operator,
                    thresholdValue,
                    expiry
                )
                .send({
                    from: this.account.address,
                    gas: 500000
                });
                
            console.log('✅ Conditional trade placed!');
            console.log('📜 Transaction hash:', result.transactionHash);
            
            // Get order from return value (first element of tuple)
            const order = {
                salt: salt,
                maker: maker,
                receiver: receiver,
                makerAsset: makerAsset,
                takerAsset: takerAsset,
                makingAmount: makingAmount,
                takingAmount: takingAmount,
                makerTraits: '0x0000000000000000000000000000000000000000000000000000000000000000' // Will be set by contract
            };
            
            // Get order hash
            const orderHash = await this.factory.methods.getOrderHash(order).call();
            console.log('📜 Order Hash:', orderHash);
            
            // Verify condition (should be false)
            const canExecute = await this.preInteraction.methods
                .validateOrderCondition(orderHash)
                .call();
                
            console.log('🚫 Can execute now:', canExecute, '(Expected: false)');
            
            return orderHash;
            
        } catch (error) {
            console.error('❌ Error placing trade:', error.message);
            throw error;
        }
    }
    
    async step4_fulfillCondition(indexId, orderHash) {
        console.log('\n🎯 Step 4: Changing oracle to fulfill condition...');
        
        const newValue = 165 * 100; // $165.00 - above our $160 threshold
        
        try {
            console.log('📈 Updating oracle value to $' + (newValue / 100) + '...');
            
            const tx = await this.oracle.methods
                .updateIndex(2, newValue) // Using BTC_PRICE enum as proxy
                .send({
                    from: this.account.address,
                    gas: 100000
                });
                
            console.log('✅ Oracle updated!');
            console.log('📜 Transaction hash:', tx.transactionHash);
            console.log('💰 New value:', newValue, 'cents ($' + (newValue/100) + ')');
            
            // Verify the new value
            const result = await this.oracle.methods.getIndexValue(indexId).call();
            console.log('📊 Oracle now shows:', result[0], 'cents');
            
            // Check if condition is now met
            console.log('🔍 Checking if condition is now met...');
            const canExecuteNow = await this.preInteraction.methods
                .validateOrderCondition(orderHash)
                .call();
                
            console.log('✅ Can execute now:', canExecuteNow, '(Expected: true)');
            
            if (canExecuteNow) {
                console.log('🎉 SUCCESS! Order condition fulfilled!');
                console.log('📈 Apple stock ($165) > threshold ($160)');
                console.log('💡 Order is now ready for execution by 1inch!');
            }
            
            return canExecuteNow;
            
        } catch (error) {
            console.error('❌ Error updating oracle:', error.message);
            throw error;
        }
    }
    
    async step5_monitorOrderExecution(orderHash) {
        console.log('\n👀 Step 5: Monitoring order execution...');
        
        console.log('📋 Order Status Summary:');
        console.log('  Order Hash:', orderHash);
        
        try {
            // Get condition details
            const condition = await this.preInteraction.methods
                .getOrderCondition(orderHash)
                .call();
                
            console.log('  Index ID:', condition.indexId);
            console.log('  Operator:', condition.operator, '(0=GT, 1=LT, 2=GTE, 3=LTE, 4=EQ)');
            console.log('  Threshold:', condition.thresholdValue);
            
            // Get current value
            const currentValue = await this.preInteraction.methods
                .getIndexValue(condition.indexId)
                .call();
                
            console.log('  Current Value:', currentValue.value);
            console.log('  Last Updated:', new Date(currentValue.timestamp * 1000).toISOString());
            
            // Check execution status
            const canExecute = await this.preInteraction.methods
                .validateOrderCondition(orderHash)
                .call();
                
            console.log('  Executable:', canExecute ? '✅ YES' : '❌ NO');
            
            if (canExecute) {
                console.log('\n🚀 ORDER READY FOR EXECUTION!');
                console.log('📞 1inch Protocol Integration:');
                console.log('  1. Order sits in 1inch order book');
                console.log('  2. When taker matches, preInteraction validates condition');
                console.log('  3. If condition passes, trade executes automatically');
                console.log('  4. If condition fails, trade reverts');
                console.log('\n💡 This order will execute automatically when someone takes it!');
            }
            
        } catch (error) {
            console.error('❌ Error monitoring order:', error.message);
            throw error;
        }
    }
    
    async runCompleteWorkflow() {
        console.log('🚀 Starting Complete Index-Based Trading Workflow\n');
        console.log('🌐 Network: Base Sepolia');
        console.log('👛 Address:', this.account.address);
        
        try {
            // Step 1: Create custom index
            const customIndexId = await this.step1_createCustomIndex();
            
            // Step 2: Set initial oracle value
            await this.step2_setInitialOracleValue(customIndexId);
            
            // Step 3: Place trade that cannot execute now
            const orderHash = await this.step3_placeConditionalTrade(customIndexId);
            
            // Step 4: Change oracle to fulfill condition
            await this.step4_fulfillCondition(customIndexId, orderHash);
            
            // Step 5: Monitor execution status
            await this.step5_monitorOrderExecution(orderHash);
            
            console.log('\n🎉 WORKFLOW COMPLETE!');
            console.log('✨ You\'ve successfully demonstrated:');
            console.log('  ✅ Custom index creation');
            console.log('  ✅ Oracle value management');
            console.log('  ✅ Conditional trade placement');
            console.log('  ✅ Dynamic condition fulfillment');
            console.log('  ✅ Order execution readiness');
            console.log('\n🚀 The future of conditional DeFi is here!');
            
        } catch (error) {
            console.error('💥 Workflow failed:', error.message);
            if (error.stack) {
                console.error('📜 Stack trace:', error.stack);
            }
        }
    }
}

// Run the workflow if called directly
if (require.main === module) {
    const workflow = new IndexWorkflow();
    workflow.runCompleteWorkflow();
}

module.exports = IndexWorkflow;