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

      // Properly handle the balance as string
      const balanceStr = String(balance);
      return this.web3.utils.fromWei(
        balanceStr,
        Number(decimals) === 18 ? "ether" : "mwei"
      );
    } catch (error) {
      console.error("❌ Error getting token balance:", error);
      throw error;
    }
  }

  /**
   * Mint test tokens for the user (Base Sepolia only)
   */
  async mintTestTokens(amount: number = 1000): Promise<boolean> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected");
      }

      const testUSDC = new this.web3.eth.Contract(
        ABIS.TestToken,
        CONTRACTS.TestUSDC
      );

      // Convert amount to proper decimals (USDC has 6 decimals)
      const mintAmount = amount * Math.pow(10, 6);

      console.log(`🪙 Minting ${amount} Test USDC...`);
      
      const tx = await testUSDC.methods
        .mint(this.wallet.currentAccount, mintAmount.toString())
        .send({
          from: this.wallet.currentAccount,
          gas: "100000",
        });

      console.log("✅ Test tokens minted!", tx.transactionHash);
      return true;
    } catch (error) {
      console.error("❌ Error minting test tokens:", error);
      throw error;
    }
  }

  /**
   * Get test USDC balance
   */
  async getTestUSDCBalance(): Promise<string> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        return "0";
      }

      const testUSDC = new this.web3.eth.Contract(
        ABIS.TestToken,
        CONTRACTS.TestUSDC
      );

      const balance = await testUSDC.methods.balanceOf(this.wallet.currentAccount).call();
      // USDC has 6 decimals - properly handle the balance as string
      const balanceStr = String(balance);
      return (parseInt(balanceStr) / Math.pow(10, 6)).toString();
    } catch (error) {
      console.error("❌ Error getting test USDC balance:", error);
      return "0";
    }
  }

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