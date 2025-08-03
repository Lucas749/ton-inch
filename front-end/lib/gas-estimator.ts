/**
 * 🔥 GAS ESTIMATOR UTILITY
 * =========================
 * 
 * Comprehensive gas estimation for all transaction types across the application.
 * Optimized for Base network with reasonable defaults and safety margins.
 */

import { ethers } from 'ethers';
import Web3 from 'web3';

// Base network configuration
const BASE_CONFIG = {
  CHAIN_ID: 8453,
  RPC_URL: 'https://base.llamarpc.com',
  MAX_GAS_PRICE_GWEI: 0.01, // 0.01 gwei cap for reasonable Base L2 rates
  SAFETY_MARGIN: 1.01, // 1% safety margin (minimal for Base L2)
  
  // Contract addresses
  LIMIT_ORDER_PROTOCOL: '0x111111125421cA6dc452d289314280a0f8842A65',
  INDEX_ORACLE_ADDRESS: '0x8a585F9B2359Ef093E8a2f5432F387960e953BD2',
};

// Gas limit estimates for common operations (MetaMask-aggressive levels for Base L2)
const GAS_ESTIMATES = {
  ERC20_APPROVE: 25000,          // ERC20 approval matching MetaMask aggressive
  ERC20_TRANSFER: 21000,         // Standard ERC20 transfer (minimum)
  ORDER_CREATION: 35000,         // 1inch limit order creation (MetaMask-aggressive)
  ORDER_CANCELLATION: 25000,     // 1inch limit order cancellation (MetaMask-aggressive)
  ORACLE_UPDATE: 40000,          // Oracle index update (MetaMask-aggressive)
  ORACLE_CREATE_INDEX: 80000,    // Create new oracle index (MetaMask-aggressive)
  SWAP_TRANSACTION: 100000,      // Complex swap transaction (MetaMask-aggressive)
  COMPLEX_TRANSACTION: 150000,   // Very complex operations (MetaMask-aggressive)
};

export interface GasEstimate {
  gasLimit: number;
  gasPrice: string; // in wei
  gasPriceGwei: string;
  totalCostWei: string;
  totalCostEth: string;
  totalCostUsd?: string;
  recommendation: string;
  safetyMargin: number;
}

