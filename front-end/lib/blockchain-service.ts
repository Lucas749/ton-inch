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

  constructor() {
    // Initialize Web3 with Base Sepolia
    this.web3 = new Web3("https://sepolia.base.org");

    // Initialize contracts
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

      // Query custom indices (starting from a reasonable range)
      for (let i = 6; i <= 30; i++) {
        try {
          const result = await this.oracle.methods.getIndexValue(i).call();
          if (result && result[0] && result[0] !== "0") {
            // Try to get additional info from PreInteraction contract
            let indexInfo = null;
            try {
              indexInfo = await this.preInteraction.methods
                .getIndexInfo(i)
                .call();
            } catch (e) {
              // Index not registered in PreInteraction, use default values
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
          // Index doesn't exist or error querying, continue
          continue;
        }
      }

      return indices;
    } catch (error) {
      console.error("❌ Error fetching indices:", error);
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
    return this.isInitialized && !!this.account;
  }

  /**
   * Get connected wallet address
   */
  getWalletAddress(): string | null {
    return this.account || null;
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
      window.ethereum.on("chainChanged", callback);
    }
  }

  /**
   * Create a new order with index condition
   */
  async createOrder(params: OrderParams): Promise<Order | null> {
    try {
      if (!this.isInitialized || !this.account) {
        throw new Error(
          "Wallet not connected. Please connect your wallet first."
        );
      }

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

      const makingAmount = this.web3.utils
        .toBN(params.fromAmount)
        .mul(this.web3.utils.toBN(10).pow(this.web3.utils.toBN(fromDecimals)));
      const takingAmount = this.web3.utils
        .toBN(params.toAmount)
        .mul(this.web3.utils.toBN(10).pow(this.web3.utils.toBN(toDecimals)));

      console.log(`📝 Creating order: ${params.description}`);
      console.log(
        `   Condition: Index ${params.indexId} ${this.getOperatorName(
          params.operator
        )} ${params.threshold}`
      );

      // Approve token spending
      await fromTokenContract.methods
        .approve(CONTRACTS.IndexLimitOrderFactory, makingAmount.toString())
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
          makingAmount.toString(),
          takingAmount.toString(),
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
          makingAmount: makingAmount.toString(),
          takingAmount: takingAmount.toString(),
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
    return this.web3.utils
      .toBN(amount)
      .mul(this.web3.utils.toBN(10).pow(this.web3.utils.toBN(decimals)))
      .toString();
  }

  /**
   * Format token amount from wei
   */
  formatTokenAmount(amount: string, decimals: number): string {
    return this.web3.utils.fromWei(
      this.web3.utils
        .toBN(amount)
        .div(
          this.web3.utils
            .toBN(10)
            .pow(this.web3.utils.toBN(Math.max(0, 18 - decimals)))
        )
        .toString(),
      "ether"
    );
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
   * Get all orders for a specific index
   */
  async getOrdersByIndex(indexId: number): Promise<any[]> {
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
  }
}

// Singleton instance
export const blockchainService = new BlockchainService();

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
