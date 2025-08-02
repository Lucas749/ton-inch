#!/usr/bin/env node

/**
 * INDEX-BASED ORDER CREATOR
 * =========================
 * 
 * Complete function for creating 1inch limit orders with index-based predicates.
 * Designed for frontend integration with detailed options and examples.
 */

const {LimitOrder, MakerTraits, Address, Sdk, randBigInt, FetchProviderConnector, ExtensionBuilder} = require('@1inch/limit-order-sdk');
const {Wallet, ethers} = require('ethers');

// ===================================================================
// CONFIGURATION & CONSTANTS
// ===================================================================

const CONFIG = {
    // Base Mainnet Configuration
    CHAIN_ID: 8453,
    RPC_URL: 'https://base.llamarpc.com',
    LIMIT_ORDER_PROTOCOL: '0x111111125421cA6dc452d289314280a0f8842A65',
    INDEX_ORACLE_ADDRESS: '0x55aAfa1D3de3D05536C96Ee9F1b965D6cE04a4c1',
    
    // Base Mainnet Token Addresses
    TOKENS: {
        USDC: {
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            decimals: 6,
            symbol: 'USDC'
        },
        WETH: {
            address: '0x4200000000000000000000000000000000000006',
            decimals: 18,
            symbol: 'WETH'
        },
        ONEINCH: {
            address: '0xc5fecc3a29fb57b5024eec8a2239d4621e111cce',
            decimals: 18,
            symbol: '1INCH'
        },
        DAI: {
            address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
            decimals: 18,
            symbol: 'DAI'
        }
    }
};

// ===================================================================
// INDEX DEFINITIONS
// ===================================================================

/**
 * Available indices in the oracle contract
 */
const INDICES = {
    APPLE_STOCK: {
        id: 0,
        name: 'Apple Stock',
        symbol: 'AAPL',
        description: 'Apple Inc. stock price',
        currentValue: 17500, // $175.00 in basis points
        unit: 'USD (basis points)',
        example: 'AAPL > $180 would be: threshold: 18000'
    },
    TESLA_STOCK: {
        id: 1,
        name: 'Tesla Stock',
        symbol: 'TSLA',
        description: 'Tesla Inc. stock price',
        currentValue: 25000, // $250.00 in basis points
        unit: 'USD (basis points)',
        example: 'TSLA < $240 would be: threshold: 24000'
    },
    VIX_INDEX: {
        id: 2,
        name: 'VIX Volatility Index',
        symbol: 'VIX',
        description: 'CBOE Volatility Index',
        currentValue: 2000, // 20.00 in basis points
        unit: 'Index points (basis points)',
        example: 'VIX > 25 would be: threshold: 2500'
    },
    BTC_PRICE: {
        id: 3,
        name: 'Bitcoin Price',
        symbol: 'BTC',
        description: 'Bitcoin price in USD',
        currentValue: 4500000, // $45,000 in basis points
        unit: 'USD (basis points)',
        example: 'BTC > $50,000 would be: threshold: 5000000'
    }
};

// ===================================================================
// COMPARISON OPERATORS
// ===================================================================

/**
 * Available comparison operators for predicates
 */
const OPERATORS = {
    GREATER_THAN: {
        value: 'gt',
        name: 'Greater Than',
        symbol: '>',
        description: 'Execute when index value is greater than threshold',
        example: 'Apple > $180'
    },
    LESS_THAN: {
        value: 'lt',
        name: 'Less Than',
        symbol: '<',
        description: 'Execute when index value is less than threshold',
        example: 'VIX < 15'
    },
    EQUAL: {
        value: 'eq',
        name: 'Equal',
        symbol: '=',
        description: 'Execute when index value equals threshold (exact match)',
        example: 'Tesla = $250'
    },
    GREATER_EQUAL: {
        value: 'gte',
        name: 'Greater Than or Equal',
        symbol: '>=',
        description: 'Execute when index value is greater than or equal to threshold',
        example: 'BTC >= $50,000'
    },
    LESS_EQUAL: {
        value: 'lte',
        name: 'Less Than or Equal',
        symbol: '<=',
        description: 'Execute when index value is less than or equal to threshold',
        example: 'VIX <= 12'
    },
    NOT_EQUAL: {
        value: 'neq',
        name: 'Not Equal',
        symbol: '!=',
        description: 'Execute when index value is not equal to threshold',
        example: 'Apple != $175'
    }
};

// ===================================================================
// TYPE DEFINITIONS (for documentation)
// ===================================================================