export interface TransactionGasData {
  gasLimit: number;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

/**
 * Create provider instance
 */
function getProvider(): ethers.providers.JsonRpcProvider {
  return new ethers.providers.JsonRpcProvider(BASE_CONFIG.RPC_URL);
}

/**
 * Create Web3 instance
 */
function getWeb3(): Web3 {
  return new Web3(new Web3.providers.HttpProvider(BASE_CONFIG.RPC_URL));
}

/**
 * Get optimized gas price for Base network
 */
export async function getOptimizedGasPrice(): Promise<{
  gasPrice: string;
  gasPriceGwei: string;
  isOptimized: boolean;
}> {
  try {
    const provider = getProvider();
    const networkGasPrice = await provider.getGasPrice();
    
    // Cap gas price for Base network (much cheaper than mainnet)
    const maxGasPriceWei = ethers.utils.parseUnits(BASE_CONFIG.MAX_GAS_PRICE_GWEI.toString(), 'gwei');
    const optimizedGasPrice = networkGasPrice.gt(maxGasPriceWei) ? maxGasPriceWei : networkGasPrice;
    
    const gasPriceGwei = ethers.utils.formatUnits(optimizedGasPrice, 'gwei');
    
    console.log(`⛽ Network gas price: ${ethers.utils.formatUnits(networkGasPrice, 'gwei')} gwei`);
    console.log(`⛽ Using optimized price: ${gasPriceGwei} gwei`);
    
    return {
      gasPrice: optimizedGasPrice.toString(),
      gasPriceGwei,
      isOptimized: optimizedGasPrice.lt(networkGasPrice)
    };
    
  } catch (error) {
    console.warn('⚠️ Failed to fetch gas price, using fallback');
    const fallbackGasPrice = ethers.utils.parseUnits('0.002', 'gwei'); // Reasonable fallback for Base L2
    
    return {
      gasPrice: fallbackGasPrice.toString(),
      gasPriceGwei: '0.002',
      isOptimized: true
    };
  }
}

/**
 * Estimate gas for ERC20 approval
 */
export async function estimateApprovalGas(
  tokenAddress: string,
  walletAddress: string,
  spenderAddress: string = BASE_CONFIG.LIMIT_ORDER_PROTOCOL,
  amount?: string
): Promise<GasEstimate> {
  try {
    const provider = getProvider();
    const gasPrice = await getOptimizedGasPrice();
    
    // Try to get accurate estimate
    let gasLimit = GAS_ESTIMATES.ERC20_APPROVE;
    
    try {
      const erc20Abi = ['function approve(address spender, uint256 amount) returns (bool)'];
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
      
      const approvalAmount = amount ? 
        ethers.utils.parseUnits(amount, 18) : 
        ethers.constants.MaxUint256;
      
      const estimatedGas = await tokenContract.estimateGas.approve(spenderAddress, approvalAmount, {
        from: walletAddress
      });
      
      const rawEstimate = estimatedGas.toNumber();
      
      // 🚫 CRITICAL FIX: Cap gas limit to prevent massive estimates  
      const MAX_REASONABLE_GAS = 100000; // 100k gas maximum for approval
      
      if (rawEstimate > MAX_REASONABLE_GAS) {
        console.warn(`⚠️  Approval gas estimate too high: ${rawEstimate} → using capped limit: ${MAX_REASONABLE_GAS}`);
        gasLimit = MAX_REASONABLE_GAS;
      } else {
        gasLimit = Math.floor(rawEstimate * BASE_CONFIG.SAFETY_MARGIN);
      }
      
      console.log(`📊 Approval gas estimate: ${rawEstimate} → ${gasLimit} (${rawEstimate > MAX_REASONABLE_GAS ? 'CAPPED' : 'with safety margin'})`);
      
    } catch (estimateError) {
      console.warn(`⚠️  Token approval gas estimation failed: ${(estimateError as Error).message}`);
      console.log('ℹ️ Using default approval gas estimate');
    }
    
    const totalCostWei = ethers.BigNumber.from(gasLimit).mul(gasPrice.gasPrice);
    const totalCostEth = ethers.utils.formatEther(totalCostWei);
    
    return {
      gasLimit,
      gasPrice: gasPrice.gasPrice,
      gasPriceGwei: gasPrice.gasPriceGwei,
      totalCostWei: totalCostWei.toString(),
      totalCostEth,
      recommendation: `Approval transaction for ${tokenAddress.substring(0, 8)}...`,
      safetyMargin: BASE_CONFIG.SAFETY_MARGIN
    };
    
  } catch (error) {
    console.error('❌ Gas estimation failed:', error);
    throw new Error(`Gas estimation failed: ${(error as Error).message}`);
  }
}

/**
 * Estimate gas for 1inch order operations
 */
export async function estimateOrderGas(
  operation: 'create' | 'cancel',
  walletAddress: string
): Promise<GasEstimate> {
  const gasPrice = await getOptimizedGasPrice();
  const baseGasLimit = operation === 'create' ? GAS_ESTIMATES.ORDER_CREATION : GAS_ESTIMATES.ORDER_CANCELLATION;
  const gasLimit = Math.floor(baseGasLimit * BASE_CONFIG.SAFETY_MARGIN);
  
  const totalCostWei = ethers.BigNumber.from(gasLimit).mul(gasPrice.gasPrice);
  const totalCostEth = ethers.utils.formatEther(totalCostWei);
  
  console.log(`📊 ${operation} order gas estimate: ${baseGasLimit} → ${gasLimit} (with safety margin)`);
  
  return {
    gasLimit,
    gasPrice: gasPrice.gasPrice,
    gasPriceGwei: gasPrice.gasPriceGwei,
    totalCostWei: totalCostWei.toString(),
    totalCostEth,
    recommendation: `1inch limit order ${operation}`,
    safetyMargin: BASE_CONFIG.SAFETY_MARGIN
  };
}

/**
 * Estimate gas for oracle operations
 */
export async function estimateOracleGas(
  operation: 'update' | 'create',
  walletAddress: string,
  initialValue?: number,
  sourceUrl?: string
): Promise<GasEstimate> {
  try {
    const web3 = getWeb3();
    const gasPrice = await getOptimizedGasPrice();
    
    let gasLimit = operation === 'create' ? GAS_ESTIMATES.ORACLE_CREATE_INDEX : GAS_ESTIMATES.ORACLE_UPDATE;
    
      // Try to get accurate estimate for oracle operations
  if (operation === 'create' && initialValue && sourceUrl) {
    try {
      const oracleAbi = [
        'function createCustomIndex(uint256 initialValue, string calldata sourceUrl, uint8 oracleType, address chainlinkOracleAddress) external returns (uint256 indexId)'
      ];
      
      const contract = new web3.eth.Contract(oracleAbi as any, BASE_CONFIG.INDEX_ORACLE_ADDRESS);
      
      const estimatedGas = await contract.methods
        .createCustomIndex(
          initialValue.toString(),
          sourceUrl,
          1, // CHAINLINK oracle type
          '0x0000000000000000000000000000000000000000'
        )
        .estimateGas({ from: walletAddress });
      
      const rawEstimate = Number(estimatedGas);
      
      // 🚫 CRITICAL FIX: Cap gas limit to prevent massive estimates
      const MAX_REASONABLE_GAS = 500000; // 500k gas maximum for any oracle operation
      
      if (rawEstimate > MAX_REASONABLE_GAS) {
        console.warn(`⚠️  Gas estimate too high: ${rawEstimate} → using capped limit: ${MAX_REASONABLE_GAS}`);
        gasLimit = MAX_REASONABLE_GAS;
      } else {
        gasLimit = Math.floor(rawEstimate * BASE_CONFIG.SAFETY_MARGIN);
      }
      
      console.log(`📊 Oracle ${operation} gas estimate: ${rawEstimate} → ${gasLimit} (${rawEstimate > MAX_REASONABLE_GAS ? 'CAPPED' : 'with safety margin'})`);
      
    } catch (estimateError) {
      console.warn(`⚠️  Contract gas estimation failed: ${(estimateError as Error).message}`);
      console.log(`ℹ️ Using default oracle ${operation} gas estimate: ${gasLimit}`);
    }
  }
    
    const totalCostWei = ethers.BigNumber.from(gasLimit).mul(gasPrice.gasPrice);
    const totalCostEth = ethers.utils.formatEther(totalCostWei);
    
    return {
      gasLimit,
      gasPrice: gasPrice.gasPrice,
      gasPriceGwei: gasPrice.gasPriceGwei,
      totalCostWei: totalCostWei.toString(),
      totalCostEth,
      recommendation: `Oracle ${operation} operation`,
      safetyMargin: BASE_CONFIG.SAFETY_MARGIN
    };
    
  } catch (error) {
    console.error('❌ Oracle gas estimation failed:', error);
    throw new Error(`Oracle gas estimation failed: ${(error as Error).message}`);
  }
}

/**
 * Check if wallet has sufficient balance for gas
 */
export async function checkGasBalance(
  walletAddress: string,
  estimatedGasCost: string
): Promise<{
  hasEnoughGas: boolean;
  currentBalance: string;
  currentBalanceEth: string;
  requiredBalance: string;
  requiredBalanceEth: string;
  shortfall?: string;
  shortfallEth?: string;
}> {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(walletAddress);
    const estimatedCost = ethers.BigNumber.from(estimatedGasCost);
    
    const hasEnoughGas = balance.gte(estimatedCost);
    const shortfall = hasEnoughGas ? undefined : estimatedCost.sub(balance);
    
    return {
      hasEnoughGas,
      currentBalance: balance.toString(),
      currentBalanceEth: ethers.utils.formatEther(balance),
      requiredBalance: estimatedCost.toString(),
      requiredBalanceEth: ethers.utils.formatEther(estimatedCost),
      shortfall: shortfall?.toString(),
      shortfallEth: shortfall ? ethers.utils.formatEther(shortfall) : undefined
    };
    
  } catch (error) {
    console.error('❌ Balance check failed:', error);
    throw new Error(`Balance check failed: ${(error as Error).message}`);
  }
}

