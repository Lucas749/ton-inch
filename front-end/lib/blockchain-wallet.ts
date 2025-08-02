/**
 * 👛 Blockchain Wallet Service
 * Handles wallet connection, network switching, and account management
 */

import { Web3 } from "web3";

export class BlockchainWallet {
  private web3: Web3;
  private account: string | null = null;
  private isInitialized = false;

  constructor(web3Instance: Web3) {
    this.web3 = web3Instance;
  }

  /**
   * Connect user's wallet (MetaMask, etc.)
   */
  async connectWallet(): Promise<string | null> {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        // Request account access
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        if (accounts.length > 0) {
          this.account = accounts[0];
          this.web3.setProvider(window.ethereum);
          this.isInitialized = true;

          console.log("✅ Wallet connected:", this.account);
          return this.account;
        }
      } else {
        throw new Error("No Web3 wallet found. Please install MetaMask.");
      }
    } catch (error) {
      console.error("❌ Failed to connect wallet:", error);
      throw error;
    }
    return null;
  }

  /**
   * Switch to Base Sepolia network
   */
  async switchToBaseSepoliaNetwork(): Promise<boolean> {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        // Base Sepolia chain parameters
        const baseSepoliaChain = {
          chainId: "0x14a34", // 84532 in hex
          chainName: "Base Sepolia",
          nativeCurrency: {
            name: "Ethereum",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: ["https://sepolia.base.org"],
          blockExplorerUrls: ["https://sepolia-explorer.base.org"],
        };

        try {
          // Try to switch to the network
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: baseSepoliaChain.chainId }],
          });
          
          // Re-initialize web3 with the new network
          this.web3 = new Web3(window.ethereum);
          console.log("✅ Successfully switched to Base Sepolia");
          return true;
        } catch (switchError: any) {
          // If the network doesn't exist, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [baseSepoliaChain],
              });
              
              // Re-initialize web3 with the new network
              this.web3 = new Web3(window.ethereum);
              console.log("✅ Successfully added and switched to Base Sepolia");
              return true;
            } catch (addError) {
              console.error("❌ Failed to add Base Sepolia network:", addError);
              throw addError;
            }
          } else {
            console.error("❌ Failed to switch to Base Sepolia:", switchError);
            throw switchError;
          }
        }
      } else {
        throw new Error("No Web3 wallet found");
      }
    } catch (error) {
      console.error("❌ Network switch failed:", error);
      throw error;
    }
  }

  /**
   * Get current network info
   */
  async getNetworkInfo(): Promise<{ chainId: number; networkName: string }> {
    try {
      const chainId = await this.web3.eth.getChainId();
      const networkName =
        Number(chainId) === 84532 ? "Base Sepolia" : `Unknown (${chainId})`;

      return { chainId: Number(chainId), networkName };
    } catch (error) {
      console.error("❌ Error getting network info:", error);
      throw error;
    }
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    // First check our internal state
    if (this.isInitialized && !!this.account) {
      return true;
    }
    
    // If not initialized but wallet exists, try to detect connection
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        // Check if we can get current accounts synchronously
        const provider = window.ethereum;
        if (provider.selectedAddress) {
          // Auto-initialize if we detect a connected wallet
          this.account = provider.selectedAddress;
          this.web3.setProvider(window.ethereum);
          this.isInitialized = true;
          console.log("🔄 Auto-detected wallet connection:", this.account);
          return true;
        }
      } catch (error) {
        console.warn("⚠️ Could not detect wallet connection:", error);
      }
    }
    
    return false;
  }

  /**
   * Get connected wallet address
   */
  getWalletAddress(): string | null {
    // First check our internal state
    if (this.account) {
      return this.account;
    }
    
    // If not set but wallet exists, try to detect address
    if (typeof window !== "undefined" && window.ethereum && window.ethereum.selectedAddress) {
      this.account = window.ethereum.selectedAddress;
      return this.account;
    }
    
    return null;
  }

  /**
   * Get ETH balance for connected wallet
   */
  async getETHBalance(): Promise<string> {
    try {
      if (!this.isInitialized || !this.account) {
        throw new Error("Wallet not connected");
      }

      const balance = await this.web3.eth.getBalance(this.account);
      return this.web3.utils.fromWei(balance, "ether");
    } catch (error) {
      console.error("❌ Error getting ETH balance:", error);
      throw error;
    }
  }

  /**
   * Listen for account changes
   */
  onAccountChanged(callback: (account: string | null) => void): void {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          this.account = accounts[0];
          callback(accounts[0]);
        } else {
          this.account = null;
          this.isInitialized = false;
          callback(null);
        }
      });
    }
  }

  /**
   * Listen for network changes
   */
  onNetworkChanged(callback: (chainId: string) => void, onNetworkChange?: () => void): void {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("chainChanged", (chainId: string) => {
        // Re-initialize web3 with new network
        this.web3 = new Web3(window.ethereum);
        onNetworkChange?.(); // Callback to reinitialize contracts
        callback(chainId);
      });
    }
  }

  // Getters for internal state
  get currentAccount(): string | null {
    return this.account;
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
}