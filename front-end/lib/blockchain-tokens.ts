/**
 * 🪙 Blockchain Token Service
 * Handles token operations like balances, transfers, and minting
 */

import { Web3 } from "web3";
import { CONTRACTS, ABIS } from "./blockchain-constants";
import type { BlockchainWallet } from "./blockchain-wallet";

export class BlockchainTokens {
  private web3: Web3;
  private wallet: BlockchainWallet;

  constructor(web3Instance: Web3, walletInstance: BlockchainWallet) {
    this.web3 = web3Instance;
    this.wallet = walletInstance;
  }

  /**
   * Check if browser wallet is available (basic check for MetaMask presence)
   */
  private isWalletAvailable(): boolean {
    return typeof window !== "undefined" && 
           !!window.ethereum && 
           !!window.ethereum.selectedAddress;
  }

  /**
   * Get current wallet address
   */
  private getCurrentWalletAddress(): string | null {
    if (!this.isWalletAvailable()) {
      return null;
    }
    return window.ethereum!.selectedAddress || null;
  }

  /**
   * Get token balance for specified wallet address
   */
  async getTokenBalance(tokenAddress: string, walletAddress?: string | null): Promise<string> {
    console.log('🔍 [BlockchainTokens] getTokenBalance called');
    console.log('🔍 [BlockchainTokens] Input params:', {
      tokenAddress,
      walletAddress,
      walletAddressType: typeof walletAddress,
      walletAddressLength: walletAddress?.length
    });
    
    try {
      // Use provided wallet address or fall back to detection
      let accountToUse = walletAddress;
      console.log('🔍 [BlockchainTokens] Initial accountToUse:', accountToUse);
      
      if (!accountToUse) {
        console.log('🔍 [BlockchainTokens] No wallet address provided, falling back to detection');
        if (!this.isWalletAvailable()) {
          console.log('❌ [BlockchainTokens] Wallet not available');
          throw new Error("Wallet not connected. Please connect your wallet first.");
        }
        accountToUse = this.getCurrentWalletAddress();
        console.log('🔍 [BlockchainTokens] Detected wallet address:', accountToUse);
        if (!accountToUse) {
          console.log('❌ [BlockchainTokens] No wallet address available after detection');
          throw new Error("No wallet address available");
        }
      }

      console.log('🔍 [BlockchainTokens] Creating token contract');
      console.log('🔍 [BlockchainTokens] Token contract address:', tokenAddress);
      console.log('🔍 [BlockchainTokens] ABI source: ABIS.ERC20');
      console.log('🔍 [BlockchainTokens] Web3 instance:', !!this.web3);
      console.log('🔍 [BlockchainTokens] Web3 provider:', this.web3.currentProvider);
      
      // Check ABI availability and methods
      console.log('🔍 [BlockchainTokens] ERC20 ABI available:', !!ABIS.ERC20);
      console.log('🔍 [BlockchainTokens] ERC20 ABI length:', ABIS.ERC20?.length);
      
      // Look for balanceOf method in ABI
      const balanceOfMethod = ABIS.ERC20.find(method => method.name === 'balanceOf');
      const decimalsMethod = ABIS.ERC20.find(method => method.name === 'decimals');
      console.log('🔍 [BlockchainTokens] balanceOf method found:', !!balanceOfMethod);
      console.log('🔍 [BlockchainTokens] decimals method found:', !!decimalsMethod);
      
      // Use ERC20 ABI for standard token compatibility
      const tokenContract = new this.web3.eth.Contract(
        ABIS.ERC20,
        tokenAddress
      );
      
      console.log('✅ [BlockchainTokens] Token contract created successfully');
      
      // Validate and normalize the wallet address
      console.log('🔍 [BlockchainTokens] Validating wallet address:', accountToUse);
      console.log('🔍 [BlockchainTokens] Address validation result:', this.web3.utils.isAddress(accountToUse));
      
      if (!this.web3.utils.isAddress(accountToUse)) {
        console.log('⚠️ [BlockchainTokens] Invalid address detected, attempting to fix');
        // Try to fix common address issues
        const cleanAddress = accountToUse.trim().slice(0, 42); // Take first 42 chars
        console.log('🔍 [BlockchainTokens] Cleaned address:', cleanAddress);
        console.log('🔍 [BlockchainTokens] Cleaned address validation:', this.web3.utils.isAddress(cleanAddress));
        
        if (!this.web3.utils.isAddress(cleanAddress)) {
          console.log('❌ [BlockchainTokens] Address cleaning failed');
          throw new Error(`Invalid wallet address: ${accountToUse}`);
        }
        accountToUse = cleanAddress;
        console.log('✅ [BlockchainTokens] Address fixed to:', accountToUse);
      }
      
      // Use checksum address for better compatibility
      const checksumAddress = this.web3.utils.toChecksumAddress(accountToUse);
      console.log('🔍 [BlockchainTokens] Final checksum address:', checksumAddress);
      
      // Check network connection and fix if needed
      try {
        const chainId = await this.web3.eth.getChainId();
        const blockNumber = await this.web3.eth.getBlockNumber();
        console.log('🔍 [BlockchainTokens] Network info:');
        console.log('🔍 [BlockchainTokens] Chain ID:', chainId);
        console.log('🔍 [BlockchainTokens] Latest block:', blockNumber);
        
        if (Number(chainId) !== 8453) {
          console.error('❌ [BlockchainTokens] CRITICAL: Wrong network detected!');
          console.error('❌ [BlockchainTokens] Expected: 8453 (Base Mainnet)');
          console.error('❌ [BlockchainTokens] Got:', Number(chainId));
          console.error('❌ [BlockchainTokens] This will cause contract call failures!');
          
          // Try to fix by re-setting the provider to the correct RPC
          console.log('🔧 [BlockchainTokens] Attempting to fix Web3 provider...');
          const { getRpcUrl } = require('./blockchain-utils');
          const correctRpcUrl = getRpcUrl();
          console.log('🔧 [BlockchainTokens] Resetting Web3 provider to:', correctRpcUrl);
          
          // Re-initialize Web3 with correct RPC
          const { Web3 } = require('web3');
          this.web3 = new Web3(correctRpcUrl);
          
          // Verify the fix
          const newChainId = await this.web3.eth.getChainId();
          console.log('🔧 [BlockchainTokens] New Chain ID after fix:', newChainId);
          
          if (Number(newChainId) !== 8453) {
            throw new Error(`Unable to connect to Base Mainnet. Web3 is stuck on chain ${newChainId}. Please switch your wallet to Base network.`);
          } else {
            console.log('✅ [BlockchainTokens] Web3 provider fixed successfully!');
          }
        } else {
          console.log('✅ [BlockchainTokens] Correct network: Base Mainnet');
        }
      } catch (networkError) {
        console.error('❌ [BlockchainTokens] Network check/fix failed:', networkError);
        throw new Error(`Network error: ${(networkError as any)?.message || 'Failed to connect to Base Mainnet'}`);
      }
      
      console.log('🔍 [BlockchainTokens] Making contract calls...');
      console.log('🔍 [BlockchainTokens] Calling balanceOf for:', checksumAddress);
      console.log('🔍 [BlockchainTokens] Calling decimals()');
      
      const [balance, decimals] = await Promise.all([
        tokenContract.methods.balanceOf(checksumAddress).call(),
        tokenContract.methods.decimals().call()
      ]);
      
      console.log('✅ [BlockchainTokens] Contract calls completed');
      console.log('🔍 [BlockchainTokens] Raw balance:', balance);
      console.log('🔍 [BlockchainTokens] Raw decimals:', decimals);

      // Properly handle the balance as string and convert based on actual decimals
      const balanceStr = String(balance);
      const decimalsNum = Number(decimals);
      
      console.log('🔍 [BlockchainTokens] Converting balance:');
      console.log('🔍 [BlockchainTokens] Balance string:', balanceStr);
      console.log('🔍 [BlockchainTokens] Decimals number:', decimalsNum);
      
      // Convert from smallest unit to human readable using actual decimals
      // For tokens like USDC (6 decimals) and WETH (18 decimals)
      const divisor = Math.pow(10, decimalsNum);
      const humanReadableBalance = parseFloat(balanceStr) / divisor;
      
      console.log('🔍 [BlockchainTokens] Divisor:', divisor);
      console.log('🔍 [BlockchainTokens] Human readable balance:', humanReadableBalance);
      
      // Format to reasonable decimal places
      const result = humanReadableBalance.toFixed(6);
      console.log('✅ [BlockchainTokens] Final result:', result);
      
      return result;

    } catch (error) {
      console.error("❌ [BlockchainTokens] Error getting token balance:", error);
      console.error("❌ [BlockchainTokens] Error type:", (error as any)?.constructor?.name);
      console.error("❌ [BlockchainTokens] Error message:", (error as any)?.message);
      console.error("❌ [BlockchainTokens] Error stack:", (error as any)?.stack);
      throw error;
    }
  }

