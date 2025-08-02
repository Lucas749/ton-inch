/**
 * 🔧 Blockchain Constants
 * Contract addresses, ABIs, and operator definitions
 */

// Order operators (matching new backend system)
export const OPERATORS = {
  GT: 1, // Greater Than
  LT: 2, // Less Than  
  GTE: 3, // Greater Than or Equal
  LTE: 4, // Less Than or Equal
  EQ: 5, // Equal
  NEQ: 6, // Not Equal
};

// Index mappings (matching new backend system and Alpha Vantage integration)
export const INDICES = {
  APPLE_STOCK: {
    id: 0,
    name: 'Apple Stock',
    symbol: 'AAPL',
    description: 'Apple Inc. stock price',
    unit: 'USD (basis points)',
    alphaVantageSymbol: 'AAPL',
    category: 'Stocks',
  },
  TESLA_STOCK: {
    id: 1,
    name: 'Tesla Stock', 
    symbol: 'TSLA',
    description: 'Tesla Inc. stock price',
    unit: 'USD (basis points)',
    alphaVantageSymbol: 'TSLA',
    category: 'Stocks',
  },
  VIX_INDEX: {
    id: 2,
    name: 'VIX Volatility Index',
    symbol: 'VIX', 
    description: 'CBOE Volatility Index',
    unit: 'Index points (basis points)',
    alphaVantageSymbol: 'VIX',
    category: 'Indices',
  },
  BTC_PRICE: {
    id: 3,
    name: 'Bitcoin Price',
    symbol: 'BTC',
    description: 'Bitcoin price in USD', 
    unit: 'USD (basis points)',
    alphaVantageSymbol: 'BTC',
    category: 'Crypto',
  },
};

// Contract addresses - Base Mainnet (New Architecture)
// Oracle Types (matching backend oracle-manager.js)
export const ORACLE_TYPES = {
  MOCK: 0,
  CHAINLINK: 1
};

export const ORACLE_TYPE_NAMES = {
  0: 'Mock Oracle',
  1: 'Chainlink Functions'
};

export const CONTRACTS = {
  // ONLY contract we need - Hybrid Oracle for index data
  IndexOracle: "0x8a585F9B2359Ef093E8a2f5432F387960e953BD2", // Hybrid Oracle (Base Mainnet)
  
  // Base Mainnet token addresses
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet USDC
  WETH: "0x4200000000000000000000000000000000000006", // Base Mainnet WETH
  DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // Base Mainnet DAI
  
  // 1inch Protocol v4 on Base Mainnet (used directly via SDK)
  OneInchProtocol: "0x111111125421cA6dc452d289314280a0f8842A65", // 1inch v4 router
};

// Simplified ABIs for frontend use
export const ABIS = {
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
  // New Hybrid Oracle ABI (supports both mock and Chainlink data)
  IndexOracle: [
    {
      type: "function",
      name: "getIndexValue",
      inputs: [{ name: "indexType", type: "uint8" }],
      outputs: [
        { name: "value", type: "uint256" },
        { name: "timestamp", type: "uint256" },
      ],
      stateMutability: "view",
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
      name: "isValidIndex",
      inputs: [{ name: "indexType", type: "uint8" }],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "getNextCustomIndexId", 
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "getAllCustomIndices",
      inputs: [],
      outputs: [
        { name: "indexIds", type: "uint256[]" },
        { name: "values", type: "uint256[]" },
        { name: "timestamps", type: "uint256[]" },
        { name: "activeStates", type: "bool[]" },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "createCustomIndex",
      inputs: [
        { name: "initialValue", type: "uint256" },
        { name: "sourceUrl", type: "string" },
        { name: "oracleType", type: "uint8" },
        { name: "chainlinkOracleAddress", type: "address" },
      ],
      outputs: [{ name: "indexId", type: "uint256" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "updateIndex",
      inputs: [
        { name: "indexType", type: "uint8" },
        { name: "newValue", type: "uint256" },
      ],
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
      name: "setIndexActive",
      inputs: [
        { name: "indexType", type: "uint8" },
        { name: "isActive", type: "bool" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function", 
      name: "getHybridOracleStatus",
      inputs: [],
      outputs: [
        { name: "chainlinkAddress", type: "address" },
        { name: "isChainlinkConfigured", type: "bool" },
        { name: "mockIndicesCount", type: "uint256" },
        { name: "chainlinkIndicesCount", type: "uint256" },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "owner",
      inputs: [],
      outputs: [{ name: "", type: "address" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "createCustomIndex",
      inputs: [
        { name: "initialValue", type: "uint256" },
        { name: "sourceUrl", type: "string" },
        { name: "oracleType", type: "uint8" },
        { name: "chainlinkOracleAddress", type: "address" }
      ],
      outputs: [{ name: "indexId", type: "uint256" }],
      stateMutability: "nonpayable",
    },
  ],
  // Removed IndexPreInteraction - not needed in new architecture
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
  // Removed IndexLimitOrderFactory - using 1inch SDK directly
  // 1inch Protocol v4 Functions for order management
  OneInchProtocol: [
    {
      inputs: [
        { name: "orderHash", type: "bytes32" }
      ],
      name: "cancelOrder",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        { name: "orderHash", type: "bytes32" }
      ],
      name: "remaining",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    }
  ]
};