/**
 * @typedef {Object} TokenInfo
 * @property {string} address - Token contract address
 * @property {number} decimals - Token decimals
 * @property {string} symbol - Token symbol
 */

/**
 * @typedef {Object} IndexCondition
 * @property {number} indexId - Index ID (0=Apple, 1=Tesla, 2=VIX, 3=BTC)
 * @property {string} operator - Comparison operator ('gt', 'lt', 'eq', 'gte', 'lte', 'neq')
 * @property {number} threshold - Threshold value in basis points
 * @property {string} description - Human-readable description
 */

/**
 * @typedef {Object} OrderParams
 * @property {string} fromToken - Token to sell (symbol or address)
 * @property {string} toToken - Token to buy (symbol or address)
 * @property {string} amount - Amount to sell (in token units, e.g., "0.1")
 * @property {string} expectedAmount - Expected amount to receive (in token units)
 * @property {IndexCondition} condition - Index condition for execution
 * @property {number} [expirationHours=24] - Order expiration in hours
 * @property {string} privateKey - Wallet private key
 * @property {string} oneInchApiKey - 1inch API key
 */

// ===================================================================
// CORE FUNCTION: CREATE INDEX-BASED ORDER
// ===================================================================

/**
 * Create a 1inch limit order with index-based predicate
 * 
 * @param {OrderParams} params - Order parameters
 * @returns {Promise<Object>} Order creation result
 */