  // Removed mintTestTokens function - TestUSDC not available in production

  // Removed getTestUSDCBalance function - TestUSDC not available in production

  /**
   * Check token allowance for a spender using simple Web3 call
   */
  async getTokenAllowance(tokenAddress: string, spenderAddress: string, walletAddress?: string | null): Promise<string> {
    console.log('🔍 [BlockchainTokens] getTokenAllowance called (simple Web3)');
    console.log('🔍 [BlockchainTokens] Input params:', {
      tokenAddress,
      spenderAddress,
      walletAddress
    });
    
    try {
      // Use provided wallet address or fall back to detection
      let accountToUse = walletAddress;
      
      if (!accountToUse) {
        if (!this.isWalletAvailable()) {
          throw new Error("Wallet not connected. Please connect your wallet first.");
        }
        accountToUse = this.getCurrentWalletAddress();
        if (!accountToUse) {
          throw new Error("No wallet address available");
        }
      }

      // Validate and normalize addresses
      if (!this.web3.utils.isAddress(accountToUse)) {
        const cleanAddress = accountToUse.trim().slice(0, 42);
        if (!this.web3.utils.isAddress(cleanAddress)) {
          throw new Error(`Invalid wallet address: ${accountToUse}`);
        }
        accountToUse = cleanAddress;
      }
      
      if (!this.web3.utils.isAddress(spenderAddress)) {
        throw new Error(`Invalid spender address: ${spenderAddress}`);
      }

      const checksumOwner = this.web3.utils.toChecksumAddress(accountToUse);
      const checksumSpender = this.web3.utils.toChecksumAddress(spenderAddress);
      
      console.log('🔍 [BlockchainTokens] Making allowance call:', { checksumOwner, checksumSpender });
      
      // ERC20 allowance(address,address) function signature: 0xdd62ed3e
      const allowanceSignature = '0xdd62ed3e';
      const encodedParams = this.web3.eth.abi.encodeParameters(
        ['address', 'address'],
        [checksumOwner, checksumSpender]
      );
      const callData = allowanceSignature + encodedParams.slice(2);
      
      console.log('🔍 [BlockchainTokens] Call data:', callData);
      
      const result = await this.web3.eth.call({
        to: tokenAddress,
        data: callData
      });
      
      console.log('🔍 [BlockchainTokens] Raw result:', result);
      
      // Decode the result as uint256
      const allowance = this.web3.utils.toBigInt(result).toString();
      
      console.log('✅ [BlockchainTokens] Parsed allowance:', allowance);
      
      return allowance;
    } catch (error) {
      console.error("❌ [BlockchainTokens] Error getting token allowance:", error);
      console.error("❌ [BlockchainTokens] Error type:", (error as any)?.constructor?.name);
      console.error("❌ [BlockchainTokens] Error message:", (error as any)?.message);
      throw error;
    }
  }

