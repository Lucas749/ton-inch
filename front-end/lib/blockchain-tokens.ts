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
   * Get token balance for connected wallet
   */
  async getTokenBalance(tokenAddress: string): Promise<string> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected");
      }

      const tokenContract = new this.web3.eth.Contract(
        ABIS.ERC20,
        tokenAddress
      );
      
      const [balance, decimals] = await Promise.all([
        tokenContract.methods.balanceOf(this.wallet.currentAccount).call(),
        tokenContract.methods.decimals().call()
      ]);

      // Properly handle the balance calculation based on actual token decimals
      const balanceStr = String(balance);
      const decimalPlaces = Number(decimals);
      
      // Convert balance from smallest unit to readable format
      const divisor = BigInt(10 ** decimalPlaces);
      const balanceBigInt = BigInt(balanceStr);
      
      const wholePart = balanceBigInt / divisor;
      const fractionalPart = balanceBigInt % divisor;
      
      if (fractionalPart === BigInt(0)) {
        return wholePart.toString();
      }
      
      // Format fractional part with proper padding
      const fractionalStr = fractionalPart.toString().padStart(decimalPlaces, '0');
      // Remove trailing zeros
      const trimmedFractional = fractionalStr.replace(/0+$/, '');
      
      return trimmedFractional ? `${wholePart}.${trimmedFractional}` : wholePart.toString();
      
    } catch (error) {
      console.error("❌ Error getting token balance:", error);
      throw error;
    }
  }

  // Removed mintTestTokens function - TestUSDC not available in production

  // Removed getTestUSDCBalance function - TestUSDC not available in production

  /**
   * Approve token spending
   */
  async approveToken(tokenAddress: string, spenderAddress: string, amount: string): Promise<string> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected");
      }

      const tokenContract = new this.web3.eth.Contract(
        ABIS.ERC20,
        tokenAddress
      );

      const tx = await tokenContract.methods
        .approve(spenderAddress, amount)
        .send({
          from: this.wallet.currentAccount,
          gas: "100000",
        });

      console.log("✅ Token approval successful:", tx.transactionHash);
      return tx.transactionHash;
    } catch (error) {
      console.error("❌ Error approving token:", error);
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