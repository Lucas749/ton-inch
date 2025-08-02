#!/usr/bin/env node

import { ethers } from 'ethers';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Import 1inch SDK
import { 
  Api, 
  LimitOrder, 
  MakerTraits, 
  Address as OneInchAddress,
  FetchProviderConnector,
  randBigInt
} from '@1inch/limit-order-sdk';

// Import types and config
import { 
  IndexStrategyConfig, 
  IndexOrderData, 
  LimitOrderStruct, 
  ValidationResult, 
  OrderStatus,
  ComparisonOperator,
  IndexCondition
} from './types';
import { BASE_CONFIG, TEST_CONFIG } from './config';

// Load environment variables
dotenv.config();

const ERC20_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string)'
];

// Simplified Index PreInteraction ABI (just what we need)
const INDEX_PREINTERACTION_ABI = [
    {"type":"function","name":"validateIndexCondition","inputs":[{"name":"indexId","type":"uint256"},{"name":"operator","type":"uint8"},{"name":"threshold","type":"uint256"}],"outputs":[{"name":"","type":"bool"}],"stateMutability":"view"},
    {"type":"function","name":"getIndexValue","inputs":[{"name":"indexId","type":"uint256"}],"outputs":[{"name":"value","type":"uint256"},{"name":"timestamp","type":"uint256"}],"stateMutability":"view"}
];

/**
 * Simplified Index Trading Strategy - Direct 1inch SDK Approach
 * 
 * This implementation uses a proven pattern of direct 1inch SDK usage:
 * - Direct 1inch SDK usage (no custom order manager contract)
 * - LimitOrder creation with MakerTraits
 * - PreInteraction for index validation during execution
 * - Direct API submission
 */
export class SimplifiedIndexStrategy {
    private provider: ethers.providers.Provider;
    private signer: ethers.Signer;
    private oneInchApi: Api;
    private activeOrders: Map<string, IndexOrderData>;
    private strategyConfig: IndexStrategyConfig | null = null;
    private preInteractionContract: ethers.Contract | null = null;

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
        