  /**
   * Check if token is approved for a specific amount
   */
  async isTokenApproved(tokenAddress: string, spenderAddress: string, requiredAmount: string, walletAddress?: string | null): Promise<boolean> {
    console.log('🔍 [BlockchainTokens] isTokenApproved called');
    console.log('🔍 [BlockchainTokens] Checking approval for amount:', requiredAmount);
    
    try {
      const allowance = await this.getTokenAllowance(tokenAddress, spenderAddress, walletAddress);
      const isApproved = BigInt(allowance) >= BigInt(requiredAmount);
      
      console.log('🔍 [BlockchainTokens] Approval check result:', {
        allowance,
        requiredAmount,
        isApproved
      });
      
      return isApproved;
    } catch (error) {
      console.error("❌ [BlockchainTokens] Error checking token approval:", error);
      return false;
    }
  }

  /**
   * Approve token spending using simple Web3 call and connected wallet
   */
  async approveToken(tokenAddress: string, spenderAddress: string, amount: string, walletAddress?: string | null): Promise<string> {
    console.log('🔍 [BlockchainTokens] approveToken called (simple Web3)');
    console.log('🔍 [BlockchainTokens] Input params:', {
      tokenAddress,
      spenderAddress,
      amount,
      walletAddress
    });
    
    try {
      // Use provided wallet address or fall back to detection
      let accountToUse = walletAddress;
      
      if (!accountToUse) {
        if (!this.isWalletAvailable()) {
          throw new Error("Wallet not connected. Please connect your wallet first.");
        }
        accountToUse = this.getCurrentWalletAddress();
        if (!accountToUse) {
          throw new Error("No wallet address available");
        }
      }

      // Validate and normalize addresses
      if (!this.web3.utils.isAddress(accountToUse)) {
        const cleanAddress = accountToUse.trim().slice(0, 42);
        if (!this.web3.utils.isAddress(cleanAddress)) {
          throw new Error(`Invalid wallet address: ${accountToUse}`);
        }
        accountToUse = cleanAddress;
      }
      
      if (!this.web3.utils.isAddress(spenderAddress)) {
        throw new Error(`Invalid spender address: ${spenderAddress}`);
      }

      const checksumOwner = this.web3.utils.toChecksumAddress(accountToUse);
      const checksumSpender = this.web3.utils.toChecksumAddress(spenderAddress);
      
      console.log('🔍 [BlockchainTokens] Preparing approval transaction:', {
        checksumOwner,
        checksumSpender,
        amount
      });

      // ERC20 approve(address,uint256) function signature: 0x095ea7b3
      const approveSignature = '0x095ea7b3';
      const encodedParams = this.web3.eth.abi.encodeParameters(
        ['address', 'uint256'],
        [checksumSpender, amount]
      );
      const approveCallData = approveSignature + encodedParams.slice(2);
      
      console.log('🔍 [BlockchainTokens] Encoded approve call data:', approveCallData);

      // Send transaction through MetaMask using window.ethereum
      if (!window.ethereum) {
        throw new Error("MetaMask not available");
      }

      console.log('🔍 [BlockchainTokens] Sending transaction through connected wallet...');
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: checksumOwner,
          to: tokenAddress,
          data: approveCallData,
          gas: '0x249F0', // 150000 in hex
        }],
      });

      console.log("✅ [BlockchainTokens] Token approval successful:", txHash);
      return txHash;
      
    } catch (error) {
      console.error("❌ [BlockchainTokens] Error approving token:", error);
      console.error("❌ [BlockchainTokens] Error type:", (error as any)?.constructor?.name);
      console.error("❌ [BlockchainTokens] Error message:", (error as any)?.message);
      throw error;
    }
  }

  /**
   * Get token symbol
   */
  async getTokenSymbol(tokenAddress: string): Promise<string> {
    try {
      const tokenContract = new this.web3.eth.Contract(
        ABIS.ERC20,
        tokenAddress
      );

      const symbol = await tokenContract.methods.symbol().call();
      return String(symbol);
    } catch (error) {
      console.error("❌ Error getting token symbol:", error);
      return "UNKNOWN";
    }
  }

  /**
   * Get token decimals
   */
  async getTokenDecimals(tokenAddress: string): Promise<number> {
    try {
      const tokenContract = new this.web3.eth.Contract(
        ABIS.ERC20,
        tokenAddress
      );

      const decimals = await tokenContract.methods.decimals().call();
      return Number(decimals);
    } catch (error) {
      console.error("❌ Error getting token decimals:", error);
      return 18; // Default to 18 decimals
    }
  }
}