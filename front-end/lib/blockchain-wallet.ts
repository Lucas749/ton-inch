/**
 * 👛 Blockchain Wallet Service
 * Handles wallet connection, network switching, and account management
 */
// @ts-nocheck

import { Web3 } from "web3";

export class BlockchainWallet {
  private web3: Web3;
  private account: string | null = null;
  private isInitialized = false;
  private eventListenersSetup = false;
  private accountChangeHandler: ((accounts: string[]) => void) | null = null;
  private networkChangeHandler: ((chainId: string) => void) | null = null;

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
   * Refresh wallet connection state - useful for fixing race conditions
   */
  async refreshWalletConnection(): Promise<boolean> {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        // Try to get current accounts
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (accounts && accounts.length > 0) {
          const newAccount = accounts[0];
          
          // Update our state if account changed or wasn't set
          if (this.account !== newAccount) {
            console.log(`🔄 Wallet account updated: ${this.account} → ${newAccount}`);
            this.account = newAccount;
          }
          
          // Ensure web3 provider is set
          this.web3.setProvider(window.ethereum);
          this.isInitialized = true;
          
          console.log("✅ Wallet connection refreshed:", this.account);
          return true;
        } else {
          // No accounts found
          this.account = null;
          this.isInitialized = false;
          console.log("❌ No wallet accounts found during refresh");
          return false;
        }
      }
    } catch (error) {
      console.error("❌ Failed to refresh wallet connection:", error);
      this.account = null;
      this.isInitialized = false;
      return false;
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
      try {
        // Remove existing listener if any
        if (this.accountChangeHandler) {
          window.ethereum.removeListener("accountsChanged", this.accountChangeHandler);
        }

        // Create new handler
        this.accountChangeHandler = (accounts: string[]) => {
          try {
            if (accounts.length > 0) {
              this.account = accounts[0];
              callback(accounts[0]);
            } else {
              this.account = null;
              this.isInitialized = false;
              callback(null);
            }
          } catch (error) {
            console.warn("⚠️ Error handling account change:", error);
            // Gracefully handle the error and still call callback with null
            this.account = null;
            this.isInitialized = false;
            callback(null);
          }
        };

        // Add the listener
        window.ethereum.on("accountsChanged", this.accountChangeHandler);
        this.eventListenersSetup = true;
      } catch (error) {
        console.warn("⚠️ Could not set up account change listener:", error);
      }
    }
  }

  /**
   * Listen for network changes
   */
  onNetworkChanged(callback: (chainId: string) => void, onNetworkChange?: () => void): void {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        // Remove existing listener if any
        if (this.networkChangeHandler) {
          window.ethereum.removeListener("chainChanged", this.networkChangeHandler);
        }

        // Create new handler
        this.networkChangeHandler = (chainId: string) => {
          try {
            // Re-initialize web3 with new network
            this.web3 = new Web3(window.ethereum);
            onNetworkChange?.(); // Callback to reinitialize contracts
            callback(chainId);
          } catch (error) {
            console.warn("⚠️ Error handling network change:", error);
            // Still try to call the callback to maintain app state
            try {
              callback(chainId);
            } catch (callbackError) {
              console.warn("⚠️ Error calling network change callback:", callbackError);
            }
          }
        };

        // Add the listener
        window.ethereum.on("chainChanged", this.networkChangeHandler);
        this.eventListenersSetup = true;
      } catch (error) {
        console.warn("⚠️ Could not set up network change listener:", error);
      }
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
      const message = "Sign to authorize blockchain transaction";
      
      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [message, this.account]
      });

      // For demo purposes, we'll derive a "demo private key" from the signature
      // In reality, you should refactor the backend to work with signed transactions
      const web3 = this.web3;
      const hash = web3.utils.keccak256(signature);
      
      return hash;
    } catch (error) {
      console.error("❌ Error getting demo private key:", error);
      throw error;
    }
  }

  /**
   * Clean up event listeners
   */
  cleanup(): void {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        if (this.accountChangeHandler) {
          window.ethereum.removeListener("accountsChanged", this.accountChangeHandler);
          this.accountChangeHandler = null;
        }
        if (this.networkChangeHandler) {
          window.ethereum.removeListener("chainChanged", this.networkChangeHandler);
          this.networkChangeHandler = null;
        }
        this.eventListenersSetup = false;
        console.log("🧹 Wallet event listeners cleaned up");
      } catch (error) {
        console.warn("⚠️ Error cleaning up event listeners:", error);
      }
    }
  }

  /**
   * Check if wallet connection is stable
   */
  isConnectionStable(): boolean {
    if (typeof window === "undefined" || !window.ethereum) {
      return false;
    }

    try {
      // Check if ethereum provider is still available and responsive
      return !!window.ethereum && !!window.ethereum.isConnected && 
             (typeof window.ethereum.isConnected !== 'function' || window.ethereum.isConnected());
    } catch (error) {
      console.warn("⚠️ Connection stability check failed:", error);
      return false;
    }
  }

  /**
   * Safely check wallet connection with error handling
   */
  safeIsWalletConnected(): boolean {
    try {
      return this.isWalletConnected() && this.isConnectionStable();
    } catch (error) {
      console.warn("⚠️ Error checking wallet connection:", error);
      return false;
    }
  }

  /**
   * Sync wallet state with external wallet provider (like wagmi)
   * This allows the blockchain service to work with external wallet connections
   */
  syncExternalWallet(address: string | null): void {
    if (address) {
      this.account = address;
      this.isInitialized = true;
      
      // Set up Web3 provider if available
      if (typeof window !== "undefined" && window.ethereum) {
        this.web3.setProvider(window.ethereum);
      }
      
      console.log("✅ Synced external wallet:", address);
    } else {
      this.account = null;
      this.isInitialized = false;
      console.log("🔄 Wallet disconnected from external provider");
    }
  }

  // Getters for internal state
  get currentAccount(): string | null {
    return this.account;
  }

  get initialized(): boolean {
    return this.isInitialized;
  }

  get hasEventListeners(): boolean {
    return this.eventListenersSetup;
  }
}