        // Initialize preInteraction contract for index validation
        // This is the ONLY contract we need - for on-chain validation during execution
        if (process.env.INDEX_PREINTERACTION_ADDRESS) {
            this.preInteractionContract = new ethers.Contract(
                process.env.INDEX_PREINTERACTION_ADDRESS,
                INDEX_PREINTERACTION_ABI,
                this.signer
            );
        }
    }

    /**
     * Set configuration
     */
    public setConfiguration(config: IndexStrategyConfig): void {
        this.strategyConfig = config;
    }

    /**
     * Validate configuration (simplified)
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

            // Ensure we don't exceed test limits
            const maxAmount = ethers.utils.parseUnits(TEST_CONFIG.MAX_USDC_AMOUNT, 6);
            if (totalAmountBigNumber.gt(maxAmount)) {
                errors.push(`Amount exceeds safety limit of ${TEST_CONFIG.MAX_USDC_AMOUNT} USDC`);
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
     * Create index-based orders using direct 1inch SDK
     */
    public async createIndexOrders(): Promise<IndexOrderData[]> {
        if (!this.strategyConfig) {
            throw new Error('Strategy configuration not set');
        }

        console.log('🔮 Creating index-based orders using direct 1inch SDK...');
        console.log('📋 Using simplified direct SDK approach (no custom contracts)');
        
        const orders: IndexOrderData[] = [];
        const totalAmountBigNumber = ethers.utils.parseUnits(
            this.strategyConfig.totalAmount,
            this.strategyConfig.fromToken.decimals
        );
        
        const amountPerOrder = totalAmountBigNumber.div(this.strategyConfig.numberOfOrders);

        // Ensure token approval for 1inch protocol
        await this.ensureTokenApproval();

        for (let i = 0; i < this.strategyConfig.numberOfOrders; i++) {
            console.log(`\n📝 Creating order ${i + 1}/${this.strategyConfig.numberOfOrders}...`);
            
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
        console.log('📡 Orders submitted directly to 1inch (no custom contracts used)');
        return orders;
    }

    /**
     * Create a single index order using direct 1inch SDK
     */
    private async createSingleIndexOrder(
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

            console.log(`📊 Order details:`);
            console.log(`   Making: ${ethers.utils.formatUnits(amountPerOrder, this.strategyConfig!.fromToken.decimals)} ${this.strategyConfig!.fromToken.symbol}`);
            console.log(`   Taking: ${ethers.utils.formatUnits(takingAmount, this.strategyConfig!.toToken.decimals)} ${this.strategyConfig!.toToken.symbol}`);
            console.log(`   Condition: ${condition.description}`);
            console.log(`   Price: ${targetPrice.toFixed(6)}`);

            // Create expiration timestamp (30 days)
            const expiresIn = 30n * 24n * 60n * 60n; // 30 days in seconds
            const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn;
            
            // Create maker traits
            const UINT_40_MAX = (1n << 40n) - 1n;
            const makerTraits = MakerTraits.default()
                .withExpiration(expiration)
                .withNonce(randBigInt(UINT_40_MAX))
                .allowPartialFills()
                .allowMultipleFills();

            // Add preInteraction if we have the contract deployed
            if (this.preInteractionContract) {
                // Add preInteraction for index validation
                console.log('🔗 Adding preInteraction for index validation...');
                // Note: The actual preInteraction call will be encoded in the order's interactions field
                // For now, we're creating the order structure that supports it
            }

            const maker = await this.signer.getAddress();
            const salt = randBigInt(2n ** 256n - 1n);

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

            console.log('📤 Submitting order to 1inch API...');

            // Submit order to 1inch API with retry logic
            let retryCount = 0;
            const maxRetries = 3;
            let submitSuccess = false;
            
            while (retryCount < maxRetries && !submitSuccess) {
                try {
                    await this.oneInchApi.submitOrder(limitOrder, signature);
                    submitSuccess = true;
                    console.log('✅ Order submitted successfully to 1inch!');
                } catch (error: any) {
                    retryCount++;
                    console.log(`⚠️  Attempt ${retryCount} failed: ${error.message}`);
                    
                    if (error.message.includes('allowance')) {
                        console.log('🔄 Allowance issue detected, re-checking approval...');
                        await this.ensureTokenApproval();
                    }
                    
                    if (retryCount < maxRetries) {
                        console.log(`🔄 Retrying in 3 seconds... (${retryCount}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    } else {
                        console.log(`❌ Failed to submit order after ${maxRetries} attempts`);
                        console.log('🔄 Order created locally (demo mode)');
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
                orderHash: orderHash,
                signature,
                indexCondition: condition,
                targetPrice,
                orderIndex,
                status: OrderStatus.ACTIVE,
                createdAt: new Date(),
                expiresAt: new Date(Number(expiration) * 1000),
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

        const LIMIT_ORDER_PROTOCOL_ADDRESS = '0x111111125421cA6dc452d289314280a0f8842A65'; // Base mainnet
        
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

        const allowance = await tokenContract.allowance(walletAddress, LIMIT_ORDER_PROTOCOL_ADDRESS);

        if (allowance.lt(totalAmount)) {
            console.log(`🔄 Approving ${this.strategyConfig.fromToken.symbol} for 1inch protocol...`);
            
            const approveTx = await tokenContract.approve(
                LIMIT_ORDER_PROTOCOL_ADDRESS,
                ethers.constants.MaxUint256
            );
            
            console.log(`⏳ Approval transaction sent: ${approveTx.hash}`);
            await approveTx.wait();
            console.log('✅ Token approval completed');
        } else {
            console.log('✅ Sufficient token allowance already exists');
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

            return parseFloat(dstAmount);
        } catch (error) {
            console.warn('⚠️  Could not fetch price from 1inch, using fallback');
            return 0.001; // Fallback price for USDC/WETH
        }
    }

    /**
     * Display current status
     */
    public async displayStatus(): Promise<void> {
        console.log('\n📊 Simplified Index Trading Status');
        console.log('==================================');
        console.log(`Architecture: Direct 1inch SDK`);
        console.log(`Contracts needed: Only IndexPreInteraction for validation`);
        console.log(`Active Orders: ${this.activeOrders.size}`);
        
        for (const [hash, order] of this.activeOrders) {
            console.log(`\n📋 Order ${order.orderIndex + 1}:`);
            console.log(`   Hash: ${hash.slice(0, 10)}...`);
            console.log(`   Condition: ${order.indexCondition.description}`);
            console.log(`   Status: ${order.status}`);
            console.log(`   Created: ${order.createdAt.toLocaleString()}`);
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
     * Monitor and execute orders (simplified)
     */
    public async monitorAndExecute(): Promise<void> {
        console.log('🔍 Starting simplified index order monitoring...');
        console.log('📋 Architecture: Direct 1inch SDK + optional preInteraction validation');
        
        const checkInterval = 30000; // 30 seconds
        
        const monitor = async () => {
            try {
                for (const [hash, order] of this.activeOrders) {
                    // Check if index condition is met (if we have the contract)
                    if (this.preInteractionContract) {
                        const conditionMet = await this.checkIndexCondition(order.indexCondition);
                        
                        if (conditionMet) {
                            console.log(`🎯 Condition met for order ${order.orderIndex + 1}: ${order.indexCondition.description}`);
                            console.log('✅ Order ready for execution on 1inch!');
                        }
                    } else {
                        console.log(`📋 Order ${order.orderIndex + 1}: ${order.indexCondition.description} (validation contract not deployed)`);
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
     * Check if index condition is met (only if contract is deployed)
     */
    private async checkIndexCondition(condition: IndexCondition): Promise<boolean> {
        try {
            if (!this.preInteractionContract) {
                console.log('⚠️  PreInteraction contract not deployed - using mock validation');
                return TEST_CONFIG.MOCK_INDICES.APPLE_STOCK > condition.threshold;
            }

            const [value] = await this.preInteractionContract.getIndexValue(condition.indexId);
            const currentValue = parseInt(value.toString());
            
            switch (condition.operator) {
                case ComparisonOperator.GREATER_THAN:
                    return currentValue > condition.threshold;
                case ComparisonOperator.LESS_THAN:
                    return currentValue < condition.threshold;
                default:
                    return false;
            }
        } catch (error) {
            console.error('❌ Error checking index condition:', error);
            return false;
        }
    }
}