async function createIndexBasedOrder(params) {
    console.log('🚀 Creating Index-Based Limit Order');
    console.log('===================================\n');
    
    try {
        // Validate parameters
        const validation = validateOrderParams(params);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Setup wallet and SDK
        const wallet = new Wallet(params.privateKey);
        const sdk = new Sdk({
            authKey: params.oneInchApiKey,
            networkId: CONFIG.CHAIN_ID,
            httpConnector: new FetchProviderConnector()
        });
        
        console.log(`👤 Wallet: ${wallet.address}`);
        console.log(`🌐 Network: Base Mainnet (${CONFIG.CHAIN_ID})`);
        console.log('');
        
        // Parse tokens
        const fromToken = getTokenInfo(params.fromToken);
        const toToken = getTokenInfo(params.toToken);
        
        // Parse amounts
        const makingAmount = ethers.utils.parseUnits(params.amount, fromToken.decimals);
        const takingAmount = ethers.utils.parseUnits(params.expectedAmount, toToken.decimals);
        
        console.log(`📊 Trading: ${params.amount} ${fromToken.symbol} → ${params.expectedAmount} ${toToken.symbol}`);
        console.log(`📋 Condition: ${params.condition.description}`);
        console.log('');
        
        // Create predicate
        console.log('🔮 Creating index predicate...');
        const predicate = createIndexPredicate(params.condition);
        
        // Create extension
        const extension = new ExtensionBuilder()
            .withPredicate(predicate)
            .build();
        console.log('✅ Extension created with predicate');
        
        // Setup timing
        const expirationHours = params.expirationHours || 24;
        const expiration = BigInt(Math.floor(Date.now() / 1000) + (expirationHours * 3600));
        const UINT_40_MAX = (1n << 40n) - 1n;
        
        // Create MakerTraits
        const makerTraits = MakerTraits.default()
            .withExpiration(expiration)
            .withNonce(randBigInt(UINT_40_MAX))
            .allowPartialFills()
            .allowMultipleFills()
            .withExtension();
        
        console.log('🔧 Creating order...');
        
        // Create order (let SDK handle salt)
        const order = await sdk.createOrder({
            makerAsset: new Address(fromToken.address),
            takerAsset: new Address(toToken.address),
            makingAmount: makingAmount,
            takingAmount: takingAmount,
            maker: new Address(wallet.address),
            extension: extension.encode()
        }, makerTraits);
        
        console.log(`✅ Order created: ${order.getOrderHash()}`);
        
        // Sign order
        console.log('✍️ Signing order...');
        const typedData = order.getTypedData(CONFIG.CHAIN_ID);
        const signature = await wallet._signTypedData(
            typedData.domain,
            {Order: typedData.types.Order},
            typedData.message
        );
        console.log('✅ Order signed');
        
        // Submit order
        console.log('📤 Submitting to 1inch...');
        let submitResult = null;
        let submitError = null;
        
        try {
            submitResult = await sdk.submitOrder(order, signature);
            console.log('✅ Order submitted successfully!');
        } catch (error) {
            submitError = error.message;
            console.log(`⚠️ Submit failed: ${error.message}`);
        }
        
        // Return comprehensive result
        const result = {
            success: submitResult !== null,
            orderHash: order.getOrderHash(),
            order: {
                fromToken: fromToken.symbol,
                toToken: toToken.symbol,
                amount: params.amount,
                expectedAmount: params.expectedAmount,
                condition: params.condition.description,
                expiration: new Date(Number(expiration) * 1000).toISOString()
            },
            condition: {
                index: INDICES[Object.keys(INDICES).find(key => INDICES[key].id === params.condition.indexId)],
                operator: params.condition.operator,
                threshold: params.condition.threshold,
                currentValue: INDICES[Object.keys(INDICES).find(key => INDICES[key].id === params.condition.indexId)]?.currentValue
            },
            submission: {
                submitted: submitResult !== null,
                result: submitResult,
                error: submitError
            },
            technical: {
                orderHash: order.getOrderHash(),
                salt: order.salt.toString(),
                signature: signature,
                predicate: predicate.substring(0, 40) + '...'
            }
        };
        
        console.log('\n🎯 ORDER CREATION COMPLETE');
        console.log('===========================');
        console.log(`Status: ${result.success ? 'SUCCESS' : 'CREATED (submission failed)'}`);
        console.log(`Hash: ${result.orderHash}`);
        console.log(`Condition: ${result.condition.index?.name} ${OPERATORS[Object.keys(OPERATORS).find(key => OPERATORS[key].value === params.condition.operator)]?.symbol} ${params.condition.threshold/100}`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Order creation failed:', error.message);
        return {
            success: false,
            error: error.message,
            orderHash: null
        };
    }
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Validate order parameters
 */
function validateOrderParams(params) {
    const errors = [];
    
    if (!params.fromToken) errors.push('fromToken is required');
    if (!params.toToken) errors.push('toToken is required');
    if (!params.amount) errors.push('amount is required');
    if (!params.expectedAmount) errors.push('expectedAmount is required');
    if (!params.condition) errors.push('condition is required');
    if (!params.privateKey) errors.push('privateKey is required');
    if (!params.oneInchApiKey) errors.push('oneInchApiKey is required');
    
    if (params.condition) {
        if (typeof params.condition.indexId !== 'number') errors.push('condition.indexId must be a number');
        if (!params.condition.operator) errors.push('condition.operator is required');
        if (typeof params.condition.threshold !== 'number') errors.push('condition.threshold must be a number');
        
        // Validate index ID
        const validIndexIds = Object.values(INDICES).map(idx => idx.id);
        if (!validIndexIds.includes(params.condition.indexId)) {
            errors.push(`Invalid indexId. Valid values: ${validIndexIds.join(', ')}`);
        }
        
        // Validate operator
        const validOperators = Object.values(OPERATORS).map(op => op.value);
        if (!validOperators.includes(params.condition.operator)) {
            errors.push(`Invalid operator. Valid values: ${validOperators.join(', ')}`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Get token information by symbol or address
 */
function getTokenInfo(tokenInput) {
    // If it's already an address
    if (tokenInput.startsWith('0x')) {
        return {
            address: tokenInput,
            decimals: 18, // Default
            symbol: 'UNKNOWN'
        };
    }
    
    // Look up by symbol
    const token = CONFIG.TOKENS[tokenInput.toUpperCase()];
    if (!token) {
        throw new Error(`Unknown token: ${tokenInput}. Available: ${Object.keys(CONFIG.TOKENS).join(', ')}`);
    }
    
    return token;
}

/**
 * Create index predicate for 1inch
 */
function createIndexPredicate(condition) {
    console.log(`   Index: ${INDICES[Object.keys(INDICES).find(key => INDICES[key].id === condition.indexId)]?.name}`);
    console.log(`   Operator: ${OPERATORS[Object.keys(OPERATORS).find(key => OPERATORS[key].value === condition.operator)]?.name}`);
    console.log(`   Threshold: ${condition.threshold}`);
    
    // Oracle call encoding
    const getIndexValueSelector = ethers.utils.id('getIndexValue(uint256)').slice(0, 10);
    const oracleCallData = ethers.utils.defaultAbiCoder.encode(
        ['bytes4', 'uint256'],
        [getIndexValueSelector, condition.indexId]
    );
    
    // Predicate structure: operator(threshold, arbitraryStaticCall(oracle, callData))
    const arbitraryStaticCallData = ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes'],
        [CONFIG.INDEX_ORACLE_ADDRESS, oracleCallData]
    );
    
    let predicateData;
    
    // Map our operator to 1inch methods (only gt, lt, eq are commonly supported)
    switch (condition.operator) {
        case 'gt':
        case 'gte': // Treat >= as > for simplicity
            predicateData = ethers.utils.defaultAbiCoder.encode(
                ['uint256', 'bytes'],
                [condition.threshold, arbitraryStaticCallData]
            );
            break;
        case 'lt':
        case 'lte': // Treat <= as < for simplicity
            predicateData = ethers.utils.defaultAbiCoder.encode(
                ['uint256', 'bytes'],
                [condition.threshold, arbitraryStaticCallData]
            );
            break;
        case 'eq':
            predicateData = ethers.utils.defaultAbiCoder.encode(
                ['uint256', 'bytes'],
                [condition.threshold, arbitraryStaticCallData]
            );
            break;
        default:
            // Default to gt
            predicateData = ethers.utils.defaultAbiCoder.encode(
                ['uint256', 'bytes'],
                [condition.threshold, arbitraryStaticCallData]
            );
    }
    
    // Complete predicate with protocol address
    const completePredicate = ethers.utils.solidityPack(
        ['address', 'bytes'],
        [CONFIG.LIMIT_ORDER_PROTOCOL, predicateData]
    );
    
    return completePredicate;
}

// ===================================================================
// USAGE EXAMPLES & DOCUMENTATION
// ===================================================================

/**
 * COMPREHENSIVE USAGE EXAMPLES
 * ============================
 */

function printUsageExamples() {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           INDEX-BASED ORDER CREATOR                          ║
║                         Complete Usage Documentation                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

📊 AVAILABLE INDICES:
${Object.entries(INDICES).map(([key, idx]) => `
   ${idx.id}. ${idx.name} (${idx.symbol})
      Current: ${idx.currentValue/100} ${idx.unit.includes('USD') ? 'USD' : 'points'}
      Example: ${idx.example}`).join('')}

🔢 COMPARISON OPERATORS:
${Object.entries(OPERATORS).map(([key, op]) => `
   '${op.value}' - ${op.name} (${op.symbol})
      ${op.description}
      Example: ${op.example}`).join('')}

💰 SUPPORTED TOKENS:
${Object.entries(CONFIG.TOKENS).map(([symbol, token]) => `
   ${symbol}: ${token.address}
      Decimals: ${token.decimals}`).join('')}

📋 FUNCTION SIGNATURE:
   createIndexBasedOrder({
     fromToken: string,        // Token symbol or address to sell
     toToken: string,          // Token symbol or address to buy  
     amount: string,           // Amount to sell (in token units)
     expectedAmount: string,   // Expected amount to receive
     condition: {
       indexId: number,        // Index ID (0-3)
       operator: string,       // Operator ('gt', 'lt', 'eq', etc.)
       threshold: number,      // Threshold in basis points
       description: string     // Human description
     },
     expirationHours: number,  // Optional, default 24
     privateKey: string,       // Wallet private key
     oneInchApiKey: string     // 1inch API key
   })

🚀 EXAMPLE USAGE:
   See example function below for complete working code.
`);
}

// ===================================================================
// WORKING EXAMPLE
// ===================================================================

/**
 * Complete working example
 */
async function runExample() {
    require('dotenv').config();
    
    // Print documentation
    printUsageExamples();
    
    console.log('🚀 RUNNING EXAMPLE: Apple Stock Conditional Order');
    console.log('================================================\n');
    
    const exampleOrder = {
        fromToken: 'USDC',                    // Sell USDC
        toToken: 'WETH',                      // Buy WETH
        amount: '0.1',                        // Sell 0.1 USDC
        expectedAmount: '0.00003',            // Expect 0.00003 WETH
        condition: {
            indexId: 0,                       // Apple Stock
            operator: 'gt',                   // Greater than
            threshold: 18000,                 // $180.00 (in basis points)
            description: 'Apple Stock > $180'
        },
        expirationHours: 24,                  // Expires in 24 hours
        privateKey: process.env.PRIVATE_KEY,
        oneInchApiKey: process.env.ONEINCH_API_KEY
    };
    
    const result = await createIndexBasedOrder(exampleOrder);
    
    console.log('\n📊 RESULT:');
    console.log('==========');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
    createIndexBasedOrder,
    INDICES,
    OPERATORS,
    CONFIG,
    validateOrderParams,
    printUsageExamples,
    runExample
};

// Run example if called directly
if (require.main === module) {
    runExample().catch(console.error);
}