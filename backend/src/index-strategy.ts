#!/usr/bin/env node

import { ethers } from 'ethers';
import axios from 'axios';
import readline from 'readline';
import * as dotenv from 'dotenv';

// Import 1inch SDK
import { 
    Api, 
    LimitOrder, 
    MakerTraits, 
    Address as OneInchAddress,
    FetchProviderConnector,
    randBigInt,
    ExtensionBuilder
} from '@1inch/limit-order-sdk';

// Import types and config
import { 
  IndexStrategyConfig, 
  TokenInfo, 
  IndexOrderData, 
  LimitOrderStruct, 
  ValidationResult, 
  OrderStatus,
  OneInchQuoteResponse,
  OneInchOrderResponse,
  OneInchOrdersResponse,
  OneInchOrderInfo,
  LIMIT_ORDER_PROTOCOL_ADDRESSES,
  ComparisonOperator,
  IndexCondition,
  Address
} from './types';
import { BASE_CONFIG, CONTRACTS, TEST_CONFIG } from './config';

// Load environment variables
dotenv.config();

const ERC20_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string)'
];

// REMOVED: REAL_1INCH_ORDER_MANAGER_ABI - Using direct 1inch SDK approach

// Oracle ABI for predicate encoding
const ORACLE_ABI = [
    {"type":"function","name":"getIndexValue","inputs":[{"name":"indexId","type":"uint256"}],"outputs":[{"name":"value","type":"uint256"},{"name":"timestamp","type":"uint256"}],"stateMutability":"view"}
];

// Index Oracle address for predicates (placeholder - needs deployment)
const INDEX_ORACLE_ADDRESS = process.env.INDEX_ORACLE_ADDRESS || '0x0000000000000000000000000000000000000000';

export class IndexTradingStrategy {
    private provider: ethers.providers.Provider;
    private signer: ethers.Signer;
    private oneInchApi: Api;
    private activeOrders: Map<string, IndexOrderData>;
    private strategyConfig: IndexStrategyConfig | null = null;

    constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
        this.provider = provider;
        this.signer = signer;
        
        // Initialize 1inch SDK API
        this.oneInchApi = new Api({
            networkId: BASE_CONFIG.chainId,
            authKey: BASE_CONFIG.oneInchApiKey,
            httpConnector: new FetchProviderConnector()
        });
        
