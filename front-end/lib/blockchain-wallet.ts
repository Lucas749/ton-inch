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
   * Switch to Base Mainnet network
   */
  async switchToBaseMainnet(): Promise<boolean> {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        // Base Mainnet chain parameters
        const baseMainnetChain = {
          chainId: "0x2105", // 8453 in hex
          chainName: "Base",
          nativeCurrency: {
            name: "Ethereum",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: ["https://mainnet.base.org"],
          blockExplorerUrls: ["https://basescan.org"],
        };

        try {
          // Try to switch to the network
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: baseMainnetChain.chainId }],
          });
          
          // Re-initialize web3 with the new network
          this.web3 = new Web3(window.ethereum);
          console.log("✅ Successfully switched to Base Mainnet");
          return true;
        } catch (switchError: any) {
          // If the network doesn't exist, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [baseMainnetChain],
              });
              
              // Re-initialize web3 with the new network
              this.web3 = new Web3(window.ethereum);
              console.log("✅ Successfully added and switched to Base Mainnet");
              return true;
            } catch (addError) {
              console.error("❌ Failed to add Base Mainnet network:", addError);
              throw addError;
            }
          } else {
            console.error("❌ Failed to switch to Base Mainnet:", switchError);
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

  /**
   * Sign typed data (EIP-712) for 1inch orders
   */
  async signTypedDataV4(typedData: any): Promise<string> {
    try {
      if (!this.isWalletConnected() || !this.account) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      console.log("🔄 Signing typed data for 1inch order");

      // Use eth_signTypedData_v4 method
      const signature = await (window as any).ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [this.account, JSON.stringify(typedData)]
      });

      console.log(`✅ Typed data signed successfully`);
      return signature;
    } catch (error) {
      console.error("❌ Error signing typed data:", error);
      throw error;
    }
  }

  /**
   * Get private key from wallet for backend operations
   * WARNING: This is only for demo purposes - never do this in production!
   */
  async getPrivateKeyForDemo(): Promise<string> {
    try {
      if (!this.isWalletConnected() || !this.account) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      // In a real app, you would never do this!
      // This is only for demo purposes to work with the existing backend
      const message = "DEMO: Access private key for blockchain operations (NEVER do this in production!)";
      
      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [message, this.account]
      });

      // For demo purposes, we'll derive a "demo private key" from the signature
      // In reality, you should refactor the backend to work with signed transactions
      const web3 = this.web3;
      const hash = web3.utils.keccak256(signature);
      
      console.log("⚠️ DEMO ONLY: Generated demo private key from wallet signature");
      return hash;
    } catch (error) {
      console.error("❌ Error getting demo private key:", error);
      throw error;
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