/**
 * Get transaction data optimized for Base network
 */
export async function getTransactionGasData(gasEstimate: GasEstimate): Promise<TransactionGasData> {
  return {
    gasLimit: gasEstimate.gasLimit,
    gasPrice: gasEstimate.gasPrice,
    // For EIP-1559 transactions (optional)
    maxFeePerGas: gasEstimate.gasPrice,
    maxPriorityFeePerGas: ethers.utils.parseUnits('0.001', 'gwei').toString() // Minimal priority fee for Base
  };
}

/**
 * Calculate total transaction cost including multiple operations
 */
export async function calculateTotalTransactionCost(
  operations: Array<{
    type: 'approval' | 'order-create' | 'order-cancel' | 'oracle-update' | 'oracle-create';
    tokenAddress?: string;
    walletAddress: string;
    initialValue?: number;
    sourceUrl?: string;
  }>
): Promise<{
  totalGasLimit: number;
  totalCostWei: string;
  totalCostEth: string;
  breakdown: GasEstimate[];
  recommendation: string;
}> {
  const gasPrice = await getOptimizedGasPrice();
  const breakdown: GasEstimate[] = [];
  let totalGasLimit = 0;
  
  for (const op of operations) {
    let estimate: GasEstimate;
    
    switch (op.type) {
      case 'approval':
        if (!op.tokenAddress) throw new Error('Token address required for approval');
        estimate = await estimateApprovalGas(op.tokenAddress, op.walletAddress);
        break;
      case 'order-create':
        estimate = await estimateOrderGas('create', op.walletAddress);
        break;
      case 'order-cancel':
        estimate = await estimateOrderGas('cancel', op.walletAddress);
        break;
      case 'oracle-update':
        estimate = await estimateOracleGas('update', op.walletAddress);
        break;
      case 'oracle-create':
        estimate = await estimateOracleGas('create', op.walletAddress, op.initialValue, op.sourceUrl);
        break;
      default:
        throw new Error(`Unknown operation type: ${op.type}`);
    }
    
    breakdown.push(estimate);
    totalGasLimit += estimate.gasLimit;
  }
  
  const totalCostWei = ethers.BigNumber.from(totalGasLimit).mul(gasPrice.gasPrice);
  const totalCostEth = ethers.utils.formatEther(totalCostWei);
  
  const recommendation = operations.length > 1 ? 
    `Batch of ${operations.length} operations` : 
    breakdown[0]?.recommendation || 'Single operation';
  
  console.log(`📊 Total transaction cost: ${totalCostEth} ETH (${operations.length} operations)`);
  
  return {
    totalGasLimit,
    totalCostWei: totalCostWei.toString(),
    totalCostEth,
    breakdown,
    recommendation
  };
}

/**
 * Format gas estimate for display
 */
export function formatGasEstimate(estimate: GasEstimate): string {
  return `⛽ ${estimate.totalCostEth} ETH (${estimate.gasPriceGwei} gwei × ${estimate.gasLimit.toLocaleString()} gas)`;
}

/**
 * Get funding instructions for insufficient balance
 */
export function getFundingInstructions(walletAddress: string, shortfallEth: string): string {
  return `
💡 FUNDING REQUIRED
==================
Address: ${walletAddress}
Need: ${shortfallEth} ETH additional

Get Base ETH from:
• Bridge: https://bridge.base.org
• Coinbase (direct to Base)
• Base faucets (testnet)
• DEX: Uniswap, 1inch on Base

Note: Base network has very low fees compared to Ethereum mainnet!
  `.trim();
}

// Export configuration for external use
export const GAS_CONFIG = BASE_CONFIG;
export const DEFAULT_GAS_ESTIMATES = GAS_ESTIMATES;