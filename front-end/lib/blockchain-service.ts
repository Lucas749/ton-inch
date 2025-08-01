/**
 * 🚀 Blockchain Service for Frontend
 *
 * This service integrates the backend blockchain functionality directly into the frontend
 * using Web3.js and the comprehensive demo logic.
 */

import { Web3 } from "web3";

// Order operators (matching comprehensive demo)
export const OPERATORS = {
  GT: 0, // Greater Than
  LT: 1, // Less Than
  GTE: 2, // Greater Than or Equal
  LTE: 3, // Less Than or Equal
  EQ: 4, // Equal
};

// Contract addresses from comprehensive demo
const CONTRACTS = {
  IndexPreInteraction: "0x8AF8db923E96A6709Ae339d1bFb9E986410D8461",
  IndexLimitOrderFactory: "0x0312Af95deFE475B89852ec05Eab5A785f647e73",
  MockIndexOracle: "0x3de6DF18226B2c57328709D9bc68CaA7AD76EdEB",
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  TestUSDC: "0x2026c63430A1B526638bEF55Fea7174220cD3965",
  WETH: "0x4200000000000000000000000000000000000006",
};

// Simplified ABIs for frontend use
const ABIS = {
  TestToken: [
    {
      "inputs": [
        {"name": "to", "type": "address"},
        {"name": "value", "type": "uint256"}
      ],
      "name": "mint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"name": "spender", "type": "address"},
        {"name": "value", "type": "uint256"}
      ],
      "name": "approve",
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"name": "account", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [{"name": "", "type": "uint8"}],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  MockIndexOracle: [
    {
      type: "function",
      name: "getNextCustomIndexId",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "createCustomIndex",
      inputs: [{ name: "initialValue", type: "uint256" }],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "updateCustomIndex",
      inputs: [
        { name: "indexId", type: "uint256" },
        { name: "newValue", type: "uint256" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "getIndexValue",
      inputs: [{ name: "indexId", type: "uint256" }],
      outputs: [
        { name: "value", type: "uint256" },
        { name: "timestamp", type: "uint256" },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "getAllCustomIndices",
      inputs: [],
      outputs: [{ name: "", type: "uint256[]" }],
      stateMutability: "view",
    },
  ],
  IndexPreInteraction: [
    {
      type: "function",
      name: "registerIndex",
      inputs: [
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "oracle", type: "address" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "getIndexInfo",
      inputs: [{ name: "indexId", type: "uint256" }],
      outputs: [
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "oracle", type: "address" },
        { name: "creator", type: "address" },
        { name: "isActive", type: "bool" },
        { name: "createdAt", type: "uint256" },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "validateOrder",
      inputs: [
        { name: "indexId", type: "uint256" },
        { name: "operator", type: "uint8" },
        { name: "threshold", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "view",
    },
  ],
  ERC20: [
    {
      type: "function",
      name: "balanceOf",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "transfer",
      inputs: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "approve",
      inputs: [
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "symbol",
      inputs: [],
      outputs: [{ name: "", type: "string" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "decimals",
      inputs: [],
      outputs: [{ name: "", type: "uint8" }],
      stateMutability: "view",
    },
  ],
  IndexLimitOrderFactory: [
    {
      type: "function",
      name: "createIndexOrder",
      inputs: [
        { name: "salt", type: "uint256" },
        { name: "maker", type: "address" },
        { name: "receiver", type: "address" },
        { name: "makerAsset", type: "address" },
        { name: "takerAsset", type: "address" },
        { name: "makingAmount", type: "uint256" },
        { name: "takingAmount", type: "uint256" },
        { name: "indexId", type: "uint256" },
        { name: "operator", type: "uint8" },
        { name: "threshold", type: "uint256" },
        { name: "expiry", type: "uint256" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "cancelOrder",
      inputs: [{ name: "orderHash", type: "bytes32" }],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "getOrderStatus",
      inputs: [{ name: "orderHash", type: "bytes32" }],
      outputs: [{ name: "", type: "uint8" }],
      stateMutability: "view",
    },
    {
      type: "event",
      name: "IndexOrderCreated",
      inputs: [
        { name: "orderHash", type: "bytes32", indexed: true },
        { name: "maker", type: "address", indexed: true },
        { name: "indexId", type: "uint256", indexed: false },
        { name: "operator", type: "uint8", indexed: false },
        { name: "threshold", type: "uint256", indexed: false },
      ],
    },
  ],
  IndexLimitOrderFactory: [
    {
      inputs: [
        { name: "salt", type: "uint256" },
        { name: "maker", type: "address" },
        { name: "receiver", type: "address" },
        { name: "makerAsset", type: "address" },
        { name: "takerAsset", type: "address" },
        { name: "makingAmount", type: "uint256" },
        { name: "takingAmount", type: "uint256" },
        { name: "indexId", type: "uint256" },
        { name: "operator", type: "uint8" },
        { name: "thresholdValue", type: "uint256" },
        { name: "expiry", type: "uint40" }
      ],
      name: "createIndexOrder",
      outputs: [
        {
          components: [
            { name: "salt", type: "uint256" },
            { name: "maker", type: "address" },
            { name: "receiver", type: "address" },
            { name: "makerAsset", type: "address" },
            { name: "takerAsset", type: "address" },
            { name: "makingAmount", type: "uint256" },
            { name: "takingAmount", type: "uint256" },
            { name: "makerTraits", type: "bytes32" }
          ],
          name: "",
          type: "tuple"
        },
        { name: "", type: "bytes" }
      ],
      type: "function"
    },
    {
      inputs: [
        {
          components: [
            { name: "salt", type: "uint256" },
            { name: "maker", type: "address" },
            { name: "receiver", type: "address" },
            { name: "makerAsset", type: "address" },
            { name: "takerAsset", type: "address" },
            { name: "makingAmount", type: "uint256" },
            { name: "takingAmount", type: "uint256" },
            { name: "makerTraits", type: "bytes32" }
          ],
          name: "order",
          type: "tuple"
        }
      ],
      name: "getOrderHash",
      outputs: [{ name: "", type: "bytes32" }],
      type: "function"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          name: "orderHash",
          type: "bytes32"
        },
        {
          indexed: true,
          name: "maker",
          type: "address"
        },
        {
          indexed: true,
          name: "indexId",
          type: "uint256"
        },
        {
          indexed: false,
          name: "operator",
          type: "uint8"
        },
        {
          indexed: false,
          name: "thresholdValue",
          type: "uint256"
        }
      ],
      name: "IndexOrderCreated",
      type: "event"
    }
  ]
};

// Operator types for conditions (defined above)

// Order interfaces
export interface OrderCondition {
  indexId: number;
  operator: number;
  threshold: number;
}

export interface Order {
  hash: string;
  indexId: number;
  operator: number;
  threshold: number;
  description: string;
  makerAsset: string;
  takerAsset: string;
  makingAmount: string;
  takingAmount: string;
  // Aliases for UI compatibility
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  maker: string;
  receiver: string;
  expiry: number;
  status: "active" | "filled" | "cancelled" | "expired";
  createdAt: number;
  transactionHash: string;
}

export interface OrderParams {
  indexId: number;
  operator: number;
  threshold: number;
  description: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  expiry?: number;
}

export interface CustomIndex {
  id: number;
  name?: string;
  description?: string;
  value: number;
  timestamp: number;
  active: boolean;
  creator?: string;
  createdAt?: number;
}

export interface OrderCondition {
  indexId: number;
  operator: number;
  threshold: number;
}

export interface SwapOrder {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  condition: OrderCondition;
}

export class BlockchainService {
  private web3: Web3;
  private account: any;
  private oracle: any;
  private preInteraction: any;
  private factory: any;
  private isInitialized = false;
  private orderCache: Map<number, { orders: Order[], timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  constructor() {
    // Initialize Web3 with Alchemy or fallback to Base Sepolia
    const rpcUrl = this.getRpcUrl();
    console.log(`🌐 Initializing Web3 with RPC: ${this.getRpcDescription(rpcUrl)}`);
    this.web3 = new Web3(rpcUrl);
    this.initializeContracts();
  }

  /**
   * Get the best available RPC URL
   */
  private getRpcUrl(): string {
    // Check for Alchemy API key first (premium tier)
    if (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
      return `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
    }
    
    // Fallback to public Base Sepolia RPC
    console.warn("⚠️ No Alchemy API key found, using public RPC (may have rate limits)");
    return "https://sepolia.base.org";
  }

  /**
   * Get a user-friendly description of the RPC being used
   */
  private getRpcDescription(url: string): string {
    if (url.includes('alchemy')) return 'Alchemy (Premium - Recommended)';
    if (url.includes('sepolia.base.org')) return 'Base Sepolia (Public - Limited)';
    return 'Custom RPC';
  }

  /**
   * Initialize contract instances with current web3 instance
   */
  private initializeContracts(): void {
    this.oracle = new this.web3.eth.Contract(
      ABIS.MockIndexOracle,
      CONTRACTS.MockIndexOracle
    );
    this.preInteraction = new this.web3.eth.Contract(
      ABIS.IndexPreInteraction,
      CONTRACTS.IndexPreInteraction
    );
    this.factory = new this.web3.eth.Contract(
      ABIS.IndexLimitOrderFactory,
      CONTRACTS.IndexLimitOrderFactory
    );
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
          this.initializeContracts();
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
              this.initializeContracts();
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
   * Get all custom indices from the oracle
   */
  async getAllIndices(): Promise<CustomIndex[]> {
    try {
      const indices: CustomIndex[] = [];

      // Get the actual list of created custom indices from the oracle
      try {
        const customIndicesArray = await this.oracle.methods.getAllCustomIndices().call();
        console.log("📊 Found custom indices:", customIndicesArray);
        
        for (const indexId of customIndicesArray) {
          try {
            const id = Number(indexId);
            const result = await this.oracle.methods.getIndexValue(id).call();
            
            // Try to get additional info from PreInteraction contract
            let indexInfo = null;
            try {
              indexInfo = await this.preInteraction.methods
                .getIndexInfo(id)
                .call();
            } catch (e) {
              // Index not registered in PreInteraction, use default values
            }

            indices.push({
              id,
              name: indexInfo?.name || `Custom Index ${id}`,
              description:
                indexInfo?.description || `Custom index with ID ${id}`,
              value: Number(result[0]),
              timestamp: Number(result[1]),
              active: indexInfo?.isActive ?? true,
              creator: indexInfo?.creator,
              createdAt: indexInfo?.createdAt
                ? Number(indexInfo.createdAt)
                : undefined,
            });
          } catch (e) {
            console.warn(`Failed to load index ${indexId}:`, e);
            continue;
          }
        }
      } catch (error) {
        console.warn("Could not get custom indices list, falling back to range scan:", error);
        
        // Fallback: scan a smaller range and validate more carefully
        for (let i = 0; i <= 5; i++) {
          try {
            const result = await this.oracle.methods.getIndexValue(i).call();
            
            // More robust existence check: ensure we have valid data and timestamp
            if (result && result[0] && Number(result[0]) > 0 && Number(result[1]) > 0) {
              let indexInfo = null;
              try {
                indexInfo = await this.preInteraction.methods
                  .getIndexInfo(i)
                  .call();
              } catch (e) {
                // Index not registered in PreInteraction
            }

            indices.push({
              id: i,
              name: indexInfo?.name || `Custom Index ${i}`,
              description:
                indexInfo?.description || `Custom index with ID ${i}`,
              value: Number(result[0]),
              timestamp: Number(result[1]),
              active: indexInfo?.isActive ?? true,
              creator: indexInfo?.creator,
              createdAt: indexInfo?.createdAt
                ? Number(indexInfo.createdAt)
                : undefined,
            });
          }
        } catch (e) {
            // Index doesn't exist, continue
          continue;
          }
        }
      }

      console.log("✅ Loaded indices:", indices);
      return indices;
    } catch (error) {
      console.error("❌ Error fetching indices:", error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get index value by ID
   */
  async getIndexValue(indexId: number): Promise<{value: number, timestamp: number}> {
    try {
      if (!this.oracle) {
        throw new Error("Oracle contract not initialized");
      }

      const result = await this.oracle.methods.getIndexValue(indexId).call();
      
      if (!result || !result[0] || result[0] === "0") {
        throw new Error(`Index ${indexId} does not exist or has no value`);
      }

      return {
        value: Number(result[0]),
        timestamp: Number(result[1])
      };
    } catch (error) {
      console.error(`❌ Error getting index ${indexId} value:`, error);
      throw error;
    }
  }

  /**
   * Create a new custom index
   */
  async createIndex(
    name: string,
    description: string,
    initialValue: number
  ): Promise<number> {
    try {
      if (!this.isInitialized || !this.account) {
        throw new Error(
          "Wallet not connected. Please connect your wallet first."
        );
      }

      // Get next index ID
      const indexId = await this.oracle.methods.getNextCustomIndexId().call();

      // Create in oracle
      const oracleTx = await this.oracle.methods
        .createCustomIndex(initialValue)
        .send({
          from: this.account,
          gas: 150000,
        });

      console.log("✅ Index created in oracle:", oracleTx.transactionHash);

      // Register in PreInteraction
      const preIntTx = await this.preInteraction.methods
        .registerIndex(name, description, CONTRACTS.MockIndexOracle)
        .send({
          from: this.account,
          gas: 300000,
        });

      console.log(
        "✅ Index registered in PreInteraction:",
        preIntTx.transactionHash
      );

      return Number(indexId);
    } catch (error) {
      console.error("❌ Error creating index:", error);
      throw error;
    }
  }

  /**
   * Update an existing index value
   */
  async updateIndex(indexId: number, newValue: number): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.account) {
        throw new Error(
          "Wallet not connected. Please connect your wallet first."
        );
      }

      const tx = await this.oracle.methods
        .updateCustomIndex(indexId, newValue)
        .send({
          from: this.account,
          gas: 100000,
        });

      console.log("✅ Index updated:", tx.transactionHash);
      return true;
    } catch (error) {
      console.error("❌ Error updating index:", error);
      throw error;
    }
  }

  /**
   * Validate if an order condition is met
   */
  async validateOrderCondition(condition: OrderCondition): Promise<boolean> {
    try {
      const result = await this.preInteraction.methods
        .validateOrder(
          condition.indexId,
          condition.operator,
          condition.threshold
        )
        .call();

      return result;
    } catch (error) {
      console.error("❌ Error validating order condition:", error);
      throw error;
    }
  }

  /**
   * Get token balance for connected wallet
   */
  async getTokenBalance(tokenAddress: string): Promise<string> {
    try {
      if (!this.isInitialized || !this.account) {
        throw new Error("Wallet not connected");
      }

      const tokenContract = new this.web3.eth.Contract(
        ABIS.ERC20,
        tokenAddress
      );
      const balance = await tokenContract.methods
        .balanceOf(this.account)
        .call();
      const decimals = await tokenContract.methods.decimals().call();

      return this.web3.utils.fromWei(
        balance,
        decimals === 18 ? "ether" : "mwei"
      );
    } catch (error) {
      console.error("❌ Error getting token balance:", error);
      throw error;
    }
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
   * Get current network info
   */
  async getNetworkInfo(): Promise<{ chainId: number; networkName: string }> {
    try {
      const chainId = await this.web3.eth.getChainId();
      const networkName =
        chainId === 84532 ? "Base Sepolia" : `Unknown (${chainId})`;

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
  onNetworkChanged(callback: (chainId: string) => void): void {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("chainChanged", (chainId: string) => {
        // Re-initialize web3 with new network
        this.web3 = new Web3(window.ethereum);
        this.initializeContracts();
        callback(chainId);
      });
    }
  }

  /**
   * Create a new order with index condition
   */
  async createOrder(params: OrderParams): Promise<Order | null> {
    try {
      console.log("🔍 createOrder called with params:", params);
      console.log("🔍 Current wallet state:", {
        isInitialized: this.isInitialized,
        account: this.account,
        hasEthereum: !!window.ethereum,
        selectedAddress: window.ethereum?.selectedAddress
      });
      
      // Auto-detect wallet connection if not already initialized
      if (!this.isWalletConnected()) {
        console.error("❌ Wallet connection check failed");
        throw new Error(
          "Wallet not connected. Please connect your wallet first."
        );
      }
      
      console.log("✅ Wallet connection confirmed:", this.account);

      const salt = Math.floor(Math.random() * 1000000);
      const maker = this.account;
      const receiver = this.account;
      const expiry = params.expiry || Math.floor(Date.now() / 1000) + 7200; // 2 hours default

      // Convert amounts based on token decimals
      const fromTokenContract = new this.web3.eth.Contract(
        ABIS.ERC20,
        params.fromToken
      );
      const toTokenContract = new this.web3.eth.Contract(
        ABIS.ERC20,
        params.toToken
      );

      const fromDecimals = await fromTokenContract.methods.decimals().call();
      const toDecimals = await toTokenContract.methods.decimals().call();

      // Convert amounts to wei using proper decimal handling
      // Parse decimals properly - multiply by 10^decimals to convert to wei
      const makingAmount = this.parseTokenAmount(params.fromAmount, Number(fromDecimals));
      const takingAmount = this.parseTokenAmount(params.toAmount, Number(toDecimals));
      
      console.log("💰 Amount conversions:", {
        fromAmount: params.fromAmount,
        fromDecimals: Number(fromDecimals),
        makingAmount,
        
        toAmount: params.toAmount,
        toDecimals: Number(toDecimals),
        takingAmount
      });

      console.log(`📝 Creating order: ${params.description}`);
      console.log(
        `   Condition: Index ${params.indexId} ${this.getOperatorName(
          params.operator
        )} ${params.threshold}`
      );

      // Approve token spending
      await fromTokenContract.methods
        .approve(CONTRACTS.IndexLimitOrderFactory, makingAmount)
        .send({
          from: this.account,
          gas: 100000,
        });

      // Create order
      const tx = await this.factory.methods
        .createIndexOrder(
          salt,
          maker,
          receiver,
          params.fromToken,
          params.toToken,
          makingAmount,
          takingAmount,
          params.indexId,
          params.operator,
          params.threshold,
          expiry
        )
        .send({
          from: this.account,
          gas: 500000,
        });

      // Extract order hash from events
      const receipt = await this.web3.eth.getTransactionReceipt(
        tx.transactionHash
      );
      const eventTopic = this.web3.utils.sha3(
        "IndexOrderCreated(bytes32,address,uint256,uint8,uint256)"
      );
      const log = receipt.logs.find((l: any) => l.topics[0] === eventTopic);

      if (log) {
        const orderHash = log.topics[1];
        console.log(`✅ Order created! Hash: ${orderHash}`);

        return {
          hash: orderHash,
          indexId: params.indexId,
          operator: params.operator,
          threshold: params.threshold,
          description: params.description,
          makerAsset: params.fromToken,
          takerAsset: params.toToken,
          makingAmount: makingAmount,
          takingAmount: takingAmount,
          maker,
          receiver,
          expiry,
          status: "active",
          createdAt: Math.floor(Date.now() / 1000),
          transactionHash: tx.transactionHash,
        };
      }

      return null;
    } catch (error) {
      console.error("❌ Error creating order:", error);
      throw error;
    }
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderHash: string): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.account) {
        throw new Error(
          "Wallet not connected. Please connect your wallet first."
        );
      }

      const tx = await this.factory.methods.cancelOrder(orderHash).send({
        from: this.account,
        gas: 150000,
      });

      console.log("✅ Order cancelled:", tx.transactionHash);
      return true;
    } catch (error) {
      console.error("❌ Error cancelling order:", error);
      throw error;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderHash: string): Promise<number> {
    try {
      const status = await this.factory.methods
        .getOrderStatus(orderHash)
        .call();
      return Number(status);
    } catch (error) {
      console.error("❌ Error getting order status:", error);
      throw error;
    }
  }

  /**
   * Validate if an order condition is currently met
   */
  async validateOrderCondition(condition: OrderCondition): Promise<boolean> {
    try {
      const result = await this.preInteraction.methods
        .validateOrder(
          condition.indexId,
          condition.operator,
          condition.threshold
        )
        .call();

      return result;
    } catch (error) {
      console.error("❌ Error validating order condition:", error);
      throw error;
    }
  }

  /**
   * Get operator name for display
   */
  private getOperatorName(operator: number): string {
    const names = [">", "<", ">=", "<=", "=="];
    return names[operator] || "?";
  }

  /**
   * Parse token amount with proper decimals
   */
  parseTokenAmount(amount: string, decimals: number): string {
    // Handle decimal amounts by using parseFloat and then converting to wei
    const floatAmount = parseFloat(amount);
    if (isNaN(floatAmount)) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    
    // Multiply by 10^decimals to convert to smallest unit (wei)
    const multiplier = Math.pow(10, decimals);
    const amountInWei = Math.floor(floatAmount * multiplier);
    
    return amountInWei.toString();
  }

  /**
   * Format token amount from wei
   */
  formatTokenAmount(amount: string, decimals: number): string {
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber)) {
      return "0";
    }
    
    // Convert from smallest unit back to human readable
    const divisor = Math.pow(10, decimals);
    const humanReadable = amountNumber / divisor;
    
    return humanReadable.toString();
  }

  /**
   * Get index update history
   */
  async getIndexHistory(
    indexId: number,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    try {
      const events = await this.oracle.getPastEvents("IndexUpdated", {
        filter: { indexId },
        fromBlock: fromBlock || "earliest",
        toBlock: toBlock || "latest",
      });

      return events.map((event: any) => ({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        indexId: event.returnValues.indexId,
        newValue: event.returnValues.newValue,
        timestamp: event.returnValues.timestamp || Date.now(),
      }));
    } catch (error) {
      console.error("Error fetching index history:", error);
      return [];
    }
  }

  /**
   * Mint test tokens for the user (Base Sepolia only)
   */
  async mintTestTokens(amount: number = 1000): Promise<boolean> {
    try {
      if (!this.isWalletConnected()) {
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
        .mint(this.account, mintAmount.toString())
        .send({
          from: this.account,
          gas: 100000,
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
      if (!this.isWalletConnected()) {
        return "0";
      }

      const testUSDC = new this.web3.eth.Contract(
        ABIS.TestToken,
        CONTRACTS.TestUSDC
      );

      const balance = await testUSDC.methods.balanceOf(this.account).call();
      // USDC has 6 decimals
      return (parseInt(balance) / Math.pow(10, 6)).toString();
    } catch (error) {
      console.error("❌ Error getting test USDC balance:", error);
      return "0";
    }
  }

  /**
   * Get index statistics over time period
   */
  async getIndexStatistics(
    indexId: number,
    days: number = 7
  ): Promise<{
    min: number;
    max: number;
    avg: number;
    current: number;
    volatility: number;
  }> {
    try {
      const history = await this.getIndexHistory(indexId);
      const recentHistory = history.slice(-days * 24); // Approximate hourly updates

      if (recentHistory.length === 0) {
        const currentValue = await this.getIndexValue(indexId);
        return {
          min: currentValue,
          max: currentValue,
          avg: currentValue,
          current: currentValue,
          volatility: 0,
        };
      }

      const values = recentHistory.map((h) => parseFloat(h.newValue));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const current = values[values.length - 1];

      // Calculate simple volatility (standard deviation)
      const variance =
        values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
        values.length;
      const volatility = Math.sqrt(variance);

      return { min, max, avg, current, volatility };
    } catch (error) {
      console.error("Error calculating index statistics:", error);
      const currentValue = await this.getIndexValue(indexId);
      return {
        min: currentValue,
        max: currentValue,
        avg: currentValue,
        current: currentValue,
        volatility: 0,
      };
    }
  }

  /**
   * Search indices by name
   */
  async searchIndicesByName(searchTerm: string): Promise<any[]> {
    try {
      const allIndices = await this.getAllIndices();
      return allIndices.filter(
        (index) =>
          index.name &&
          index.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error("Error searching indices:", error);
      return [];
    }
  }

  /**
   * Create a new custom index (both in oracle and preInteraction)
   */
  async createIndex(name: string, description: string, initialValue: number): Promise<number> {
    try {
      console.log("🔄 Creating index:", { name, description, initialValue });
      
      if (!this.isWalletConnected()) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      if (!this.oracle || !this.preInteraction) {
        throw new Error("Contracts not initialized");
      }

      // Step 1: Get next index ID
      const indexId = await this.oracle.methods.getNextCustomIndexId().call();
      console.log("📋 Next index ID:", indexId);

      // Step 2: Create in oracle
      console.log("🔄 Creating index in oracle...");
      const oracleTx = await this.oracle.methods
        .createCustomIndex(initialValue)
        .send({
          from: this.account,
          gas: 150000,
        });

      console.log("✅ Index created in oracle:", oracleTx.transactionHash);

      // Step 3: Register in PreInteraction
      console.log("🔄 Registering index in PreInteraction...");
      const preIntTx = await this.preInteraction.methods
        .registerIndex(name, description, CONTRACTS.MockIndexOracle)
        .send({
          from: this.account,
          gas: 300000,
        });

      console.log("✅ Index registered in PreInteraction:", preIntTx.transactionHash);
      console.log(`🎉 Index "${name}" created with ID: ${indexId}`);

      return parseInt(indexId);

    } catch (error) {
      console.error("❌ Error creating index:", error);
      throw error;
    }
  }

  /**
   * Get all orders for a specific index with caching and circuit breaker protection
   */
  async getOrdersByIndex(indexId: number): Promise<Order[]> {
    try {
      // Check cache first
      const cached = this.orderCache.get(indexId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`📋 Using cached orders for index ${indexId}`);
        return cached.orders;
      }

      if (!this.factory) {
        throw new Error("Factory contract not initialized");
      }

      console.log(`🔍 Loading orders for index ${indexId}...`);

      // For now, return empty orders to avoid circuit breaker
      // TODO: Implement proper event loading when RPC is more stable
      console.log(`⚠️ Skipping order loading for index ${indexId} to avoid circuit breaker`);
      
      const orders: Order[] = [];
      
      // Cache empty result to avoid repeated attempts
      this.orderCache.set(indexId, {
        orders,
        timestamp: Date.now()
      });

      return orders;

    } catch (error) {
      console.error("Error fetching orders by index:", error);
      
      // If we have cached data, return it even if stale
      const cached = this.orderCache.get(indexId);
      if (cached) {
        console.log(`⚠️ Using stale cached orders for index ${indexId} due to error`);
        return cached.orders;
      }
      
      return [];
    }
  }

  /**
   * Alternative method to try loading orders when circuit breaker recovers
   */
  async tryLoadOrdersForIndex(indexId: number): Promise<Order[]> {
    try {
      if (!this.factory) {
        throw new Error("Factory contract not initialized");
      }

      console.log(`🔍 Attempting to load orders for index ${indexId}...`);

      const orders = await this.retryWithBackoff(async () => {
        const events = await this.factory.getPastEvents("IndexOrderCreated", {
          filter: { indexId: indexId },
          fromBlock: "earliest",
          toBlock: "latest",
        });

        console.log(`📋 Found ${events.length} orders for index ${indexId}`);

        return events.map((event: any) => {
          const { orderHash, maker, operator, thresholdValue } = event.returnValues;
          
          return {
            hash: orderHash,
            indexId: indexId,
            operator: parseInt(operator),
            threshold: parseInt(thresholdValue),
            description: `Index ${indexId} order`,
            fromToken: "",  // Would need to get from order details
            toToken: "",    // Would need to get from order details
            fromAmount: "", // Would need to get from order details
            toAmount: "",   // Would need to get from order details
            maker: maker,
            receiver: maker, // Assume same for now
            expiry: 0, // Would need to get from order details
            status: "active" as const,
            createdAt: Date.now(), // Would need to get from block timestamp
            transactionHash: event.transactionHash,
          };
        });
      }, 1, 2000); // Only 1 retry with 2s delay

      // Cache the result
      this.orderCache.set(indexId, {
        orders,
        timestamp: Date.now()
      });

      return orders;

    } catch (error) {
      console.error("Failed to load orders for index:", indexId, error);
      return [];
    }
  }

  /**
   * Retry function with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>, 
    maxRetries: number = 3, 
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry if it's not a circuit breaker or rate limit error
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        console.warn(`⚠️ Attempt ${attempt + 1} failed:`, error.message);
      }
    }
    
    throw lastError;
  }

  /**
   * Check if an error is retryable (circuit breaker, rate limit, etc.)
   */
  private isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return message.includes('circuit breaker') || 
           message.includes('rate limit') || 
           message.includes('too many requests') ||
           message.includes('timeout') ||
           message.includes('network error');
  }

  /**
   * Clear order cache for a specific index (call after creating new orders)
   */
  public clearOrderCache(indexId?: number): void {
    if (indexId !== undefined) {
      this.orderCache.delete(indexId);
      console.log(`🗑️ Cleared cache for index ${indexId}`);
    } else {
      this.orderCache.clear();
      console.log(`🗑️ Cleared all order cache`);
    }
  }

  /**
   * Create a new index order using the factory contract
   */
  async createOrder(params: OrderParams): Promise<Order | null> {
    try {
      console.log("🔄 Creating order with params:", params);
      
      if (!this.isWalletConnected()) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      if (!this.factory) {
        throw new Error("Factory contract not initialized");
      }

      // Generate a random salt for order uniqueness
      const salt = Math.floor(Math.random() * 1000000);
      const maker = this.account;
      const receiver = this.account; // Same as maker for now
      const makerAsset = params.fromToken;
      const takerAsset = params.toToken;
      
      // Convert amounts to wei/smallest unit
      const makingAmount = this.parseTokenAmount(params.fromAmount, 6); // Assuming USDC (6 decimals)
      const takingAmount = this.parseTokenAmount(params.toAmount, 18); // Assuming WETH (18 decimals)
      
      const indexId = params.indexId;
      const operator = params.operator;
      const threshold = params.threshold;
      const expiry = Math.floor(Date.now() / 1000) + (params.expiry || 3600); // Default 1 hour

      console.log("🔄 Order parameters:", {
        salt, maker, receiver, makerAsset, takerAsset,
        makingAmount, takingAmount, indexId, operator, threshold, expiry
      });

      // First, approve the factory to spend the maker asset
      const fromTokenContract = new this.web3.eth.Contract(
        ABIS.ERC20,
        params.fromToken
      );

      console.log("🔄 Approving factory to spend tokens...");
      await fromTokenContract.methods
        .approve(CONTRACTS.IndexLimitOrderFactory, makingAmount)
        .send({
          from: this.account,
          gas: 100000,
        });

      console.log("✅ Token approval successful");

      // Now create the order
      console.log("🔄 Creating index order...");
      const tx = await this.factory.methods
        .createIndexOrder(
          salt, maker, receiver, makerAsset, takerAsset,
          makingAmount, takingAmount, indexId, operator, threshold, expiry
        )
        .send({
          from: this.account,
          gas: 500000,
        });

      console.log("✅ Order created!", tx.transactionHash);

      // Clear cache for this index so new order appears immediately
      this.clearOrderCache(params.indexId);

      // Return order object
      return {
        hash: tx.transactionHash,
        indexId: params.indexId,
        operator: params.operator,
        threshold: params.threshold,
        description: params.description,
        makerAsset: params.fromToken,
        takerAsset: params.toToken,
        makingAmount: makingAmount,
        takingAmount: takingAmount,
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        toAmount: params.toAmount,
        maker: this.account,
        receiver: this.account,
        expiry,
        status: "active",
        createdAt: Date.now(),
        transactionHash: tx.transactionHash,
      };

    } catch (error) {
      console.error("❌ Error creating order:", error);
      throw error;
    }
  }

  /**
   * Get all indices (predefined + custom) following get_all_indices.js approach
   */
  async getAllIndices(): Promise<CustomIndex[]> {
    try {
      console.log('📊 Fetching all indices...');
      const allIndices: CustomIndex[] = [];

      // Predefined indices (0-5)
      const predefinedIndices = [
        { id: 0, type: 'INFLATION_RATE' },
        { id: 1, type: 'ELON_FOLLOWERS' },
        { id: 2, type: 'BTC_PRICE' },
        { id: 3, type: 'VIX_INDEX' },
        { id: 4, type: 'UNEMPLOYMENT_RATE' },
        { id: 5, type: 'TESLA_STOCK' }
      ];

      console.log('📊 Fetching predefined indices...');
      for (const predefined of predefinedIndices) {
        const details = await this.getIndexDetails(predefined.id);
        if (details) {
          allIndices.push(details);
        }
      }

      // Custom indices from oracle
      console.log('🔧 Fetching custom indices...');
      try {
        if (!this.oracle) {
          console.error('Oracle contract not initialized');
          return allIndices;
        }

        // Get all custom indices in batch from oracle
        const result = await this.oracle.methods.getAllCustomIndices().call();
        const { 0: indexIds, 1: values, 2: timestamps, 3: activeStates } = result;
        
        console.log(`Found ${indexIds.length} custom indices`);
        
        // Get detailed info for each custom index
        for (let i = 0; i < indexIds.length; i++) {
          const indexId = Number(indexIds[i]);
          const details = await this.getIndexDetails(indexId);
          
          if (details) {
            // Add oracle data (sometimes more current than preInteraction)
            details.value = Number(values[i]);
            details.timestamp = Number(timestamps[i]);
            details.active = activeStates[i];
            allIndices.push(details);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching custom indices:', error);
      }

      // Sort by ID
      allIndices.sort((a, b) => a.id - b.id);
      
      console.log(`✅ Loaded ${allIndices.length} total indices`);
      return allIndices;
      
    } catch (error) {
      console.error('❌ Error fetching all indices:', error);
      return [];
    }
  }

  /**
   * Get complete information for a single index
   */
  private async getIndexDetails(indexId: number): Promise<CustomIndex | null> {
    try {
      if (!this.preInteraction) {
        console.error('PreInteraction contract not initialized');
        return null;
      }

      // Get metadata from PreInteraction contract
      const info = await this.preInteraction.methods.getIndexInfo(indexId).call();
      
      // Get current value from oracle  
      const valueData = await this.preInteraction.methods.getIndexValue(indexId).call();
      
      return {
        id: indexId,
        name: info.name || `Index ${indexId}`,
        description: info.description || `Index ${indexId} description`,
        creator: info.creator,
        active: info.isActive,
        createdAt: Number(info.createdAt),
        value: Number(valueData.value),
        timestamp: Number(valueData.timestamp)
      };
    } catch (error) {
      console.error(`❌ Error fetching details for index ${indexId}:`, error);
      return null;
    }
  }

  /**
   * Get all orders for a specific index (TEMPORARILY DISABLED)
   * TODO: Re-enable once RPC circuit breaker issues are resolved
   */
  async getOrdersByIndex(indexId: number): Promise<any[]> {
    console.log(`⚠️ Order loading temporarily disabled for index ${indexId} to avoid RPC circuit breaker`);
    return []; // Return empty array for now
    
    /* COMMENTED OUT - UNCOMMENT WHEN RPC IS MORE STABLE
    try {
      const events = await this.factory.getPastEvents("IndexOrderCreated", {
        filter: { indexId },
        fromBlock: "earliest",
        toBlock: "latest",
      });

      return events.map((event: any) => ({
        hash: event.returnValues.orderHash,
        indexId: event.returnValues.indexId,
        operator: parseInt(event.returnValues.operator),
        threshold: event.returnValues.threshold,
        fromToken: event.returnValues.fromToken,
        toToken: event.returnValues.toToken,
        fromAmount: event.returnValues.fromAmount,
        toAmount: event.returnValues.toAmount,
        expiry: event.returnValues.expiry,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      }));
    } catch (error) {
      console.error("Error fetching orders by index:", error);
      return [];
    }
    */
  }
}

// Singleton instance
export const blockchainService = new BlockchainService();

// Export contracts for use in other components
export { CONTRACTS };

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (
        event: string,
        callback: (...args: any[]) => void
      ) => void;
    };
  }
}