        this.activeOrders = new Map();
    }

    /**
     * Set configuration (for programmatic setup)
     */
    public setConfiguration(config: IndexStrategyConfig): void {
        this.strategyConfig = config;
    }

    /**
     * Interactive configuration setup
     */
    public async initialize(): Promise<void> {
        console.log('🔧 Index Trading Strategy Configuration');
        console.log('======================================\n');
        
        // Implementation would go here for interactive setup
        // For now, using pre-configured strategies
    }

    /**
     * Validate configuration and check balances
     */
    public async validateConfigurationWithResult(): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!this.strategyConfig) {
            errors.push('Strategy configuration not set');
            return { isValid: false, errors, warnings };
        }

        try {
            // Check token balances
            const walletAddress = await this.signer.getAddress();
            const fromTokenContract = new ethers.Contract(
                this.strategyConfig.fromToken.address,
                ERC20_ABI,
                this.provider
            );

            const balance = await fromTokenContract.balanceOf(walletAddress);
            const totalAmountBigNumber = ethers.utils.parseUnits(
                this.strategyConfig.totalAmount,
                this.strategyConfig.fromToken.decimals
            );

            if (balance.lt(totalAmountBigNumber)) {
                errors.push(`Insufficient ${this.strategyConfig.fromToken.symbol} balance. Required: ${this.strategyConfig.totalAmount}, Available: ${ethers.utils.formatUnits(balance, this.strategyConfig.fromToken.decimals)}`);
            }

            // Check allowance
            const limitOrderProtocolAddress = LIMIT_ORDER_PROTOCOL_ADDRESSES[BASE_CONFIG.chainId];
            const allowance = await fromTokenContract.allowance(walletAddress, limitOrderProtocolAddress);
            if (allowance.lt(totalAmountBigNumber)) {
                warnings.push(`${this.strategyConfig.fromToken.symbol} allowance may be insufficient. Consider pre-approving tokens.`);
            }

            // Validate index conditions
            for (const condition of this.strategyConfig.indexConditions) {
                if (condition.indexId < 0) {
                    errors.push(`Invalid index ID: ${condition.indexId}`);
                }
                if (condition.threshold <= 0) {
                    errors.push(`Invalid threshold value: ${condition.threshold}`);
                }
            }

            // Check ETH balance for gas
            const ethBalance = await this.provider.getBalance(walletAddress);
            if (ethBalance.lt(ethers.utils.parseEther('0.001'))) {
                warnings.push('Low ETH balance for gas fees');
            }

        } catch (error: any) {
            errors.push(`Validation error: ${error.message}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Create index-based orders with 1inch SDK integration
     */
    public async createIndexOrders(): Promise<IndexOrderData[]> {
        if (!this.strategyConfig) {
            throw new Error('Strategy configuration not set');
        }

        // Using direct 1inch SDK - no custom order manager needed
        console.log('📋 Using direct 1inch SDK for order creation...');

        console.log('🔮 Creating index-based orders with direct 1inch SDK...');
        
        const orders: IndexOrderData[] = [];
        const totalAmountBigNumber = ethers.utils.parseUnits(
            this.strategyConfig.totalAmount,
            this.strategyConfig.fromToken.decimals
        );
        
        // Ensure we don't exceed maximum test amounts for USDC
        const maxAmount = ethers.utils.parseUnits(TEST_CONFIG.MAX_USDC_AMOUNT, 6); // USDC has 6 decimals
        if (totalAmountBigNumber.gt(maxAmount)) {
            throw new Error(`Amount ${this.strategyConfig.totalAmount} USDC exceeds maximum test amount ${TEST_CONFIG.MAX_USDC_AMOUNT} USDC`);
        }
        
        const amountPerOrder = totalAmountBigNumber.div(this.strategyConfig.numberOfOrders);

        // Ensure token approval
        await this.ensureTokenApproval();

        for (let i = 0; i < this.strategyConfig.numberOfOrders; i++) {
            console.log(`\n📝 Creating order ${i + 1}/${this.strategyConfig.numberOfOrders}...`);
            
            // Use the first condition for now (could be enhanced for multi-condition)
            const condition = this.strategyConfig.indexConditions[0];
            
            const orderData = await this.createSingleIndexOrder(
                amountPerOrder,
                condition,
                i
            );

            if (orderData) {
                orders.push(orderData);
                this.activeOrders.set(orderData.orderHash, orderData);
            }
        }

        console.log(`\n✅ Created ${orders.length} index-based orders successfully!`);
        return orders;
    }

    /**
     * Create simple 1inch orders when contracts aren't deployed
     */
    private async createSimple1inchOrders(): Promise<IndexOrderData[]> {
        console.log('📤 Creating simple 1inch limit orders (demo mode)...');
        
        const orders: IndexOrderData[] = [];
        const totalAmountBigNumber = ethers.utils.parseUnits(
            this.strategyConfig!.totalAmount,
            this.strategyConfig!.fromToken.decimals
        );
        
        const amountPerOrder = totalAmountBigNumber.div(this.strategyConfig!.numberOfOrders);
        
        // Ensure token approval for 1inch protocol
        await this.ensureTokenApproval();

        for (let i = 0; i < this.strategyConfig!.numberOfOrders; i++) {
            const condition = this.strategyConfig!.indexConditions[0];
            
            const orderData = await this.createSimple1inchOrder(
                amountPerOrder,
                condition,
                i
            );

            if (orderData) {
                orders.push(orderData);
                this.activeOrders.set(orderData.orderHash, orderData);
            }
        }

        return orders;
    }

    /**
     * Create a single index-based order
     */
    private async createSingleIndexOrder(
        amountPerOrder: ethers.BigNumber,
        condition: IndexCondition,
        orderIndex: number
    ): Promise<IndexOrderData | null> {
        try {
            // Get current price for the order
            const currentPrice = await this.getCurrentPrice();
            const targetPrice = currentPrice * (1 + (this.strategyConfig!.slippageTolerance / 100));
            
            // Calculate taking amount based on target price
            const takingAmount = amountPerOrder
                .mul(ethers.utils.parseUnits(targetPrice.toString(), 18))
                .div(ethers.utils.parseUnits('1', this.strategyConfig!.fromToken.decimals));

            console.log(`   Making: ${ethers.utils.formatUnits(amountPerOrder, this.strategyConfig!.fromToken.decimals)} ${this.strategyConfig!.fromToken.symbol}`);
            console.log(`   Taking: ${ethers.utils.formatUnits(takingAmount, this.strategyConfig!.toToken.decimals)} ${this.strategyConfig!.toToken.symbol}`);
            console.log(`   Condition: ${condition.description}`);
            console.log(`   Price: ${targetPrice.toFixed(6)}`);

            // Create order using direct 1inch SDK
            const salt = randBigInt(2n ** 256n - 1n);
            const maker = await this.signer.getAddress();
            const receiver = maker;
            const expiry = Math.floor(Date.now() / 1000) + ((this.strategyConfig!.expirationHours || 24) * 3600);

            console.log('🔧 Creating order via direct 1inch SDK...');
            
                        // Create order using direct 1inch SDK (simplified approach)
            // Create index predicate using ABI encoding 
            const indexPredicate = this.createIndexPredicate(condition);
            console.log('🔮 Created index predicate:', indexPredicate ? 'Success' : 'Using fallback');

            // Create extension with predicate (correct 1inch SDK approach)
            let extension = null;
            if (indexPredicate) {
                extension = new ExtensionBuilder()
                    .withPredicate(indexPredicate)
                    .build();
                console.log('✅ Created extension with predicate');
            }

            // Create MakerTraits with extension
            const expirationBigInt = BigInt(expiry);
            const UINT_40_MAX = (1n << 40n) - 1n;
            let makerTraits = MakerTraits.default()
                .withExpiration(expirationBigInt)
                .withNonce(randBigInt(UINT_40_MAX))
                .allowPartialFills()
                .allowMultipleFills();

            // Add extension if available (withExtension() enables extension support)
            if (extension) {
                makerTraits = makerTraits.withExtension();
                console.log('✅ Enabled extension support in MakerTraits');
            }

            // Create limit order with proper parameters and extension
            const limitOrderParams: any = {
                makerAsset: new OneInchAddress(this.strategyConfig!.fromToken.address),
                takerAsset: new OneInchAddress(this.strategyConfig!.toToken.address),
                makingAmount: BigInt(amountPerOrder.toString()),
                takingAmount: BigInt(takingAmount.toString()),
                maker: new OneInchAddress(maker),
                salt: salt,
                receiver: new OneInchAddress(receiver)
            };

            // Add extension directly to order parameters if available
            if (extension) {
                limitOrderParams.extension = extension;
                console.log('✅ Added extension to LimitOrder parameters');
            }

            const limitOrder = new LimitOrder(limitOrderParams, makerTraits);

            console.log('✅ LimitOrder object created successfully');

            // Get typed data for signing
            const typedData = limitOrder.getTypedData(BASE_CONFIG.chainId);
            
            console.log('🔐 Signing order...');
            
            // Sign the order using EIP-712
            const signature = await (this.signer as any)._signTypedData(
                typedData.domain,
                { Order: typedData.types.Order },
                typedData.message
            );

            // Get order hash
            const sdkOrderHash = limitOrder.getOrderHash(BASE_CONFIG.chainId);

            // Submit order to 1inch API with retry logic
            let retryCount = 0;
            const maxRetries = 3;
            let submitSuccess = false;
            
            while (retryCount < maxRetries && !submitSuccess) {
                try {
                    await this.oneInchApi.submitOrder(limitOrder, signature);
                    submitSuccess = true;
                    console.log('✅ Order posted to 1inch SDK successfully!');
                } catch (error: any) {
                    retryCount++;
                    console.log(`⚠️  SDK submission attempt ${retryCount} failed: ${error.message}`);
                    
                    if (retryCount < maxRetries) {
                        console.log(`🔄 Retrying in 3 seconds... (${retryCount}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    } else {
                        console.log(`❌ Failed to submit to 1inch SDK after ${maxRetries} attempts`);
                        console.log('🔄 Order created locally and can be executed manually');
                    }
                }
            }

            // Convert to our internal format
            const orderStruct: LimitOrderStruct = {
                salt: limitOrder.salt,
                maker: limitOrder.maker.toString(),
                receiver: limitOrder.receiver?.toString() || limitOrder.maker.toString(),
                makerAsset: limitOrder.makerAsset.toString(),
                takerAsset: limitOrder.takerAsset.toString(),
                makingAmount: limitOrder.makingAmount,
                takingAmount: limitOrder.takingAmount,
                makerTraits: (limitOrder.makerTraits as any).value || limitOrder.makerTraits
            };

            return {
                order: orderStruct,
                orderHash: sdkOrderHash,
                signature,
                indexCondition: condition,
                targetPrice,
                orderIndex,
                status: OrderStatus.ACTIVE,
                createdAt: new Date(),
                expiresAt: new Date(expiry * 1000),
                limitOrderInstance: limitOrder
            };

        } catch (error) {
            console.error(`❌ Failed to create order ${orderIndex + 1}:`, (error as Error).message);
            return null;
        }
    }

    /**
     * Create a simple 1inch order without index contract integration
     */
    private async createSimple1inchOrder(
        amountPerOrder: ethers.BigNumber,
        condition: IndexCondition,
        orderIndex: number
    ): Promise<IndexOrderData | null> {
        try {
            const currentPrice = await this.getCurrentPrice();
            const targetPrice = currentPrice * (1 + (this.strategyConfig!.slippageTolerance / 100));
            
            const takingAmount = amountPerOrder
                .mul(ethers.utils.parseUnits(targetPrice.toString(), 18))
                .div(ethers.utils.parseUnits('1', this.strategyConfig!.fromToken.decimals));

            console.log(`   Making: ${ethers.utils.formatUnits(amountPerOrder, this.strategyConfig!.fromToken.decimals)} ${this.strategyConfig!.fromToken.symbol}`);
            console.log(`   Taking: ${ethers.utils.formatUnits(takingAmount, this.strategyConfig!.toToken.decimals)} ${this.strategyConfig!.toToken.symbol}`);
            console.log(`   Condition: ${condition.description} (demo only - no validation)`);
            console.log(`   Price: ${targetPrice.toFixed(6)}`);

            const salt = randBigInt(2n ** 256n - 1n);
            const maker = await this.signer.getAddress();
            const expiry = Math.floor(Date.now() / 1000) + ((this.strategyConfig!.expirationHours || 24) * 3600);

            const UINT_40_MAX = (1n << 40n) - 1n;
            
            // Create MakerTraits
            const makerTraits = MakerTraits.default()
                .withExpiration(BigInt(expiry))
                .withNonce(randBigInt(UINT_40_MAX));

            // Create limit order using 1inch SDK
            const limitOrder = new LimitOrder({
                makerAsset: new OneInchAddress(this.strategyConfig!.fromToken.address),
                takerAsset: new OneInchAddress(this.strategyConfig!.toToken.address),
                makingAmount: BigInt(amountPerOrder.toString()),
                takingAmount: BigInt(takingAmount.toString()),
                maker: new OneInchAddress(maker),
                salt: salt,
                receiver: new OneInchAddress(maker)
            }, makerTraits);

            // Get typed data for signing
            const typedData = limitOrder.getTypedData(BASE_CONFIG.chainId);
            
            console.log('🔐 Signing order...');
            
            // Sign the order using EIP-712
            const signature = await (this.signer as any)._signTypedData(
                typedData.domain,
                { Order: typedData.types.Order },
                typedData.message
            );

            // Get order hash
            const orderHash = limitOrder.getOrderHash(BASE_CONFIG.chainId);

            console.log('📤 Submitting to 1inch SDK...');

            // Submit order to 1inch API
            try {
                await this.oneInchApi.submitOrder(limitOrder, signature);
                console.log('✅ Order posted to 1inch SDK successfully!');
            } catch (error: any) {
                console.log(`⚠️  SDK submission failed: ${error.message}`);
                console.log('🔄 Order created locally (demo mode)');
            }

            // Convert to our internal format
            const orderStruct: LimitOrderStruct = {
                salt: limitOrder.salt,
                maker: limitOrder.maker.toString(),
                receiver: limitOrder.receiver?.toString() || limitOrder.maker.toString(),
                makerAsset: limitOrder.makerAsset.toString(),
                takerAsset: limitOrder.takerAsset.toString(),
                makingAmount: limitOrder.makingAmount,
                takingAmount: limitOrder.takingAmount,
                makerTraits: (limitOrder.makerTraits as any).value || limitOrder.makerTraits
            };

            return {
                order: orderStruct,
                orderHash: orderHash,
                signature,
                indexCondition: condition,
                targetPrice,
                orderIndex,
                status: OrderStatus.ACTIVE,
                createdAt: new Date(),
                expiresAt: new Date(expiry * 1000),
                limitOrderInstance: limitOrder
            };

        } catch (error) {
            console.error(`❌ Failed to create order ${orderIndex + 1}:`, (error as Error).message);
            return null;
        }
    }

    /**
     * Ensure token approval for 1inch protocol
     */
    private async ensureTokenApproval(): Promise<void> {
        if (!this.strategyConfig) return;

        const limitOrderProtocolAddress = LIMIT_ORDER_PROTOCOL_ADDRESSES[BASE_CONFIG.chainId];
        
        const tokenContract = new ethers.Contract(
            this.strategyConfig.fromToken.address,
            ERC20_ABI,
            this.signer
        );

        const walletAddress = await this.signer.getAddress();
        const totalAmount = ethers.utils.parseUnits(
            this.strategyConfig.totalAmount,
            this.strategyConfig.fromToken.decimals
        );

        const allowance = await tokenContract.allowance(walletAddress, limitOrderProtocolAddress);

        if (allowance.lt(totalAmount)) {
            console.log(`🔄 Approving ${this.strategyConfig.fromToken.symbol} for 1inch protocol...`);
            
            const approveTx = await tokenContract.approve(
                limitOrderProtocolAddress,
                ethers.constants.MaxUint256
            );
            
            await approveTx.wait();
            console.log('✅ Token approval completed');
        }
    }

    /**
     * Get current price from 1inch
     */
    private async getCurrentPrice(): Promise<number> {
        try {
            if (!this.strategyConfig) throw new Error('Strategy config not set');

            const response = await axios.get(
                `https://api.1inch.dev/swap/v6.0/${BASE_CONFIG.chainId}/quote`,
                {
                    params: {
                        src: this.strategyConfig.fromToken.address,
                        dst: this.strategyConfig.toToken.address,
                        amount: ethers.utils.parseUnits('1', this.strategyConfig.fromToken.decimals).toString()
                    },
                    headers: {
                        'Authorization': `Bearer ${BASE_CONFIG.oneInchApiKey}`
                    }
                }
            );

            const dstAmount = ethers.utils.formatUnits(
                response.data.dstAmount,
                this.strategyConfig.toToken.decimals
            );

            const price = parseFloat(dstAmount);
            return Math.max(price, 0.0001); // Ensure minimum price to avoid underflow
        } catch (error) {
            console.warn('⚠️  Could not fetch price from 1inch, using fallback');
            return 0.0003; // Safe fallback price for USDC/WETH (1 USDC = 0.0003 ETH)
        }
    }

    /**
     * Display current status
     */
    public async displayStatus(): Promise<void> {
        console.log('\n📊 Index Trading Strategy Status');
        console.log('===============================');
        console.log(`Active Orders: ${this.activeOrders.size}`);
        
        for (const [hash, order] of this.activeOrders) {
            console.log(`\n📋 Order ${order.orderIndex + 1}:`);
            console.log(`   Hash: ${hash.slice(0, 10)}...`);
            console.log(`   Condition: ${order.indexCondition.description}`);
            console.log(`   Status: ${order.status}`);
            console.log(`   Created: ${order.createdAt.toLocaleString()}`);
            console.log(`   Expires: ${order.expiresAt.toLocaleString()}`);
        }
    }

    /**
     * Sync orders with 1inch API
     */
    public async syncOrdersWithAPI(): Promise<void> {
        try {
            const walletAddress = await this.signer.getAddress();
            const response = await this.oneInchApi.getOrdersByMaker(new OneInchAddress(walletAddress));
            
            console.log(`🔄 Synced with 1inch API: ${response.length} orders found`);
        } catch (error: any) {
            console.log('⚠️  Could not sync with 1inch API:', error.message);
        }
    }

    /**
     * Get order status from 1inch API
     */
    public async getOrderStatus(orderHash: string): Promise<any | null> {
        try {
            return await this.oneInchApi.getOrderByHash(orderHash);
        } catch (error) {
            return null;
        }
    }

    /**
     * Monitor and execute orders
     */
    public async monitorAndExecute(): Promise<void> {
        console.log('🔍 Starting index-based order monitoring...');
        
        const checkInterval = 30000; // 30 seconds
        
        const monitor = async () => {
            try {
                for (const [hash, order] of this.activeOrders) {
                    // Check if index condition is met
                    const conditionMet = await this.checkIndexCondition(order.indexCondition);
                    
                    if (conditionMet) {
                        console.log(`🎯 Condition met for order ${order.orderIndex + 1}: ${order.indexCondition.description}`);
                        console.log('✅ Order is ready for execution on 1inch!');
                    }
                    
                    // Check order status from 1inch API
                    const apiStatus = await this.getOrderStatus(hash);
                    if (apiStatus && apiStatus.orderInvalidReason !== undefined) {
                        if (apiStatus.orderInvalidReason === 0) {
                            console.log(`📈 Order ${order.orderIndex + 1} is active and fillable`);
                        } else {
                            console.log(`⚠️  Order ${order.orderIndex + 1} has issues (reason: ${apiStatus.orderInvalidReason})`);
                        }
                    }
                }
            } catch (error: any) {
                console.error('❌ Monitoring error:', error.message);
            }
            
            setTimeout(monitor, checkInterval);
        };
        
        monitor();
    }

    /**
     * Check if index condition is met
     */
    private async checkIndexCondition(condition: IndexCondition): Promise<boolean> {
        try {
            // Check if oracle is available for validation
            if (INDEX_ORACLE_ADDRESS === '0x0000000000000000000000000000000000000000') {
                console.log('⚠️  Oracle contract not deployed - using mock condition check');
                // Use mock values for demo
                const mockValue = TEST_CONFIG.MOCK_INDICES.APPLE_STOCK; // Default to Apple
                
                switch (condition.operator) {
                    case ComparisonOperator.GREATER_THAN:
                        return mockValue > condition.threshold;
                    case ComparisonOperator.LESS_THAN:
                        return mockValue < condition.threshold;
                    case ComparisonOperator.GREATER_EQUAL:
                        return mockValue >= condition.threshold;
                    case ComparisonOperator.LESS_EQUAL:
                        return mockValue <= condition.threshold;
                    case ComparisonOperator.EQUAL:
                        return mockValue === condition.threshold;
                    case ComparisonOperator.NOT_EQUAL:
                        return mockValue !== condition.threshold;
                    default:
                        return false;
                }
            }

            // For now, use mock data - would need to call oracle contract directly
            const mockValue = TEST_CONFIG.MOCK_INDICES.APPLE_STOCK;
            const value = mockValue;
            const currentValue = parseInt(value.toString());
            
            switch (condition.operator) {
                case ComparisonOperator.GREATER_THAN:
                    return currentValue > condition.threshold;
                case ComparisonOperator.LESS_THAN:
                    return currentValue < condition.threshold;
                case ComparisonOperator.GREATER_EQUAL:
                    return currentValue >= condition.threshold;
                case ComparisonOperator.LESS_EQUAL:
                    return currentValue <= condition.threshold;
                case ComparisonOperator.EQUAL:
                    return currentValue === condition.threshold;
                case ComparisonOperator.NOT_EQUAL:
                    return currentValue !== condition.threshold;
                default:
                    return false;
            }
        } catch (error) {
            console.error('❌ Error checking index condition:', error);
            return false;
        }
    }

    /**
     * Create index predicate using ABI packed encoding (as requested)
     * Returns predicate hex string for use with ExtensionBuilder
     */
    private createIndexPredicate(condition: IndexCondition): string | null {
        try {
            if (INDEX_ORACLE_ADDRESS === '0x0000000000000000000000000000000000000000') {
                console.log('⚠️  Oracle not deployed - predicate disabled');
                return null;
            }

            console.log(`🔮 Creating ABI-packed predicate for ${condition.description}`);
            
            // Step 1: Encode the oracle call data for getIndexValue(indexId)
            const getIndexValueCalldata = ethers.utils.defaultAbiCoder.encode(
                ['bytes4', 'uint256'],
                [
                    ethers.utils.id('getIndexValue(uint256)').slice(0, 10), // function selector 
                    condition.indexId
                ]
            );

            // Step 2: Create comparison predicate following 1inch structure
            // Structure: gt(value, arbitraryStaticCall(target, callData))
            
            // Encode arbitraryStaticCall(address target, bytes callData)
            const arbitraryStaticCallData = ethers.utils.defaultAbiCoder.encode(
                ['address', 'bytes'],
                [INDEX_ORACLE_ADDRESS, getIndexValueCalldata]
            );

            // Step 3: Create the gt/lt predicate with ABI packing
            let predicateCalldata: string;
            const thresholdValue = condition.threshold;

            switch (condition.operator) {
                case ComparisonOperator.GREATER_THAN:
                    // gt(uint256 value, bytes callData) 
                    predicateCalldata = ethers.utils.defaultAbiCoder.encode(
                        ['uint256', 'bytes'],
                        [thresholdValue, arbitraryStaticCallData]
                    );
                    break;
                    
                case ComparisonOperator.LESS_THAN:
                    // lt(uint256 value, bytes callData)
                    predicateCalldata = ethers.utils.defaultAbiCoder.encode(
                        ['uint256', 'bytes'], 
                        [thresholdValue, arbitraryStaticCallData]
                    );
                    break;
                    
                case ComparisonOperator.EQUAL:
                    // eq(uint256 value, bytes callData)
                    predicateCalldata = ethers.utils.defaultAbiCoder.encode(
                        ['uint256', 'bytes'],
                        [thresholdValue, arbitraryStaticCallData]
                    );
                    break;
                    
                default:
                    console.warn('⚠️  Unsupported operator, using GREATER_THAN');
                    predicateCalldata = ethers.utils.defaultAbiCoder.encode(
                        ['uint256', 'bytes'],
                        [thresholdValue, arbitraryStaticCallData]
                    );
            }

            // Step 4: ABI pack the complete predicate 
            // Format: [20 bytes protocol address] + [encoded predicate call data]
            const completePredicate = ethers.utils.solidityPack(
                ['address', 'bytes'],
                [CONTRACTS.REAL_1INCH_PROTOCOL, predicateCalldata]
            );

            console.log('✅ ABI-packed index predicate created');
            console.log(`   Oracle: ${INDEX_ORACLE_ADDRESS}`);
            console.log(`   Operator: ${ComparisonOperator[condition.operator]}`);
            console.log(`   Threshold: ${condition.threshold}`);
            console.log(`   Predicate length: ${completePredicate.length} chars`);
            
            return completePredicate;

        } catch (error) {
            console.error('❌ Failed to create ABI-packed predicate:', error);
            return null;
        }
    }
}